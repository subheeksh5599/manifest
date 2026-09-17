"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RegistryEntry } from "@/lib/registry";

type Verdict = {
  verdict: "ACCEPT" | "REFUSE";
  check_id: string | null;
  live: { mint_card: any };
  slot: number;
};

type PriceInfo = {
  usdPrice: number;
  change24h: number;
  liquidity: number;
};

export default function PlanDashboard({ entries }: { entries: RegistryEntry[] }) {
  const [mint, setMint] = useState(entries[0]?.mint ?? "");
  const [snapshot, setSnapshot] = useState("1");
  const [routeBps, setRouteBps] = useState(30);
  const [exitBps, setExitBps] = useState(100);
  const [size, setSize] = useState(1_000_000);
  const [cap, setCap] = useState(5_000_000);
  const [refAge, setRefAge] = useState(30);
  const [maxAge, setMaxAge] = useState(300);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});

  const entry = entries.find((e) => e.mint === mint);
  const livePrice = prices[mint]?.usdPrice;
  const change24h = prices[mint]?.change24h;
  const estimated = livePrice ? livePrice * (1 - routeBps / 10000) : null;

  // Fetch prices
  useEffect(() => {
    let mounted = true;
    async function fetchPrices() {
      try {
        const r = await fetch("/api/prices");
        const data = await r.json();
        if (!mounted || !data.prices) return;
        const p: Record<string, PriceInfo> = {};
        for (const [m, info] of Object.entries(data.prices)) {
          const i = info as any;
          p[m] = { usdPrice: i.usdPrice || 0, change24h: i.change24h || 0, liquidity: i.liquidity || 0 };
        }
        if (mounted) setPrices(p);
      } catch { /* ignore */ }
    }
    fetchPrices();
    const iv = setInterval(fetchPrices, 60000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const auto = useRef(false);
  useEffect(() => {
    if (auto.current) return;
    auto.current = true;
  }, []);

  async function evaluate() {
    setBusy(true);
    setErr(null);
    setVerdict(null);
    try {
      const body = {
        plan_id: `ui-${Date.now()}`,
        mint,
        expected_symbol: entry?.symbol ?? "",
        multiplier_snapshot: snapshot,
        ref_age_secs: refAge,
        max_ref_age_secs: maxAge,
        route_cost_bps: routeBps,
        exit_bound_bps: exitBps,
        requested_size: size,
        per_trade_cap: cap,
      };
      const r = await fetch("/api/preflight", { method: "POST", body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`preflight failed: ${r.status}`);
      const v = (await r.json()) as Verdict;
      setVerdict(v);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isAccept = verdict?.verdict === "ACCEPT";
  const up = change24h !== undefined && change24h >= 0;

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <h1 className="heading-sm" style={{ margin: 0 }}>Plan builder</h1>
          {livePrice && (
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#000" }}>
              {entry?.symbol} @ ${livePrice.toFixed(2)}
              <span style={{ color: up ? "#2E7D32" : "#E65100", marginLeft: 6 }}>
                {up ? "+" : ""}{(change24h * 100).toFixed(1)}%
              </span>
            </span>
          )}
        </div>
        <p className="body-text" style={{ margin: 0 }}>
          Set the seven inputs the guard evaluates. Mainnet state is read at request time.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Form card */}
        <div className="card" style={{ padding: 28 }}>
          <div className="form-grid">
            <Field label="Mint">
              <select className="fs" value={mint} onChange={(e) => setMint(e.target.value)}>
                {entries.map((e) => (
                  <option key={e.mint} value={e.mint}>{e.symbol} · {e.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Multiplier snap"><input className="fi" value={snapshot} onChange={(e) => setSnapshot(e.target.value)} placeholder="e.g. 1.00000000" /></Field>
            <Field label="Route cost (bps)"><input type="number" className="fi" value={routeBps} onChange={(e) => setRouteBps(+e.target.value)} /></Field>
            <Field label="Exit bound (bps)"><input type="number" className="fi" value={exitBps} onChange={(e) => setExitBps(+e.target.value)} /></Field>
            <Field label="Requested size"><input type="number" className="fi" value={size} onChange={(e) => setSize(+e.target.value)} /></Field>
            <Field label="Per-trade cap"><input type="number" className="fi" value={cap} onChange={(e) => setCap(+e.target.value)} /></Field>
            <Field label="Ref age (s)"><input type="number" className="fi" value={refAge} onChange={(e) => setRefAge(+e.target.value)} /></Field>
            <Field label="Max ref age (s)"><input type="number" className="fi" value={maxAge} onChange={(e) => setMaxAge(+e.target.value)} /></Field>
          </div>

          {/* Price estimate */}
          {livePrice && !isNaN(Number(routeBps)) && Number(routeBps) > 0 && (
            <div style={{
              marginTop: 16, padding: "12px 16px", background: "#F8F8FA",
              borderRadius: 8, fontSize: 13, fontFamily: "JetBrains Mono, monospace",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#666" }}>Spot price</span>
                <span>${livePrice.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#666" }}>Route cost {routeBps} bps →</span>
                <span>${(livePrice * (routeBps / 10000)).toFixed(4)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500 }}>
                <span style={{ color: "#000" }}>Est. fill price</span>
                <span>${estimated!.toFixed(2)}</span>
              </div>
            </div>
          )}

          <button
            onClick={evaluate}
            disabled={busy}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 20, padding: "12px", fontSize: 15 }}
          >
            {busy ? "Evaluating on mainnet..." : "Run preflight"}
          </button>

          {err && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255, 77, 77, 0.06)", borderRadius: 8, fontSize: 13, color: "var(--color-refuse)" }}>
              {err}
            </div>
          )}
        </div>

        {/* Verdict card */}
        <div>
          {!verdict ? (
            <div className="card" style={{ padding: 28, minHeight: 340, display: "grid", placeItems: "center" }}>
              <div style={{ textAlign: "center", color: "var(--color-graphite)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>◌</div>
                <p style={{ fontSize: 14 }}>Run a preflight to check this plan against live state</p>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 28 }}>
              <div className="label-mono" style={{ marginBottom: 12 }}>Verdict</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div className={isAccept ? "v-a" : "v-r"}>{verdict.verdict}</div>
                <span className="mono" style={{ fontSize: 12, color: "var(--color-graphite)" }}>slot {verdict.slot}</span>
              </div>
              {verdict.check_id && (
                <div style={{ marginBottom: 16 }}>
                  <div className="label-mono" style={{ marginBottom: 4 }}>Check triggered</div>
                  <code className="mono" style={{ fontSize: 13, padding: "4px 8px", background: "#F8F8FA", borderRadius: 4 }}>{verdict.check_id}</code>
                </div>
              )}
              <div style={{ borderTop: "1px solid var(--color-ash)", paddingTop: 16, marginTop: 16 }}>
                <div className="label-mono" style={{ marginBottom: 12 }}>Live mint state</div>
                <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                  {[
                    ["Symbol", verdict.live?.mint_card?.symbol],
                    ["Multiplier", verdict.live?.mint_card?.multiplier],
                    ["Paused", String(verdict.live?.mint_card?.paused ?? "-")],
                    ["Delegate", verdict.live?.mint_card?.permanent_delegate?.slice(0, 12) + "..."],
                    ["Transfer hook", verdict.live?.mint_card?.transfer_hook_program || "null"],
                  ].map(([k, v]) => (
                    <div key={k as string} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                      <span className="label-mono" style={{ fontSize: 10 }}>{k}</span>
                      <span className="mono" style={{ wordBreak: "break-all", color: "var(--color-onyx)" }}>{v ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price reference table */}
      {Object.keys(prices).length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="label-mono" style={{ marginBottom: 12 }}>Market prices <span style={{ color: "var(--color-graphite)" }}>— auto-refreshes</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {entries.map((e) => {
                const p = prices[e.mint];
                if (!p) return null;
                return (
                  <div key={e.mint} style={{ padding: "8px 12px", borderRadius: 8, background: "#F8F8FA", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                    <div style={{ fontWeight: 600, color: "#000" }}>{e.symbol}</div>
                    <div style={{ color: "#000" }}>${p.usdPrice.toFixed(2)}</div>
                    <div style={{ color: (p.change24h || 0) >= 0 ? "#2E7D32" : "#E65100" }}>
                      {(p.change24h * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fld">
      <label className="fl">{label}</label>
      {children}
    </div>
  );
}