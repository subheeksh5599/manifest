import { NextResponse } from "next/server";
import { readExitTermsCached } from "@/lib/exit-terms.mjs";
import { exitVerdict, landingAmount } from "@/lib/exit-engine.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAINNET = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const DEVNET = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
const RPC_UA =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const JUPITER_QUOTE = process.env.JUPITER_QUOTE_URL || "https://lite-api.jup.ag/swap/v1/quote";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** A classic SPL mint. The fee extension only exists on Token-2022. */
const CLASSIC_MINT = USDC;

/** A Token-2022 mint the issuer charges to leave, with an increase announced. */
const FEE_MINT = "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB";

/** The devnet replica, created by scripts/replica_devnet.mjs. */
const DEVNET_FEE_MINT = "3CeQw3Y4nEBiykxWKEnxPnmKq3GFrwrxYjFRwUTMPVgu";

function j(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
}

async function quote(mint: string, size: string) {
  const url = `${JUPITER_QUOTE}?inputMint=${mint}&outputMint=${USDC}&amount=${size}&slippageBps=50`;
  const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`quote endpoint returned ${r.status}`);
  const data = await r.json();
  if (!data?.outAmount) throw new Error(data?.error || data?.errorCode || "no route returned");
  return {
    venue: "pool",
    available: true,
    out_amount: data.outAmount,
    price_impact_bps: Math.round(Number(data.priceImpactPct ?? 0) * 10000),
  };
}

/**
 * One configuration, evaluated against real state. Every case reports the live
 * value that tripped it, because a refusal that does not say what it saw is an
 * anecdote rather than a check.
 */
async function attempt(
  id: string,
  what: string,
  mint: string,
  size: string,
  bounds: { max_impact_bps: number; max_total_cost_bps: number },
  rpcUrl: string,
  network: string
) {
  const row: any = { id, what, mint, size, network, bounds };
  try {
    const terms = await readExitTermsCached(mint, { rpcUrl, ua: RPC_UA });
    row.epoch = terms.epoch;
    row.slot = terms.slot;
    row.schedule_bps = terms.fee_older ? null : null;
    // A mint that cannot carry the extension is refused before any quote is
    // relevant, so asking a venue for one would only add an error line that
    // looks like a failure of this check rather than a consequence of it.
    let q: any = null;
    if (terms.is_token_2022 !== false) {
      try {
        q = await quote(mint, size);
      } catch (e) {
        row.quote_error = (e as Error).message;
      }
    } else {
      row.quote_skipped = "not quoted: the fee extension cannot exist on this mint";
    }
    const verdict = exitVerdict(terms, q, BigInt(size), bounds);
    row.verdict = verdict.verdict;
    row.refusal = verdict.reason;
    row.failed_check = verdict.failed_check;
    const tripped = verdict.checks.find((c: any) => !c.passed);
    row.tripped = tripped ? { check: tripped.id, value: tripped.value, detail: tripped.detail } : null;
    row.landing = verdict.landing
      ? {
          quoted_out: verdict.landing.quoted_out.toString(),
          schedule_bps: verdict.landing.schedule_bps,
          withheld: verdict.landing.withheld.toString(),
          lands: verdict.landing.lands.toString(),
          pending_bps: verdict.landing.pending_bps,
          pending_epoch: verdict.landing.pending_epoch,
        }
      : null;
  } catch (e) {
    row.verdict = "ERROR";
    row.error = (e as Error).message;
  }
  return row;
}

/**
 * Remove the epoch read and price the same exit again.
 *
 * Guarding off the schedule leaves the read reporting the older rate whatever
 * the epoch, which is the shape of every quote that ignores the extension. The
 * gap is what that read is worth.
 */
function ablate(terms: any, quoted: bigint) {
  const older = terms.fee_older;
  const newer = terms.fee_newer;
  if (!older || !newer) return null;

  // Evaluate past the epoch the announced schedule takes effect, which is when
  // the difference between reading the epoch and ignoring it is positive.
  const later = Number(newer.epoch) + 1;
  const correct = landingAmount(quoted, terms, later);
  const ignorant = landingAmount(quoted, { ...terms, fee_newer: { ...newer, epoch: Number.MAX_SAFE_INTEGER } }, later);

  return {
    evaluated_at_epoch: later,
    in_force_now: terms.epoch,
    older: { bps: older.bps, epoch: older.epoch },
    newer: { bps: newer.bps, epoch: newer.epoch },
    with_the_epoch_read: { bps: correct.schedule_bps, withheld: correct.withheld.toString(), lands: correct.lands.toString() },
    with_the_epoch_read_removed: {
      bps: ignorant.schedule_bps,
      withheld: ignorant.withheld.toString(),
      lands: ignorant.lands.toString(),
    },
    the_read_is_worth: (ignorant.lands - correct.lands).toString(),
  };
}

export async function GET() {
  const big = "1000000000000000";
  const normal = "1000000000";

  const [classicMint, overSize, atSize, devnetReplica] = await Promise.all([
    attempt("classic_mint", "a mint the fee extension cannot exist on", CLASSIC_MINT, normal,
      { max_impact_bps: 300, max_total_cost_bps: 1000 }, MAINNET, "mainnet"),
    attempt("over_bound", "the same exit at a hundred times the depth", FEE_MINT, big,
      { max_impact_bps: 300, max_total_cost_bps: 1000 }, MAINNET, "mainnet"),
    attempt("acceptance", "a real holding, at a real size", FEE_MINT, normal,
      { max_impact_bps: 300, max_total_cost_bps: 1000 }, MAINNET, "mainnet"),
    attempt("devnet_replica", "the replica issuer, read on devnet", DEVNET_FEE_MINT, normal,
      { max_impact_bps: 300, max_total_cost_bps: 1000 }, DEVNET, "devnet"),
  ]);

  // A bound the holder sets, not a property of the chain: the same exit is fine
  // to someone willing to pay a percent and a refusal to someone who is not.
  const tightBound = await attempt("bound_is_the_holders", "the same holding under a stricter bound", FEE_MINT, normal,
    { max_impact_bps: 300, max_total_cost_bps: 50 }, MAINNET, "mainnet");

  let ablation = null;
  try {
    const terms = await readExitTermsCached(FEE_MINT, { rpcUrl: MAINNET, ua: RPC_UA });
    const q = await quote(FEE_MINT, normal);
    ablation = ablate(terms, BigInt(q.out_amount));
  } catch (e) {
    ablation = { error: (e as Error).message };
  }

  const cases = [classicMint, overSize, tightBound, atSize, devnetReplica];
  const refusals = cases.filter((c) => c.verdict === "REFUSE");

  return new NextResponse(
    j({
      // Said plainly, because a verification page that could be a screenshot is
      // worth nothing: every row below is produced on this request.
      nothing_is_precomputed: true,
      evaluated_at: new Date().toISOString(),
      chain_epoch: atSize.epoch ?? null,
      cases,
      refusals: refusals.length,
      distinct_refusals: [...new Set(refusals.map((c) => c.refusal))],
      ablation,
      on_chain:
        "The devnet program records a reading and refuses one that stops matching: verify_reading returns ReadingScheduleChanged (6003) once the issuer moves the fee. scripts/replica_devnet.mjs reproduces it.",
    }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
