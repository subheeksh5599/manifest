"use client";

import { useEffect, useState } from "react";

/**
 * The price of a holding, drawn from the pool that trades it.
 *
 * The line is the venue's own candles, unsmoothed. The card names the pool it
 * came from, because a price drawn from a thin pool describes that pool rather
 * than the asset, and the reader deserves to know which one they are looking at.
 */

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

type Chart = {
  ok: boolean;
  mint: string;
  error?: string;
  stage?: string;
  pool?: {
    address: string;
    dex: string | null;
    labels: string[];
    base_symbol: string | null;
    quote_symbol: string | null;
    liquidity_usd: string | number | null;
    volume_24h: string | number | null;
  };
  pools?: number;
  candles?: Candle[];
  price?: { usd_price: number | null; price_change_24h: number | null; equity_price: number | null; equity_id: string | null } | null;
  sources?: { candles: { url: string; at: string } | null; pools: string | null; price: { url: string; host: string; at: string } | null };
  price_error?: string | null;
  errors?: { price: string | null; pools: string | null };
};

const short = (s: string, n = 4) => (s.length > n * 2 + 3 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);
const money = (v: number | null | undefined, dp = 4) =>
  v === null || v === undefined ? "—" : `$${v.toFixed(dp)}`;

export default function PriceChart({
  mint,
  timeframe = "hour",
  height = 150,
}: {
  mint: string;
  timeframe?: "minute" | "hour" | "day";
  height?: number;
}) {
  const [d, setD] = useState<Chart | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setD(null);
    setErr(null);
    void (async () => {
      try {
        const r = await fetch(`/api/chart?mint=${encodeURIComponent(mint)}&timeframe=${timeframe}&limit=72`, {
          cache: "no-store",
        });
        const j = (await r.json()) as Chart;
        if (!alive) return;
        if (!r.ok || !j.ok) {
          setErr(j.error ?? `the chart read returned ${r.status}`);
          return;
        }
        setD(j);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mint, timeframe]);

  if (err) {
    return (
      <div className="state-card" style={{ margin: 0 }}>
        <div className="state-title">No price series</div>
        <p className="mono" style={{ fontSize: 12, margin: 0 }}>{err}</p>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="state-card" style={{ margin: 0 }}>
        <div className="state-title">Reading the venue</div>
        <p className="mono" style={{ fontSize: 12, margin: 0, color: "var(--color-graphite)" }}>
          asking which pools list this mint
        </p>
      </div>
    );
  }

  const cs = d.candles ?? [];
  if (cs.length < 2) {
    return (
      <div className="state-card" style={{ margin: 0 }}>
        <div className="state-title">Not enough history</div>
        <p className="mono" style={{ fontSize: 12, margin: 0 }}>
          the venue returned {cs.length} candle{cs.length === 1 ? "" : "s"} for this pool, which is
          not a series. Nothing has been filled in.
        </p>
      </div>
    );
  }

  const W = 720;
  const H = height;
  const pad = { l: 0, r: 0, t: 10, b: 16 };
  const closes = cs.map((c) => c.c);
  const lo = Math.min(...closes);
  const hi = Math.max(...closes);
  const span = hi - lo || Math.max(hi * 0.01, 1e-9);
  const x = (i: number) => (i / (cs.length - 1)) * W;
  const y = (v: number) => pad.t + (1 - (v - lo) / span) * (H - pad.t - pad.b);

  const line = closes.map((c, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(c).toFixed(2)}`).join(" ");
  const area = `${line} L${W},${H - pad.b} L0,${H - pad.b} Z`;
  const up = closes[closes.length - 1] >= closes[0];
  const change = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
  const stamp = (t: number) => new Date(t * 1000).toISOString().slice(5, 16).replace("T", " ");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 19, fontWeight: 700 }}>
          {money(d.price?.usd_price ?? closes[closes.length - 1])}
        </span>
        <span className="mono" style={{ fontSize: 12, color: change >= 0 ? "#16794c" : "var(--color-refuse)" }}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}% over {cs.length} {timeframe}s
        </span>
        {d.price?.price_change_24h != null && (
          <span className="mono" style={{ fontSize: 12, color: "var(--color-graphite)" }}>
            24h {d.price.price_change_24h >= 0 ? "+" : ""}
            {d.price.price_change_24h.toFixed(2)}%
          </span>
        )}
        {d.price?.equity_price != null && (
          <span className="mono" style={{ fontSize: 12, color: "var(--color-graphite)" }}>
            underlying {money(d.price.equity_price)}
            <span style={{ color: "var(--color-ash)" }}> · {d.price.equity_id}</span>
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`price series for ${mint}`}>
        <path d={area} fill={up ? "rgba(22,121,76,0.08)" : "rgba(255,77,77,0.08)"} />
        <path d={line} fill="none" stroke={up ? "#16794c" : "var(--color-refuse)"} strokeWidth={1.6} />
        <line x1={0} y1={H - pad.b} x2={W} y2={H - pad.b} stroke="var(--color-hairline)" strokeWidth={1} />
      </svg>

      <div
        className="mono"
        style={{
          display: "flex",
          gap: 12,
          fontSize: 10,
          color: "var(--color-ash)",
          flexWrap: "wrap",
          marginTop: 4,
        }}
      >
        <span>{stamp(cs[0].t)}</span>
        <span>low {money(lo)}</span>
        <span>high {money(hi)}</span>
        <span style={{ marginLeft: "auto" }}>{stamp(cs[cs.length - 1].t)}</span>
      </div>

      <div className="mono" style={{ fontSize: 10, color: "var(--color-graphite)", marginTop: 8 }}>
        {d.pool ? (
          <>
            pool <a href={`https://dexscreener.com/solana/${d.pool.address}`} target="_blank" rel="noreferrer" style={{ color: "var(--color-brand-blue)" }}>{short(d.pool.address, 6)}</a>
            {" · "}
            {d.pool.dex} {d.pool.labels?.join(" ")}
            {" · "}
            {d.pools} pool{d.pools === 1 ? "" : "s"} listed, deepest used
            {d.pool.liquidity_usd ? ` · liquidity $${Number(d.pool.liquidity_usd).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : ""}
          </>
        ) : (
          "no pool reported"
        )}
      </div>
      {d.sources?.candles && (
        <div className="mono" style={{ fontSize: 9, color: "var(--color-ash)", marginTop: 3, wordBreak: "break-all" }}>
          {d.sources.candles.url} · read {d.sources.candles.at.slice(11, 19)}Z
        </div>
      )}
    </div>
  );
}
