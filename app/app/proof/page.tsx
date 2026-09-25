"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";

type Case = {
  id: string;
  what: string;
  mint: string;
  size: string;
  network?: string;
  expect: "ROUTE" | "REFUSE" | null;
  verdict: string;
  refusal: string | null;
  failed_check: string | null;
  ms: number;
  as_expected: boolean | null;
  slot: number | null;
  error?: string;
};

/**
 * Proof.
 *
 * The checks are not a description of checks that ran somewhere else. Each case
 * declares what it must return, and the page runs them here, in your browser, and
 * shows what came back — so a case that refused when it should have routed is
 * reported as a failure rather than filed away as a data point.
 */
export default function ProofPage() {
  const [cases, setCases] = useState<Case[] | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");

  const run = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/verify", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? `the runner returned ${r.status}`);
      const s = j.summary ?? j;
      // The runner returns its cases under `cases`. Reading a key that does not
      // exist left the table empty while the page looked like it had run.
      setCases(((s.cases ?? s.results) ?? []) as Case[]);
      setSummary(s);
    } catch (e) {
      setErr((e as Error).message);
      setCases(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const declared = cases?.filter((c) => c.as_expected !== null) ?? [];
  const passed = declared.filter((c) => c.as_expected === true).length;

  return (
    <AppShell active="proof">
      <div style={{ marginBottom: 22 }}>
        <div className="label-mono" style={{ color: "var(--color-brand-blue)", marginBottom: 8 }}>
          Proof
        </div>
        <h1 className="heading-sm" style={{ margin: 0 }}>
          Every claim, run in front of you
        </h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: "8px 0 0", maxWidth: 660 }}>
          The product says a number is right because the mint was read, not because a page said so.
          These cases hold it to that: each one states what it must return before it runs.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={() => void run()} disabled={busy}>
          {busy ? "Running" : "Run the checks"}
        </button>
        {summary && (
          <span className="mono" style={{ fontSize: 12, color: "var(--color-graphite)" }}>
            {passed} of {declared.length} declared cases returned what they declared ·{" "}
            {typeof summary.checked === "number" ? summary.checked : declared.length} checked,{" "}
            {typeof summary.met === "number" ? summary.met : passed} met
            {typeof summary.total_ms === "number" && <> · {summary.total_ms} ms for the lot</>}
            {summary.all_as_expected === true && <span style={{ color: "#16794c" }}> · all as expected</span>}
          </span>
        )}
      </div>

      {err && (
        <div className="state-card state-error">
          <div className="state-title">The runner could not run</div>
          <p className="mono" style={{ fontSize: 12, margin: 0 }}>{err}</p>
        </div>
      )}

      {cases && (
        <table className="dtable" style={{ marginBottom: 26 }}>
          <thead>
            <tr>
              <th>Case</th>
              <th>What it is</th>
              <th>Declared</th>
              <th>Returned</th>
              <th style={{ textAlign: "right" }}>ms</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td className="mono" style={{ fontSize: 11 }}>
                  <Link href={`/analyze?mint=${c.mint}`}>{c.id}</Link>
                </td>
                <td style={{ fontSize: 12 }}>{c.what}</td>
                <td className="mono" style={{ fontSize: 11 }}>{c.expect ?? "—"}</td>
                <td className="mono" style={{ fontSize: 11 }}>
                  {c.verdict}
                  {c.refusal && <span style={{ color: "var(--color-graphite)" }}> · {c.refusal}</span>}
                </td>
                <td className="mono" style={{ textAlign: "right", fontSize: 11 }}>{c.ms}</td>
                <td>
                  {c.as_expected === null ? (
                    <span style={{ color: "var(--color-graphite)" }}>observed</span>
                  ) : c.as_expected ? (
                    <span style={{ color: "#16794c" }}>pass</span>
                  ) : (
                    <span style={{ color: "var(--color-refuse)" }}>fail</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="card" style={{ padding: 20 }}>
        <div className="label-mono" style={{ fontSize: 10, marginBottom: 8 }}>
          Check someone else&apos;s transaction
        </div>
        <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: "0 0 12px" }}>
          If a settlement is claimed here, its signature can be taken to the transactions screen and
          reconstructed from the cluster&apos;s own balances. No account, no permission, and the same
          read for anyone who opens it.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const s = input.trim();
            if (s) window.location.href = `/tx?signature=${encodeURIComponent(s)}`;
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="transaction signature"
            className="mono"
            style={{ flex: "1 1 320px", minWidth: 260, fontSize: 13, padding: "8px 10px", border: "1px solid var(--color-hairline)", borderRadius: 2 }}
            aria-label="transaction signature"
          />
          <button className="src-btn" type="submit" style={{ padding: "8px 12px" }}>
            Open
          </button>
        </form>
      </div>
    </AppShell>
  );
}
