import { NextResponse } from "next/server";
import { candlesForPool, dexPairsForToken, gtPoolsForToken, jupiterPrice } from "@/lib/sources.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 0;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * The price series for a holding, drawn from the pool that actually trades it.
 *
 * Nothing here is smoothed, filled or synthesised: the venues are asked which
 * pools list the mint, the deepest of those is asked for its own candles, and the
 * payload reports the pool it used so the chart can say where the line came from.
 * When a source cannot answer, that is the answer.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mint = url.searchParams.get("mint") ?? "";
  const timeframe = url.searchParams.get("timeframe") ?? "hour";
  const limit = Math.min(200, Math.max(6, Number(url.searchParams.get("limit") ?? 72)));

  if (!BASE58.test(mint)) {
    return NextResponse.json({ error: "mint must be a base58 address" }, { status: 400 });
  }
  if (!["minute", "hour", "day"].includes(timeframe)) {
    return NextResponse.json({ error: "timeframe must be minute, hour or day" }, { status: 400 });
  }

  let price: any = { prices: {}, source: null };
  let priceError: string | null = null;
  try {
    price = await jupiterPrice([mint]);
  } catch (e) {
    priceError = (e as Error).message;
  }

  // Two listings, tried in order. The second is not a lesser source, it is a
  // different host — and a free endpoint handing out 429s to one address still
  // answers the other.
  let pairs: any[] = [];
  let pairError: string | null = null;
  let poolsFrom: string | null = null;
  try {
    const r = await dexPairsForToken(mint);
    pairs = r.pairs;
    poolsFrom = r.source?.url ?? "https://api.dexscreener.com";
  } catch (e) {
    pairError = (e as Error).message;
  }
  if (pairs.length === 0) {
    try {
      const r = await gtPoolsForToken(mint);
      if (r.pairs.length > 0) {
        pairs = r.pairs;
        poolsFrom = r.source.url;
        pairError = null;
      }
    } catch (e) {
      pairError = [pairError, (e as Error).message].filter(Boolean).join(" · ");
    }
  }

  // Deepest pool first: a thin pool's candles describe the pool, not the asset.
  const ranked = [...pairs].sort(
    (a, b) => Number(b.liquidity_usd ?? 0) - Number(a.liquidity_usd ?? 0)
  );
  const chosen = ranked[0] ?? null;

  if (!chosen) {
    return NextResponse.json(
      {
        ok: false,
        mint,
        error: pairError ?? "no venue lists this mint, so there is no price series to draw",
        pools_from: poolsFrom,
        stage: "venue_lookup",
        price: price.prices?.[mint] ?? null,
        price_source: price.source,
        price_error: priceError,
        pools: pairs,
      },
      { status: 404 }
    );
  }

  try {
    const { candles, source } = await candlesForPool(chosen.pair_address, { timeframe, limit });
    return NextResponse.json({
      ok: true,
      mint,
      pool: {
        address: chosen.pair_address,
        dex: chosen.dex,
        labels: chosen.labels,
        base_symbol: chosen.base_symbol,
        quote_symbol: chosen.quote_symbol,
        liquidity_usd: chosen.liquidity_usd,
        volume_24h: chosen.volume_24h,
      },
      pools: ranked.length,
      candles,
      price: price.prices?.[mint] ?? null,
      sources: { candles: source, pools: poolsFrom, price: price.source },
      errors: { price: priceError, pools: pairError },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        mint,
        error: (e as Error).message,
        stage: "candles",
        pool: chosen.pair_address,
        price: price.prices?.[mint] ?? null,
      },
      { status: 502 }
    );
  }
}
