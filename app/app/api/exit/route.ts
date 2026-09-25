import { NextResponse } from "next/server";
import { readExitTerms } from "@/lib/exit-terms.mjs";
import { exitVerdict, routeExit } from "@/lib/exit-engine.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const JUPITER_QUOTE =
  process.env.JUPITER_QUOTE_URL || "https://lite-api.jup.ag/swap/v1/quote";
const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const RPC_USER_AGENT =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** JSON with bigints as strings. A bare JSON.stringify throws on a bigint. */
function j(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
}

/**
 * Ask the aggregator what the pool would send for this size.
 *
 * This is the quote only. It does not know about the mint's transfer-fee
 * extension, which is exactly why the engine exists.
 */
async function quoteAtSize(mint: string, size: string): Promise<any> {
  const url = `${JUPITER_QUOTE}?inputMint=${mint}&outputMint=${USDC}&amount=${size}&slippageBps=50`;
  const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`quote endpoint returned ${r.status}`);
  const data = await r.json();
  if (!data?.outAmount) {
    throw new Error(data?.error || data?.errorCode || "no route returned for this size");
  }
  const impactPct = Number(data.priceImpactPct ?? 0);
  return {
    venue: "pool",
    available: true,
    out_amount: data.outAmount,
    price_impact_bps: Number.isFinite(impactPct) ? Math.round(impactPct * 10000) : 0,
    route_labels: (data.routePlan ?? []).map((p: any) => p?.swapInfo?.label).filter(Boolean),
    hops: (data.routePlan ?? []).length,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mint = url.searchParams.get("mint") ?? "";
  const size = url.searchParams.get("size") ?? "";

  if (!BASE58.test(mint)) {
    return NextResponse.json({ error: "mint must be a base58 address" }, { status: 400 });
  }
  if (!/^[1-9][0-9]*$/.test(size)) {
    return NextResponse.json({ error: "size must be a positive integer in base units" }, { status: 400 });
  }

  let terms;
  try {
    terms = await readExitTerms(mint, { rpcUrl: RPC_URL, ua: RPC_USER_AGENT });
  } catch (e) {
    return NextResponse.json({ error: `chain read failed: ${(e as Error).message}` }, { status: 502 });
  }

  // Route 1 — the pool, executable now.
  let poolQuote: any = null;
  let poolError: string | null = null;
  try {
    poolQuote = await quoteAtSize(mint, size);
  } catch (e) {
    poolError = (e as Error).message;
  }

  // Route 2 — an issuer's own redemption window. It lives off chain, so it can
  // never be shown as achievable by this system. Named, not scored as zero.
  const issuerRoute = {
    venue: "issuer_redemption",
    available: false,
    unavailable_reason: "off_chain_redemption_not_executable",
  };

  // Route 3 — a second issuer for the same company. Only real if observed.
  const secondIssuer = {
    venue: "second_issuer",
    available: false,
    unavailable_reason: "no_second_issuer_observed",
  };

  const routes = routeExit([
    poolQuote ?? { venue: "pool", available: false, unavailable_reason: poolError ?? "no_route" },
    secondIssuer,
    issuerRoute,
  ]);

  const verdict = exitVerdict(terms, poolQuote, BigInt(size), {
    max_impact_bps: 300,
    max_total_cost_bps: 1000,
  });

  return new NextResponse(
    j({
      mint,
      size,
      slot: terms.slot,
      epoch: terms.epoch,
      terms,
      quote: poolQuote,
      quote_error: poolError,
      verdict,
      routes,
      bounds: { max_impact_bps: 300, max_total_cost_bps: 1000 },
      output_mint: USDC,
    }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
