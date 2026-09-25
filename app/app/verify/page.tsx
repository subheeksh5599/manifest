"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";

/**
 * The check runner.
 *
 * Every row is evaluated against real chain state by the request this page
 * makes, and each case declares what it must return. A case that refuses when
 * it should have routed shows as UNEXPECTED rather than as a data point, which
 * is what makes this a test run and not a table.
 */

type Case = {
  id: string;
  what: string;
  mint: string;
  size: string;
  network: string;
  verdict: string;
  expect?: "ROUTE" | "REFUSE" | null;
  as_expected?: boolean | null;
  ms?: number;
  refusal?: string | null;
  failed_check?: string | null;
  tripped?: { check: string; value: unknown; detail: unknown } | null;
  landing?: { quoted_out: string; schedule_bps: number; withheld: string; lands: string } | null;
  quote_error?: string;
  quote_skipped?: string;
  error?: string;
};

type Run = {
  evaluated_at: string;
  chain_epoch: number | null;
  cases: Case[];
  refusals: number;
  distinct_refusals: string[];
  checked: number;
  met: number;
  all_as_expected: boolean;
  total_ms: number;
  ablation: {
    error?: string;
    evaluated_at_epoch?: number;
    in_force_now?: number;
    older?: { bps: number; epoch: number };
    newer?: { bps: number; epoch: number };
    with_the_epoch_read?: { bps: number; lands: string };
    with_the_epoch_read_removed?: { bps: number; lands: string };
    the_read_is_worth?: string;
  } | null;
};

const TONE = {
  ok: "#15803D",
  warn: "#B45309",
  bad: "#B91C1C",
};

/** The commands behind these rows, so a row that fails can be chased down. */
const REPRODUCE = [
  { what: "the fee fields, re-derived in Python from the account bytes", cmd: "python3 scripts/verify_receipts.py --check" },
  { what: "the schedule in force, at every epoch boundary", cmd: "node --test app/lib/exit-terms.test.mjs" },
  { what: "landing, the six checks, and the ablation", cmd: "node --test app/lib/exit-engine.test.mjs" },
  { what: "the reading program, including a walk over a real mint", cmd: "cargo test --manifest-path programs/exit_terms/Cargo.toml --lib" },
  { what: "the whole matrix, from the command line", cmd: "curl -s localhost:3000/api/verify | python3 -m json.tool" },
];

