"use client";

import { useEffect, useRef, useState } from "react";
import type { RegistryEntry } from "@/lib/registry";

type Verdict = {
  verdict: "ACCEPT" | "REFUSE";
  check_id: string | null;
  live: { mint_card: any };
  slot: number;
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

  const entry = entries.find((e) => e.mint === mint);

  const auto = useRef(false);
  useEffect(() => {
    if (auto.current) return;
    auto.current = true;
    evaluate();
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

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: 32 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Plans</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>Plan builder</h1>
        <p className="body-text" style={{ marginTop: 8 }}>
          Set the seven inputs the guard evaluates. Preflight runs against live mainnet state at request time.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div className="card" style={{ padding: 28 }}>
          <div className="form-grid">
            <Field label="Mint">
              <select className="fs" value={mint} onChange={(e) => setMint(e.target.value)}>
                {entries.map((e) => (
                  <option key={e.mint} value={e.mint}>{e.symbol} · {e.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Multiplier snapshot"><input className="fi" value={snapshot} onChange={(e) => setSnapshot(e.target.value)} /></Field>
            <Field label="Route cost (bps)"><input type="number" className="fi" value={routeBps} onChange={(e) => setRouteBps(+e.target.value)} /></Field>
            <Field label="Exit bound (bps)"><input type="number" className="fi" value={exitBps} onChange={(e) => setExitBps(+e.target.value)} /></Field>
            <Field label="Requested size"><input type="number" className="fi" value={size} onChange={(e) => setSize(+e.target.value)} /></Field>
            <Field label="Per-trade cap"><input type="number" className="fi" value={cap} onChange={(e) => setCap(+e.target.value)} /></Field>
            <Field label="Ref age (s)"><input type="number" className="fi" value={refAge} onChange={(e) => setRefAge(+e.target.value)} /></Field>
            <Field label="Max ref age (s)"><input type="number" className="fi" value={maxAge} onChange={(e) => setMaxAge(+e.target.value)} /></Field>
          </div>

          <button
            onClick={evaluate}
            disabled={busy}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 24, padding: "12px", fontSize: 15 }}
          >
            {busy ? "Evaluating on mainnet..." : "Run preflight"}
          </button>

          {err && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255, 77, 77, 0.06)", borderRadius: 8, fontSize: 13, color: "var(--color-refuse)" }}>
              {err}
            </div>
          )}
        </div>

        <div>
          {!verdict ? (
            <div className="card" style={{ padding: 28, minHeight: 300, display: "grid", placeItems: "center" }}>
              <div style={{ textAlign: "center", color: "var(--color-graphite)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>◌</div>
                <p style={{ fontSize: 14 }}>Verdict will appear here after evaluation</p>
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
                <div style={{ display: "grid", gap: 8 }}>
                  {[
                    ["Symbol", verdict.live?.mint_card?.symbol],
                    ["Multiplier", verdict.live?.mint_card?.multiplier],
                    ["Next multiplier", verdict.live?.mint_card?.next_multiplier],
                    ["Paused", String(verdict.live?.mint_card?.paused ?? "-")],
                    ["Delegate", verdict.live?.mint_card?.permanent_delegate],
                    ["Transfer hook", verdict.live?.mint_card?.transfer_hook_program ?? "null"],
                  ].map(([k, v]) => (
                    <div key={k as string} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 8, fontSize: 13 }}>
                      <span className="label-mono" style={{ fontSize: 10 }}>{k}</span>
                      <span className="mono" style={{ wordBreak: "break-all" }}>{v ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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