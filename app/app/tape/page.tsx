"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard-layout";

/**
 * The tape is a log, not a fixture.
 *
 * Rows come from two files and the page says which: the verifier's own output,
 * and the reads this desk appended. Where the same mint appears twice, the
 * difference between the two reads is shown — that is the only reason to keep a
 * tape at all.
 */

type Rec = {
  ts: number;
  symbol: string | null;
  mint: string;
  slot: number;
  epoch: number | null;
  source: string;
  fee_in_force_bps: number | null;
  fee_pending_bps: number | null;
  fee_pending_epoch: number | null;
  withheld_amount: string | null;
  origin: string;
};

const when = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 19).replace("T", " ") + "Z";

const num = (v: string | null) => (v === null ? "—" : Number(v).toLocaleString("en-US"));

export default function TapePage() {
  const [rows, setRows] = useState<Rec[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [holding, setHolding] = useState("all");
  const [order, setOrder] = useState<"newest" | "biggest">("newest");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch("/api/tape", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `the tape returned ${r.status}`);
      // Reads made at the desk in this browser are held here as well, because the
      // deployed host cannot be written to. They are marked so a row's origin is
      // never in doubt.
      let local: Rec[] = [];
      try {
        local = JSON.parse(window.localStorage.getItem("manifest:tape") ?? "[]") as Rec[];
      } catch {
        local = [];
      }
      const seen = new Set<string>();
      const merged = [...local, ...((j.records ?? []) as Rec[])].filter((x) => {
        const k = `${x.ts}:${x.mint}:${x.slot}:${x.withheld_amount ?? ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setRows(merged);
    } catch (e) {
      setErr((e as Error).message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const holdings = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.symbol ?? r.mint.slice(0, 6)))].sort(),
    [rows]
  );

  const shown = useMemo(() => {
    const list = (rows ?? []).filter((r) => holding === "all" || (r.symbol ?? r.mint.slice(0, 6)) === holding);
    return order === "newest"
      ? [...list].sort((a, b) => b.ts - a.ts)
      : [...list].sort(
          (a, b) =>
            (b.withheld_amount ? Number(b.withheld_amount) : 0) -
            (a.withheld_amount ? Number(a.withheld_amount) : 0)
        );
  }, [rows, holding, order]);

  /** mints read more than once, and what moved between the first and last read */
  const changes = useMemo(() => {
    const byMint = new Map<string, Rec[]>();
    for (const r of rows ?? []) {
      const k = r.symbol ?? r.mint;
      byMint.set(k, [...(byMint.get(k) ?? []), r]);
    }
    const delta = (a: number | null, b: number | null) => (a === b ? null : `${a ?? "—"} → ${b ?? "—"}`);
    return [...byMint.entries()]
      .filter(([, list]) => list.length > 1)
      .map(([label, list]) => {
        const sorted = [...list].sort((a, b) => a.ts - b.ts);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        return {
          label,
          reads: list.length,
          slotFrom: first.slot,
          slotTo: last.slot,
          fields: [
            { k: "fee in force", v: delta(first.fee_in_force_bps, last.fee_in_force_bps) },
            { k: "announced", v: delta(first.fee_pending_bps, last.fee_pending_bps) },
            { k: "announced at epoch", v: delta(first.fee_pending_epoch, last.fee_pending_epoch) },
            {
              k: "withheld",
              v: delta(
                first.withheld_amount ? Number(first.withheld_amount) : null,
                last.withheld_amount ? Number(last.withheld_amount) : null
              ),
            },
          ].filter((f) => f.v),
        };
      })
      .filter((c) => c.fields.length > 0);
  }, [rows]);

  const COLS = "140px 150px 100px 120px 130px 150px";

  return (
    <DashboardLayout active="tape">
      <div style={{ marginBottom: 20 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Tape</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>Reading tape</h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", marginTop: 8 }}>
          append-only · newest first · every read at the desk appends one line
        </p>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="label-mono" style={{ fontSize: 10 }}>Holding</span>
          <select
            value={holding}
            onChange={(e) => setHolding(e.target.value)}
            className="mono"
            style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #dedfe1", borderRadius: 2, background: "#fff" }}
          >
            <option value="all">all</option>
            {holdings.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="label-mono" style={{ fontSize: 10 }}>Order</span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as "newest" | "biggest")}
            className="mono"
            style={{ fontSize: 12, padding: "5px 8px", border: "1px solid #dedfe1", borderRadius: 2, background: "#fff" }}
          >
            <option value="newest">newest first</option>
            <option value="biggest">biggest withheld</option>
          </select>
        </label>
        <button
          onClick={() => void load()}
          className="mono"
          style={{ fontSize: 11, padding: "5px 12px", borderRadius: 2, border: "1px solid #dedfe1", background: "#fff", cursor: "pointer", marginLeft: "auto" }}
        >
          refresh
        </button>
        {rows && (
          <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
            {shown.length} of {rows.length} reads
          </span>
        )}
      </div>

      {err && (
        <div className="state-card state-error" style={{ marginBottom: 16 }}>
          <p className="mono" style={{ fontSize: 12, color: "var(--color-refuse)", margin: 0 }}>{err}</p>
        </div>
      )}

      {rows === null && (
        <div className="state-card">
          <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: 0 }}>reading the tape…</p>
        </div>
      )}

      {/* what moved between two reads of the same mint */}
      {changes.length > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div className="label-mono" style={{ fontSize: 10, marginBottom: 12 }}>What changed between reads</div>
          <div style={{ display: "grid", gap: 12 }}>
            {changes.map((c) => (
              <div key={c.label} style={{ display: "grid", gap: 4 }}>
                <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                  {c.label}
                  <span style={{ color: "var(--color-graphite)", fontWeight: 400 }}>
                    {" "}{c.reads} reads · slot {c.slotFrom} → {c.slotTo}
                  </span>
                </div>
                {c.fields.map((f) => (
                  <div key={f.k} className="mono" style={{ fontSize: 11, color: "#8a5a00", paddingLeft: 12 }}>
                    {f.k}: {f.v}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="state-card">
          <p className="mono" style={{ fontSize: 13, color: "var(--color-graphite)", margin: 0 }}>
            No reads recorded yet. Make one at the desk and it lands here.
          </p>
        </div>
      )}

      {shown.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <div style={{ padding: "0 18px" }}>
            <div
              className="label-mono"
              style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, fontSize: 10, padding: "12px 0", borderBottom: "1px solid var(--color-hairline)" }}
            >
              <span>Holding</span>
              <span>Read at</span>
              <span>Fee in force</span>
              <span>Announced</span>
              <span>Withheld</span>
              <span>Written by</span>
            </div>
            {shown.map((r, i) => (
              <div
                key={`${r.mint}-${r.slot}-${r.ts}-${i}`}
                style={{
                  display: "grid", gridTemplateColumns: COLS, gap: 12, alignItems: "baseline",
                  padding: "10px 0", borderBottom: "1px solid var(--color-cloud)", fontSize: 12,
                }}
              >
                <span className="mono" style={{ fontWeight: 500 }}>
                  <Link href={`/mint/${r.mint}`} style={{ color: "var(--color-onyx)" }}>
                    {r.symbol ?? r.mint.slice(0, 6)}
                  </Link>
                </span>
                <span className="mono" style={{ color: "var(--color-graphite)" }}>{when(r.ts)}</span>
                <span className="mono">{r.fee_in_force_bps ?? 0} bps</span>
                <span className="mono" style={{ color: r.fee_pending_bps ? "#8a5a00" : "var(--color-graphite)" }}>
                  {r.fee_pending_bps ? `${r.fee_pending_bps} bps @ ${r.fee_pending_epoch ?? "—"}` : "nothing"}
                </span>
                <span className="mono" style={{ color: "var(--color-graphite)" }}>{num(r.withheld_amount)}</span>
                <span className="mono" style={{ color: "var(--color-graphite)", fontSize: 10 }}>
                  {r.origin}
                  <span style={{ opacity: 0.7 }}> · {r.source}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <details style={{ marginTop: 16 }}>
        <summary className="label-mono" style={{ fontSize: 10, cursor: "pointer" }}>Where these lines come from</summary>
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--color-graphite)", maxWidth: "70ch" }}>
          The verifier program appends one line per read it performs, and the desk appends one per read made here. Both
          carry the slot they were taken at. A serverless instance cannot write into its own bundle, so desk reads are
          held in a temporary file for the life of that instance; the verifier owns the durable record.
        </p>
      </details>
    </DashboardLayout>
  );
}