export default function VerifyPage() {
  const [data, setData] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/verify", { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error || `the run returned ${r.status}`);
      setData(body as Run);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const cases = data?.cases ?? [];

  return (
    <DashboardLayout active="verify">
      <div style={{ marginBottom: 20 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Checks</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>Run the checks</h1>
      </div>

      {/* ── the run bar ──────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => void run()}
            disabled={loading}
            className="mono"
            style={{
              fontSize: 12, padding: "8px 16px", borderRadius: 2,
              cursor: loading ? "wait" : "pointer", border: "none",
              background: loading ? "#6b7280" : "#000", color: "#fff", fontWeight: 600,
            }}
          >
            {loading ? "running…" : "Run again"}
          </button>

          {data && (
            <span className="mono" style={{ fontSize: 12 }}>
              <strong style={{ color: data.all_as_expected ? TONE.ok : TONE.bad }}>
                {data.met} of {data.checked}
              </strong>
              <span style={{ color: "var(--color-graphite)" }}>
                {" "}cases returned what they declare · {data.refusals} refusals ·{" "}
                {(data.total_ms / 1000).toFixed(1)}s · {data.distinct_refusals.length} distinct reasons
              </span>
            </span>
          )}
          {data && (
            <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", marginLeft: "auto" }}>
              taken {data.evaluated_at.replace("T", " ").slice(0, 19)}Z · chain epoch {data.chain_epoch}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="state-card state-error" style={{ marginBottom: 16 }}>
          <div className="label-mono" style={{ fontSize: 10, color: TONE.bad, marginBottom: 6 }}>Run failed</div>
          <p className="mono" style={{ fontSize: 12, color: TONE.bad, margin: 0, wordBreak: "break-all" }}>{error}</p>
          <button
            onClick={() => void run()}
            style={{ marginTop: 10, padding: "6px 12px", fontSize: 11, border: "1px solid #dedfe1", background: "#fff", borderRadius: 2, cursor: "pointer" }}
          >
            try again
          </button>
        </div>
      )}

      {!data && loading && (
        <div className="state-card">
          <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: 0 }}>
            reading the chain and evaluating each case…
          </p>
        </div>
      )}

      {/* ── the results grid ─────────────────────────────────────────────── */}
      {cases.length > 0 && (
        <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
          {cases.map((c, i) => {
            const met = c.as_expected;
            const chip = met === null ? "informational" : met ? "as declared" : "UNEXPECTED";
            const tone = met === null ? "var(--color-graphite)" : met ? TONE.ok : TONE.bad;
            const isOpen = open === c.id;
            return (
              <div key={c.id} style={{ borderBottom: i < cases.length - 1 ? "1px solid var(--color-ash)" : "none" }}>
                <button
                  onClick={() => setOpen(isOpen ? null : c.id)}
                  style={{
                    display: "grid", width: "100%", textAlign: "left", fontFamily: "inherit",
                    gridTemplateColumns: "12px 170px minmax(0,1fr) 120px 62px", gap: 12,
                    alignItems: "baseline", padding: "13px 20px",
                    background: isOpen ? "rgba(20,95,228,0.04)" : "transparent",
                    border: "none", cursor: "pointer",
                  }}
                >
                  <span style={{ color: tone }}>{met === null ? "·" : met ? "✓" : "✕"}</span>
                  <code className="mono" style={{ fontSize: 12, color: "var(--color-onyx)" }}>{c.id}</code>
                  <span style={{ fontSize: 13, color: "var(--color-onyx)" }}>{c.what}</span>
                  <span className="mono" style={{ fontSize: 11, color: tone }}>{chip}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", textAlign: "right" }}>{c.ms ?? "—"} ms</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 20px 16px 54px", display: "grid", gap: 5 }}>
                    <div className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", wordBreak: "break-all" }}>
                      {c.mint} · size {Number(c.size).toLocaleString("en-US")} · {c.network}
                      {c.expect ? ` · must ${c.expect}` : " · no declared outcome"}
                    </div>
                    <div className="mono" style={{ fontSize: 12 }}>
                      verdict <strong style={{ color: c.verdict === "ROUTE" ? TONE.ok : c.verdict === "ERROR" ? TONE.bad : TONE.warn }}>{c.verdict}</strong>
                      {c.refusal ? <span style={{ color: TONE.warn }}> · refused for {c.refusal}</span> : null}
                    </div>
                    {c.tripped && (
                      <div className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
                        {c.tripped.check} saw {JSON.stringify(c.tripped.value)}
                        {c.tripped.detail ? ` against ${JSON.stringify(c.tripped.detail)}` : ""}
                      </div>
                    )}
                    {c.landing && (
                      <div className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
                        quoted {Number(c.landing.quoted_out).toLocaleString("en-US")} · {c.landing.schedule_bps} bps · withheld{" "}
                        {Number(c.landing.withheld).toLocaleString("en-US")} · lands {Number(c.landing.lands).toLocaleString("en-US")}
                      </div>
                    )}
                    {(c.quote_error || c.quote_skipped || c.error) && (
                      <div className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
                        {c.quote_error ?? c.quote_skipped ?? c.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── the ablation, which is the whole argument in two lines ───────── */}
      {data?.ablation?.with_the_epoch_read && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="label-mono" style={{ fontSize: 10, marginBottom: 10 }}>
            The same exit, priced past the announced change
          </div>
          <div className="mono" style={{ fontSize: 12, display: "grid", gap: 5 }}>
            <div>
              with the epoch read <strong>{data.ablation.with_the_epoch_read.bps} bps</strong> → lands{" "}
              {Number(data.ablation.with_the_epoch_read.lands).toLocaleString("en-US")}
            </div>
            <div>
              with it removed <strong>{data.ablation.with_the_epoch_read_removed?.bps} bps</strong> → lands{" "}
              {Number(data.ablation.with_the_epoch_read_removed?.lands ?? 0).toLocaleString("en-US")}
            </div>
            <div style={{ color: "var(--color-brand-blue)" }}>
              the read is worth {Number(data.ablation.the_read_is_worth).toLocaleString("en-US")} micro-units on this exit
            </div>
          </div>
        </div>
      )}

      {/* ── the rows are reproduced by these, on a fresh clone ───────────── */}
      <details className="card" style={{ padding: 20 }}>
        <summary className="label-mono" style={{ fontSize: 10, cursor: "pointer" }}>
          Reproduce any of this without the site
        </summary>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {REPRODUCE.map((r) => (
            <div key={r.cmd} style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--color-graphite)" }}>{r.what}</span>
              <code className="mono" style={{ fontSize: 11, background: "#F8F8FA", padding: "5px 8px", borderRadius: 2, wordBreak: "break-all" }}>
                {r.cmd}
              </code>
            </div>
          ))}
        </div>
      </details>
    </DashboardLayout>
  );
}
