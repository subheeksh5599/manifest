import { NextResponse } from "next/server";
import { rpc } from "@/lib/rpc";
import { readExitTermsCached, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "@/lib/exit-terms.mjs";
import { feeFor, selectFeeSchedule } from "@/lib/exit-terms.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// A signature is 64 bytes: 87 or 88 base58 characters, unlike a 32-44 char key.
const SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;
const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const RPC_USER_AGENT =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const j = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));

/**
 * Take any transaction signature and reconstruct what happened to the money.
 *
 * Everything measured here comes from the transaction's own metadata: the token
 * balances recorded before and after, per account, as the cluster reported them.
 * Anything derived (what a transfer fee implies) is computed from the mint's
 * current state and labelled as derived, because a past quote is not recoverable
 * from a signature.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const signature = url.searchParams.get("signature")?.trim() ?? "";

  if (!SIGNATURE.test(signature)) {
    return NextResponse.json(
      { error: "signature must be a base58 transaction signature" },
      { status: 400 }
    );
  }

  let tx: any;
  try {
    // rpc() returns the envelope; the transaction itself is under `result`.
    const env = await rpc<any>("getTransaction", [
      signature,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
    ]);
    tx = env?.result ?? null;
  } catch (e) {
    return NextResponse.json(
      { error: `RPC request failed: ${(e as Error).message}`, stage: "getTransaction" },
      { status: 502 }
    );
  }

  if (!tx) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "this signature was not found at confirmed commitment. It may be too old for the node's history, or not yet confirmed.",
        stage: "lookup",
      },
      { status: 404 }
    );
  }

  const meta = tx.meta ?? {};
  const pre: any[] = meta.preTokenBalances ?? [];
  const post: any[] = meta.postTokenBalances ?? [];

  // Deltas are computed per (account index, mint) so a wallet holding the same
  // mint in two accounts is reported as two movements, not one netted figure.
  const keyOf = (b: any) => `${b.accountIndex}:${b.mint}`;
  const map = new Map<string, any>();
  for (const b of pre) {
    map.set(keyOf(b), {
      account_index: b.accountIndex,
      mint: b.mint,
      owner: b.owner ?? null,
      pre_raw: b.uiTokenAmount?.amount ?? "0",
      pre_ui: b.uiTokenAmount?.uiAmountString ?? null,
      decimals: b.uiTokenAmount?.decimals ?? null,
      post_raw: "0",
      post_ui: null,
    });
  }
  for (const b of post) {
    const k = keyOf(b);
    const row = map.get(k) ?? {
      account_index: b.accountIndex,
      mint: b.mint,
      owner: b.owner ?? null,
      pre_raw: "0",
      pre_ui: null,
      decimals: b.uiTokenAmount?.decimals ?? null,
      post_raw: "0",
      post_ui: null,
    };
    row.post_raw = b.uiTokenAmount?.amount ?? "0";
    row.post_ui = b.uiTokenAmount?.uiAmountString ?? null;
    if (row.decimals === null) row.decimals = b.uiTokenAmount?.decimals ?? null;
    map.set(k, row);
  }

  const movements = [...map.values()]
    .map((r) => ({
      ...r,
      delta_raw: (BigInt(r.post_raw) - BigInt(r.pre_raw)).toString(),
    }))
    .filter((r) => r.delta_raw !== "0")
    .sort((a, b) => Number(BigInt(b.delta_raw) < 0n) - Number(BigInt(a.delta_raw) < 0n));

  // Programs actually invoked, so a route can be described from the chain rather
  // than from a guess about which venue the user probably used.
  const programIds = new Set<string>();
  for (const ix of tx.transaction?.message?.instructions ?? []) {
    if (ix?.programId) programIds.add(ix.programId);
  }
  for (const inner of meta.innerInstructions ?? []) {
    for (const ix of inner?.instructions ?? []) {
      if (ix?.programId) programIds.add(ix.programId);
    }
  }

  const touched = [...new Set(movements.map((m) => m.mint))].slice(0, 12);
  const mints: Array<Record<string, unknown>> = [];
  for (const mint of touched) {
    try {
      const t = await readExitTermsCached(mint, { rpcUrl: RPC_URL, ua: RPC_USER_AGENT });
      const sel = selectFeeSchedule(t.fee_older, t.fee_newer, t.epoch ?? null);
      // What the fee implies for the largest movement of this mint in the
      // transaction. Derived from current mint state, and labelled as such.
      const biggest = movements
        .filter((m) => m.mint === mint)
        .map((m) => (BigInt(m.delta_raw) < 0n ? -BigInt(m.delta_raw) : BigInt(m.delta_raw)))
        .sort((a, b) => (a > b ? -1 : 1))[0];
      mints.push({
        mint,
        readable: true,
        is_token_2022: t.is_token_2022 === true,
        decimals: t.decimals ?? null,
        symbol: t.symbol ?? null,
        fee_in_force_bps: sel.effective?.bps ?? null,
        fee_schedule_epoch: sel.effective?.epoch ?? null,
        fee_pending_bps: sel.pending?.bps ?? null,
        fee_pending_epoch: sel.pending?.epoch ?? null,
        maximum_fee: sel.effective?.maximum_fee ?? null,
        derived_withheld_on_largest_move:
          sel.effective && biggest ? feeFor(biggest, sel.effective).toString() : null,
      });
    } catch (e) {
      mints.push({ mint, readable: false, error: (e as Error).message });
    }
  }

  return new NextResponse(
    j({
      ok: true,
      signature,
      slot: tx.slot ?? null,
      block_time: tx.blockTime ?? null,
      failed: meta.err != null,
      err: meta.err ?? null,
      fee_lamports: meta.fee ?? null,
      movements,
      mints,
      programs: [...programIds],
      touches_token_2022: programIds.has(TOKEN_2022_PROGRAM),
      touches_token_program: programIds.has(TOKEN_PROGRAM),
      logs: (meta.logMessages ?? []).slice(0, 40),
      note:
        "Balances shown are the cluster's own before/after token balances for this signature. The withheld figure is derived from the mint's current schedule and is not recoverable from a past quote.",
      source: {
        url: RPC_URL,
        host: new URL(RPC_URL).host,
        method: "getTransaction (jsonParsed)",
        at: new Date().toISOString(),
      },
    }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
