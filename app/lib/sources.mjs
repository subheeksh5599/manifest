/**
 * Every external read the dashboard makes goes through this file.
 *
 * The rule the whole product rests on: a number may only appear on screen if we
 * can name the URL it came from and the moment it was read. So every function
 * here returns the value together with its `source`, and none of them invent a
 * fallback — a failed read throws, and the caller renders the failure.
 */

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

/** Where the quote engine lives. Public, no key. */
export const JUPITER = "https://lite-api.jup.ag";

async function fetchJsonOnce(url, { timeout, accept }) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept },
      signal: ctl.signal,
      cache: "no-store",
    });
    if (!r.ok) {
      throw new Error(`${new URL(url).host} answered ${r.status} for ${url}`);
    }
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`${new URL(url).host} did not return JSON`);
    }
  } catch (e) {
    if (e?.name === "AbortError") throw new Error(`${new URL(url).host} did not answer within ${timeout}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, { timeout = 15000, accept = "application/json", attempts = 1 } = {}) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchJsonOnce(url, { timeout, accept });
    } catch (e) {
      last = e;
      // A 404 is an answer and is not retried. A silence or a busy 429/5xx is
      // worth one more try: those are the two ways a free endpoint says "later".
      const m = e?.message ?? "";
      const retryable = /did not answer within/.test(m) || /answered (429|5\d\d)\b/.test(m);
      if (!retryable) throw e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw last;
}

const stamp = (url) => ({ url, host: new URL(url).host, at: new Date().toISOString() });

/**
 * An executable route for a size. `outAmount` is what the venue will send, before
 * the mint's own transfer fee is applied to the receiving transfer.
 */
export async function jupiterQuote({ inputMint, outputMint, amount, slippageBps = 50 }) {
  const url =
    `${JUPITER}/swap/v1/quote?inputMint=${encodeURIComponent(inputMint)}` +
    `&outputMint=${encodeURIComponent(outputMint)}` +
    `&amount=${encodeURIComponent(String(amount))}&slippageBps=${encodeURIComponent(String(slippageBps))}`;
  const d = await fetchJson(url);
  if (!d?.outAmount) throw new Error("the venue returned no executable route for this pair and size");

  const hops = [];
  for (const p of d.routePlan ?? []) {
    hops.push({
      venue: p?.swapInfo?.label ?? null,
      amm_key: p?.swapInfo?.ammKey ?? null,
      input_mint: p?.swapInfo?.inputMint ?? null,
      output_mint: p?.swapInfo?.outputMint ?? null,
      fee_mint: p?.swapInfo?.feeMint ?? null,
      fee_amount: p?.swapInfo?.feeAmount ?? null,
      percent: p?.percent ?? null,
    });
  }

  return {
    input_mint: d.inputMint,
    output_mint: d.outputMint,
    in_amount: String(d.inAmount),
    out_amount: String(d.outAmount),
    other_amount_threshold: d.otherAmountThreshold ? String(d.otherAmountThreshold) : null,
    slippage_bps: d.slippageBps ?? null,
    price_impact_pct: d.priceImpactPct ?? null,
    route_labels: hops.map((h) => h.venue).filter(Boolean),
    hops,
    source: stamp(url),
  };
}

/** Current price and the equity reference price, if the source carries one. */
export async function jupiterPrice(mints) {
  const list = [...new Set(mints.filter(Boolean))];
  if (!list.length) return { prices: {}, source: null };
  const url = `${JUPITER}/price/v3?ids=${list.join(",")}`;
  const d = await fetchJson(url);
  const prices = {};
  for (const [mint, v] of Object.entries(d ?? {})) {
    const x = v ?? {};
    prices[mint] = {
      usd_price: x.usdPrice ?? null,
      block_id: x.blockId ?? null,
      liquidity: x.liquidity ?? null,
      price_change_24h: x.priceChange24h ?? null,
      decimals: x.decimals ?? null,
      created_at: x.createdAt ?? null,
      equity_price: x.stockData?.price ?? null,
      equity_id: x.stockData?.id ?? null,
    };
  }
  return { prices, source: stamp(url) };
}

/** The venues that trade a mint, so that a chart can name the pool it drew. */
export async function dexPairsForToken(mint) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`;
  const d = await fetchJson(url);
  const pairs = (d?.pairs ?? []).map((p) => ({
    pair_address: p.pairAddress,
    dex: p.dexId ?? null,
    labels: p.labels ?? [],
    base_mint: p.baseToken?.address ?? null,
    base_symbol: p.baseToken?.symbol ?? null,
    quote_mint: p.quoteToken?.address ?? null,
    quote_symbol: p.quoteToken?.symbol ?? null,
    price_usd: p.priceUsd ?? null,
    liquidity_usd: p.liquidity?.usd ?? null,
    volume_24h: p.volume?.h24 ?? null,
    price_change_24h: p.priceChange?.h24 ?? null,
  }));
  return { pairs, source: stamp(url) };
}

/**
 * Real candles for a pool. Each row is [unix, open, high, low, close, volume] as
 * the venue reported it — nothing is interpolated or smoothed here.
 */
export async function candlesForPool(pool, { timeframe = "hour", limit = 48 } = {}) {
  const url =
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pool)}` +
    `/ohlcv/${timeframe}?limit=${limit}&currency=usd`;
  // This endpoint is slow — 11s was typical from a home connection — so it gets a
  // wider budget and one retry rather than failing the card it feeds.
  const d = await fetchJson(url, { timeout: 22000, attempts: 2 });
  const rows = d?.data?.attributes?.ohlcv_list ?? [];
  const candles = rows
    .map((r) => ({
      t: Number(r[0]),
      o: Number(r[1]),
      h: Number(r[2]),
      l: Number(r[3]),
      c: Number(r[4]),
      v: Number(r[5]),
    }))
    .filter((c) => Number.isFinite(c.t) && Number.isFinite(c.c))
    .sort((a, b) => a.t - b.t);
  return { candles, pool, timeframe, source: stamp(url) };
}

/**
 * The same venue listing, from the other source.
 *
 * The first source is fast and gives the deepest pools, but it is a shared public
 * endpoint and answers 429 to a datacenter address often enough to matter. This is
 * a different host with the same information, mapped to the same shape so the
 * caller cannot tell which one answered — except by the source it is handed.
 */
export async function gtPoolsForToken(mint) {
  const url =
    `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}` +
    `/pools?page=1`;
  const d = await fetchJson(url, { timeout: 20000, attempts: 2 });
  const pairs = (d?.data ?? []).map((p) => {
    const a = p?.attributes ?? {};
    const name = String(a.name ?? "");
    const [base, quote] = name.split("/").map((s) => s.trim());
    return {
      pair_address: a.address ?? null,
      dex: p?.relationships?.dex?.data?.id ?? null,
      labels: p?.relationships?.dex?.data?.id ? [p.relationships.dex.data.id] : null,
      liquidity_usd: a.reserve_in_usd != null ? Number(a.reserve_in_usd) : null,
      base_symbol: base || null,
      quote_symbol: quote || null,
      source_host: "api.geckoterminal.com",
    };
  }).filter((p) => p.pair_address);
  return { pairs, source: stamp(url) };
}

/**
 * The shelf of tokenized equities this issuer publishes. Discovery starts from a
 * live listing rather than a list baked into the bundle.
 */
export async function equityShelf() {
  const url = "https://prestocks.com/api/prestocks";
  const d = await fetchJson(url, { timeout: 20000 });
  const rows = Array.isArray(d) ? d : (d?.prestocks ?? d?.data ?? d?.items ?? []);
  const shelf = (Array.isArray(rows) ? rows : []).map((x) => ({
    symbol: x.symbol ?? x.ticker ?? null,
    name: x.name ?? null,
    // This listing calls the mint `contract_address`; nothing else it publishes is
    // an address, so there is no ambiguity to guess at.
    mint: x.contract_address ?? x.mint ?? x.mintAddress ?? x.address ?? null,
    decimals: x.decimals ?? null,
    // The issuer's own mark for the underlying equity, and the price its token
    // trades at. Keeping both is the point: they are not the same number.
    mark_price: x.markPrice ?? null,
    mark_valuation: x.markValuation ?? null,
    token_price: x.tokenPrice ?? null,
    implied_valuation: x.impliedValuation ?? null,
    supply: x.supply ?? null,
    description: x.description ?? null,
    image: x.image ?? null,
    external_url: x.external_url ?? null,
  }));
  return { shelf: shelf.filter((s) => s.mint), source: stamp(url) };
}
