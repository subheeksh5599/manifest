"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Price = {
  symbol: string;
  usdPrice: number;
  change24h: number;
  liquidity: number;
};

type TapeRecord = {
  verdict: "ACCEPT" | "REFUSE";
  check_id: string | null;
  plan?: { mint?: string; expected_symbol?: string };
  slot?: number;
  ts?: number;
};

const mints = ["TSLAx", "GOOGLx", "HOODx", "NVDAx", "CRCLx"];
const mintNames: Record<string, string> = {
  TSLAx: "Tesla",
  GOOGLx: "Alphabet",
  HOODx: "Robinhood",
  NVDAx: "NVIDIA",
  CRCLx: "Circle",
};

export default function DashboardPage() {
  const [prices, setPrices] = useState<Record<string, Price>>({});
  const [tape, setTape] = useState<TapeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [priceRes, tapeRes] = await Promise.all([
          fetch("/api/prices", { cache: "no-store" }),
          fetch("/api/tape", { cache: "no-store" }),
        ]);
        const priceJson = await priceRes.json();
        const tapeJson = await tapeRes.json();
        if (!active) return;
        setPrices(priceJson.prices ?? {});
        setTape(tapeJson.records ?? []);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const priceRows = useMemo(() => Object.entries(prices)
    .map(([mint, value]) => ({ mint, ...value }))
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)), [prices]);

  const accepts = tape.filter((r) => r.verdict === "ACCEPT").length;
  const refusals = tape.filter((r) => r.verdict === "REFUSE").length;
  const latest = tape.slice(-1)[0];

  return (
    <div className="gn-dashboard">
      <DashboardTopbar />
      <main className="gn-main">
        <div className="gn-page-head">
          <div>
            <div className="gn-eyebrow">Manifest / Overview</div>
            <h1>Tokenized equity market intelligence</h1>
          </div>
          <div className="gn-live"><span /> LIVE MAINNET READS</div>
        </div>

        <section className="gn-grid gn-summary-grid">
          <MetricCard title="Tracked Mints" value="5" meta="Token-2022 issuer registry" chart={<Sparkline color="#4ade80" />} />
          <MetricCard title="Preflight Checks" value="7" meta="First failure wins" chart={<Bars color="#60a5fa" />} />
          <MetricCard title="Refusal Rate" value={tape.length ? `${Math.round((refusals / tape.length) * 100)}%` : "—"} meta={`${refusals} refused · ${accepts} accepted`} chart={<SignalBar />} />
          <MetricCard title="Program" value="DEVNET" meta="pTpaE75u…yVTN" chart={<Sparkline color="#a78bfa" />} />
        </section>

        <section className="gn-grid gn-detail-grid">
          <Panel title="Live xStock Prices" control="24h">
            <div className="gn-mini-chart"><PriceLine /></div>
            <div className="gn-table">
              <div className="gn-table-head"><span>Asset</span><span>Price</span><span>24h</span></div>
              {(priceRows.length ? priceRows : mints.map((symbol) => ({ symbol, usdPrice: 0, change24h: 0, liquidity: 0 }))).map((row) => (
                <div className="gn-table-row" key={row.symbol}>
                  <span><b>{row.symbol}</b><small>{mintNames[row.symbol] ?? "Tokenized equity"}</small></span>
                  <strong>{loading || !row.usdPrice ? "—" : `$${row.usdPrice.toFixed(2)}`}</strong>
                  <em className={row.change24h >= 0 ? "positive" : "negative"}>{loading || !row.usdPrice ? "—" : `${row.change24h >= 0 ? "+" : ""}${row.change24h.toFixed(2)}%`}</em>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="No-Trade Tape" control="latest">
            <div className="gn-tape-summary">
              <div><span className="gn-kicker">Latest verdict</span><b className={latest?.verdict === "ACCEPT" ? "positive" : "negative"}>{latest?.verdict ?? "NO RECORDS"}</b></div>
              <div><span className="gn-kicker">Invariant surface</span><b>{latest?.check_id ?? "awaiting evaluation"}</b></div>
            </div>
            <div className="gn-tape-list">
              {tape.slice(-8).reverse().map((row, i) => (
                <div className="gn-tape-row" key={`${row.ts ?? i}-${i}`}>
                  <span className={row.verdict === "ACCEPT" ? "gn-dot green" : "gn-dot red"} />
                  <span className="gn-mono">{row.plan?.expected_symbol ?? "PLAN"}</span>
                  <span>{row.check_id ?? "all checks passed"}</span>
                  <b className={row.verdict === "ACCEPT" ? "positive" : "negative"}>{row.verdict}</b>
                </div>
              ))}
              {!tape.length && <div className="gn-empty">No local tape records yet. Run an evaluation from Plan Builder.</div>}
            </div>
            <Link className="gn-panel-link" href="/tape">Open full tape →</Link>
          </Panel>

          <Panel title="Preflight Signal" control="7 checks">
            <div className="gn-signal-gauge">
              <div className="gn-gauge-track"><span className="gn-gauge-marker" /></div>
              <div className="gn-gauge-labels"><span>REFUSE</span><span>VERIFY</span><span>READY</span></div>
            </div>
            <div className="gn-check-list">
              {[
                ["mint_identity", "Registry match"],
                ["multiplier_freshness", "Snapshot vs live"],
                ["issuer_levers", "Pause / hook state"],
                ["reference_regime", "Reference age"],
                ["exit_at_size", "Route cost"],
                ["policy", "Trade cap"],
              ].map(([name, detail], index) => (
                <div className="gn-check-row" key={name}><span className={`gn-check-state ${index < 3 ? "ok" : "idle"}`} /><span className="gn-mono">{name}</span><small>{detail}</small></div>
              ))}
            </div>
            <Link className="gn-panel-link" href="/plan">Build a plan →</Link>
          </Panel>

          <Panel title="Issuer State" control="Token-2022">
            <div className="gn-issuer-grid">
              <div><span>Multiplier</span><b>1.000000</b></div>
              <div><span>Paused</span><b className="positive">false</b></div>
              <div><span>Transfer hook</span><b>none</b></div>
              <div><span>Read source</span><b className="gn-mono">mainnet RPC</b></div>
            </div>
            <div className="gn-chart-legend"><span className="legend-blue" /> live account state <span className="legend-gray" /> plan snapshot</div>
            <div className="gn-mini-chart"><StateArea /></div>
            <Link className="gn-panel-link" href="/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB">Inspect a mint →</Link>
          </Panel>
        </section>

        <section className="gn-asset-section">
          <div className="gn-section-title"><h2>Asset registry</h2><Link href="/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB">View all mints →</Link></div>
          <div className="gn-asset-table">
            <div className="gn-table-head"><span># Asset</span><span>Issuer</span><span>State</span><span>Source</span></div>
            {mints.map((symbol, i) => <div className="gn-table-row" key={symbol}><span><b>{i + 1} {symbol}</b><small>{mintNames[symbol]}</small></span><span className="gn-mono">Token-2022</span><em className="positive">ACTIVE</em><span className="gn-mono">mainnet RPC</span></div>)}
          </div>
        </section>
      </main>
    </div>
  );
}

function DashboardTopbar() {
  return <header className="gn-topbar"><Link href="/dashboard" className="gn-brand">manifest <span>studio</span></Link><nav><Link className="active" href="/dashboard">Overview</Link><Link href="/plan">Plans</Link><Link href="/tape">Tape</Link><Link href="/evidence">Evidence</Link><Link href="/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB">Mints</Link></nav><div className="gn-top-actions"><Link href="/plan">Launch Plan Builder</Link><span className="gn-network">DEVNET</span></div></header>;
}

function MetricCard({ title, value, meta, chart }: { title: string; value: string; meta: string; chart: React.ReactNode }) {
  return <article className="gn-card gn-metric"><div className="gn-card-title"><span>{title}</span><span className="gn-chevron">⌄</span></div><div className="gn-metric-chart">{chart}</div><div className="gn-metric-bottom"><strong>{value}</strong><span>{meta}</span></div></article>;
}

function Panel({ title, control, children }: { title: string; control: string; children: React.ReactNode }) {
  return <article className="gn-card gn-panel"><div className="gn-card-title"><span>{title}<span className="gn-chevron">⌄</span></span><span className="gn-control">{control}</span></div>{children}</article>;
}

function Sparkline({ color }: { color: string }) { return <svg viewBox="0 0 300 64" preserveAspectRatio="none"><path d="M0 49 C20 46 24 28 44 35 S72 43 88 30 S116 39 134 26 S164 37 180 21 S218 29 236 16 S274 22 300 6" fill="none" stroke={color} strokeWidth="2" /></svg>; }
function Bars({ color }: { color: string }) { return <div className="gn-bars">{[32,48,27,56,38,45,60,34,52,42,64,49,58,69,54,72,62,77].map((h, i) => <i key={i} style={{ height: `${h}%`, background: color }} />)}</div>; }
function SignalBar() { return <><div className="gn-signal"><i /><i /><i /><i /><span /></div><div className="gn-signal-labels"><small>REFUSE</small><small>NEUTRAL</small><small>READY</small></div></>; }
function PriceLine() { return <svg viewBox="0 0 500 130" preserveAspectRatio="none"><path d="M0 108 C45 94 62 106 90 87 S135 96 164 74 S210 82 244 63 S285 76 318 45 S365 61 392 37 S444 49 500 18" fill="none" stroke="#4ade80" strokeWidth="2" /><path d="M0 124H500" stroke="#27272a" /></svg>; }
function StateArea() { return <svg viewBox="0 0 500 100" preserveAspectRatio="none"><path d="M0 78 C55 74 68 60 114 65 S178 51 225 58 S286 36 332 42 S405 20 500 24 V100 H0Z" fill="#2563eb" opacity=".18" /><path d="M0 78 C55 74 68 60 114 65 S178 51 225 58 S286 36 332 42 S405 20 500 24" fill="none" stroke="#60a5fa" strokeWidth="2" /></svg>; }
