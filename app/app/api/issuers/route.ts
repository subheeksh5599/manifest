import { NextResponse } from "next/server";
import { loadRegistry } from "@/lib/registry";
import { readExitTerms } from "@/lib/exit-terms.mjs";
import { landingAmount } from "@/lib/exit-engine.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const RPC_USER_AGENT =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const JUPITER_QUOTE = process.env.JUPITER_QUOTE_URL || "https://lite-api.jup.ag/swap/v1/quote";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function j(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
}

/** Quote one whole token of this mint, so the comparison is per unit held. */
async function quote(mint: string, size: string) {
  try {
    const r = await fetch(
      `${JUPITER_QUOTE}?inputMint=${mint}&outputMint=${USDC}&amount=${size}&slippageBps=50`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!r.ok) return { ok: false, reason: `quote endpoint ${r.status}` };
    const d = await r.json();
    if (!d?.outAmount) return { ok: false, reason: "no route" };
    const impact = Number(d.priceImpactPct ?? 0);
    return {
      ok: true,
      out_amount: d.outAmount,
      price_impact_bps: Number.isFinite(impact) ? Math.round(impact * 10000) : 0,
      labels: (d.routePlan ?? []).map((p: any) => p?.swapInfo?.label).filter(Boolean),
    };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

export async function GET() {
  const entries = loadRegistry();

  const rows = await Promise.all(
    entries.map(async (e) => {
      const size = (10n ** BigInt(e.decimals)).toString();
      try {
        const terms: any = await readExitTerms(e.mint, { rpcUrl: RPC_URL, ua: RPC_USER_AGENT });
        const q = await quote(e.mint, size);
        const eff = terms.fee_effective ?? null;
        const landing = q.ok ? landingAmount(BigInt((q as any).out_amount), terms) : null;

        return {
          mint: e.mint,
          symbol: e.symbol,
          name: e.name,
          issuer: e.issuer,
          decimals: e.decimals,
          slot: terms.slot,
          epoch: terms.epoch.toString(),
          is_token_2022: terms.is_token_2022,
          fee_exact: terms.fee_exact,
          fee_in_force_bps: eff ? eff.bps : 0,
          fee_in_force_epoch: eff ? eff.epoch.toString() : null,
          fee_pending_bps: terms.fee_pending ? terms.fee_pending.bps : null,
          fee_pending_epoch: terms.fee_pending ? terms.fee_pending.epoch.toString() : null,
          maximum_fee: terms.fee_older ? terms.fee_older.maximum_fee.toString() : null,
          withheld_distance: terms.withheld_amount,
          paused: terms.paused,
          hook: terms.transfer_hook_program,
          permanent_delegate: terms.permanent_delegate,
          levers: terms.authority.total_levers,
          keys: terms.authority.distinct_keys,
          quote_size: size,
          quote_out: q.ok ? (q as any).out_amount : null,
          quote_error: q.ok ? null : (q as any).reason,
          lands: landing ? landing.lands.toString() : null,
          withheld: landing ? landing.withheld.toString() : null,
          withheld_after_pending: landing ? (landing.withheld_after_pending?.toString() ?? null) : null,
          route_labels: q.ok ? (q as any).labels : [],
          error: null,
        };
      } catch (err) {
        return { mint: e.mint, symbol: e.symbol, name: e.name, issuer: e.issuer, error: (err as Error).message };
      }
    })
  );

  const observed = rows.filter((r) => !("error" in r && r.error));
  const issuers = [...new Set(observed.map((r: any) => r.issuer))];

  return new NextResponse(
    j({
      observed: observed.length,
      requested: entries.length,
      issuers,
      // The comparison the field does not make: issuers of the same asset class
      // with materially different exit terms.
      by_issuer: issuers.map((iss: any) => {
        const set = observed.filter((r: any) => r.issuer === iss) as any[];
        return {
          issuer: iss,
          mints: set.length,
          fee_bps_min: Math.min(...set.map((r) => r.fee_in_force_bps)),
          fee_bps_max: Math.max(...set.map((r) => r.fee_in_force_bps)),
          keys_min: Math.min(...set.map((r) => r.keys)),
          keys_max: Math.max(...set.map((r) => r.keys)),
          any_pending_change: set.some((r) => r.fee_pending_bps !== null),
        };
      }),
      rows: [...observed, ...rows.filter((r) => "error" in r && r.error)],
    }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
