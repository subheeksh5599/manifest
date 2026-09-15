"use client";

import { useEffect, useRef, useState } from "react";
import type { RegistryEntry } from "@/lib/registry";

type Verdict = {
  verdict: "ACCEPT" | "REFUSE";
  check_id: string | null;
  live: { mint_card: any };
  slot: number;
};

export default function PlanBuilder({ entries }: { entries: RegistryEntry[] }) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6 grid gap-4">
        <Row label="Mint">
          <select className="border hair rounded px-2 py-1 mono text-sm w-full" value={mint} onChange={(e) => setMint(e.target.value)}>
            {entries.map((e) => (
              <option key={e.mint} value={e.mint}>{e.symbol} · {e.name}</option>
            ))}
          </select>
        </Row>
        <Row label="Multiplier snapshot">
          <input className="border hair rounded px-2 py-1 mono text-sm w-full" value={snapshot} onChange={(e) => setSnapshot(e.target.value)} />
        </Row>
        <Row label="Route cost (bps)">
          <input type="number" className="border hair rounded px-2 py-1 mono text-sm w-full" value={routeBps} onChange={(e) => setRouteBps(+e.target.value)} />
        </Row>
        <Row label="Exit bound (bps)">
          <input type="number" className="border hair rounded px-2 py-1 mono text-sm w-full" value={exitBps} onChange={(e) => setExitBps(+e.target.value)} />
        </Row>
        <Row label="Requested size">
          <input type="number" className="border hair rounded px-2 py-1 mono text-sm w-full" value={size} onChange={(e) => setSize(+e.target.value)} />
        </Row>
        <Row label="Per-trade cap">
          <input type="number" className="border hair rounded px-2 py-1 mono text-sm w-full" value={cap} onChange={(e) => setCap(+e.target.value)} />
        </Row>
        <Row label="Ref age (s)">
          <input type="number" className="border hair rounded px-2 py-1 mono text-sm w-full" value={refAge} onChange={(e) => setRefAge(+e.target.value)} />
        </Row>
        <Row label="Max ref age (s)">
          <input type="number" className="border hair rounded px-2 py-1 mono text-sm w-full" value={maxAge} onChange={(e) => setMaxAge(+e.target.value)} />
        </Row>
        <button onClick={evaluate} disabled={busy} className="border hair rounded px-4 py-2 bg-[color:var(--color-ink-950)] text-white text-sm mt-2 disabled:opacity-50">
          {busy ? "reading live state..." : "run preflight against live mainnet state"}
        </button>
        {err && <p className="text-sm text-[color:var(--color-refuse)]">{err}</p>}
      </div>

      <VerdictCard verdict={verdict} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-[color:var(--color-ink-500)] uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function VerdictCard({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) {
    return (
      <div className="card p-6 grid place-content-center min-h-[300px] text-sm text-[color:var(--color-ink-500)]">
        verdict will appear here
      </div>
    );
  }
  const isAccept = verdict.verdict === "ACCEPT";
  const color = isAccept ? "var(--color-accept)" : "var(--color-refuse)";
  const card = verdict.live.mint_card;
  return (
    <div className="card p-6 grid gap-4">
      <div className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">verdict</span>
        <span className="serif text-4xl" style={{ color }}>{verdict.verdict}</span>
        {verdict.check_id && (
          <span className="mono text-sm text-[color:var(--color-ink-700)]">check_id: {verdict.check_id}</span>
        )}
      </div>
      <div className="grid gap-2 pt-2 border-t hair">
        <span className="text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">live mint state (slot {verdict.slot})</span>
        <KV k="symbol" v={card.symbol} />
        <KV k="multiplier" v={card.multiplier} />
        <KV k="next multiplier" v={card.next_multiplier} />
        <KV k="paused" v={String(card.paused)} />
        <KV k="permanent delegate" v={card.permanent_delegate} />
        <KV k="transfer hook program" v={card.transfer_hook_program ?? "none"} />
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline text-sm">
      <span className="text-[color:var(--color-ink-500)]">{k}</span>
      <span className="mono break-all">{v ?? "-"}</span>
    </div>
  );
}
