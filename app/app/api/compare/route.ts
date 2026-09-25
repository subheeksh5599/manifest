import { NextResponse } from "next/server";
import replica from "@/data/replica-devnet.json";
import { readFeeConfigExact, selectFeeSchedule } from "@/lib/exit-terms.mjs";
import { readPoolAccount, POOL_PROGRAM } from "@/lib/pool-account.mjs";
import { compareIssuers } from "@/lib/compare-engine.mjs";
import { devnetRpc as rpc, devnetEpoch } from "@/lib/devnet-rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * The same company at both issuers, priced at the caller's size.
 *
 * Every number this route returns is read from devnet on the request: each
 * issuer's mint bytes for the fee schedule actually in force, each pool's bytes
 * for the price and the depth. No price, schedule or balance is cached or
 * remembered between requests, so a schedule that changes at an epoch changes
 * here too. The only value kept for a moment is the epoch itself, which moves on
 * a two-day clock and is what picks the schedule in force.
 *
 * Where this cannot price an issuer it says so by name - "exit_terms_unreadable",
 * "pool_state_unreadable" - rather than filling the space with a plausible
 * figure. A wrong price is worse than a refusal.
 */

const DEFAULT_SIZE = "100000000";

async function accountBytes(address: string): Promise<{ bytes: Uint8Array; owner: string } | null> {
  const v = await rpc("getAccountInfo", [address, { encoding: "base64", commitment: "confirmed" }]);
  if (!v?.value?.data?.[0]) return null;
  return { bytes: new Uint8Array(Buffer.from(v.value.data[0], "base64")), owner: v.value.owner };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = url.searchParams.get("size") ?? DEFAULT_SIZE;
  if (!/^\d+$/.test(sizeParam) || sizeParam === "0") {
    return NextResponse.json({ error: "size must be a positive whole number of base units" }, { status: 400 });
  }
  const size = BigInt(sizeParam);

  try {
    const epoch = await devnetEpoch();

    const issuers: any[] = [];
    const rail: Record<string, any> = {};

    for (const key of ["issuer_a", "issuer_b"] as const) {
      const row: any = (replica as any)[key];
      const label = key === "issuer_a" ? "A" : "B";

      let schedule: any = null;
      let pending: any = null;
      let termsReason = "no_fee_config";
      try {
        const mint = await accountBytes(row.mint);
        const raw = mint ? readFeeConfigExact(mint.bytes) : null;
        // the runtime does not read the mint's own number: it resolves which of
        // the two schedules is in force at this epoch, which is a different read
        const sel = raw ? selectFeeSchedule(raw.older, raw.newer, epoch) : null;
        if (sel?.effective) {
          schedule = sel.effective;
          pending = sel.pending;
          termsReason = sel.reason;
        }
      } catch (e: any) {
        termsReason = `mint_read_failed: ${e.message}`;
      }

      let poolState: any = null;
      let poolOwnerOk = false;
      try {
        const pool = await accountBytes(row.pool.address);
        if (pool) {
          poolOwnerOk = pool.owner === POOL_PROGRAM;
          poolState = readPoolAccount(Buffer.from(pool.bytes).toString("base64"), POOL_PROGRAM, pool.owner);
        }
      } catch {
        poolState = null;
      }

      if (poolState) rail[label] = poolState;
      issuers.push({
        label,
        mint: row.mint,
        pool: row.pool.address,
        fullTerms: true,
        poolOwnerOk,
        termsReason,
        poolState,
        schedule,
        pending,
        epoch,
      });
    }

    const out = compareIssuers({ size, issuers, rail });

    return NextResponse.json({
      ...out,
      read: {
        network: "devnet",
        epoch,
        size_param: sizeParam,
        issuers_read: issuers.map((i) => ({
          label: i.label,
          mint: i.mint,
          pool: i.pool,
          pool_owner_is_the_pool_program: i.poolOwnerOk,
          terms_reason: i.termsReason,
        })),
      },
      note:
        "Both numbers are the same company's token at the caller's size, after the mint fee actually in force and the pool's own fee. The rail is the route across the two issuers, quoted the same way the exits are.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
