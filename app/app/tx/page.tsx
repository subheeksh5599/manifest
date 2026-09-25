"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";

const SIG = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;
const short = (s: string, n = 8) => (s.length > n * 2 + 3 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

type Tx = {
  ok: boolean;
  signature: string;
  slot: number | null;
  block_time: number | null;
  failed: boolean;
  fee_lamports: number | null;
  movements: Array<{ mint: string; owner: string | null; delta_raw: string; decimals: number | null; pre_ui: string | null; post_ui: string | null }>;
  mints: Array<{
    mint: string;
    readable: boolean;
    is_token_2022: boolean;
    decimals: number | null;
    symbol: string | null;
    fee_in_force_bps: number | null;
    fee_pending_bps: number | null;
    derived_withheld_on_largest_move: string | null;
    error?: string;
  }>;
  touches_token_2022: boolean;
  programs: string[];
  note: string;
  error?: string;
  stage?: string;
};

type Rec = {
  ts: number;
  symbol: string | null;
  mint: string;
  slot: number;
  fee_in_force_bps: number | null;
  fee_pending_bps: number | null;
  origin: string;
};

const when = (ts: number | null) =>
  ts === null ? "—" : new Date(ts * 1000).toISOString().slice(0, 19).replace("T", " ") + "Z";

export default function TxPage() {
  const [input, setInput] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [d, setD] = useState<Tx | null>(null);
  const [err, setErr] = useState<{ message: string; stage?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Rec[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/tape", { cache: "no-store" });
        const j = await r.json();
        let local: Rec[] = [];
        try {
          local = JSON.parse(window.localStorage.getItem("manifest:tape") ?? "[]") as Rec[];
        } catch {
          local = [];
        }
        setRows([...local, ...((j.records ?? []) as Rec[])]);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  const look = useCallback(async (s: string) => {
    setBusy(true);
    setErr(null);
    setD(null);
    try {
      const r = await fetch(`/api/tx?signature=${encodeURIComponent(s)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setErr({ message: j.error ?? `the lookup returned ${r.status}`, stage: j.stage });
        return;
      }
      setD(j as Tx);
    } catch (e) {
      setErr({ message: (e as Error).message, stage: "network" });
    } finally {
      setBusy(false);
    }
  }, []);

  // A signature can arrive in the URL, so a proof link can carry one straight in.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("signature");
    if (q && SIG.test(q)) {
      setInput(q);
      setSig(q);
      void look(q);
    }
  }, [look]);

  return (
    <AppShell active="tx">
      <div style={{ marginBottom: 22 }}>
        <div className="label-mono" style={{ color: "var(--color-brand-blue)", marginBottom: 8 }}>
          Transactions
        </div>
        <h1 className="heading-sm" style={{ margin: 0 }}>
          Paste any transaction
        </h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: "8px 0 0", maxWidth: 640 }}>
          A signature is reconstructed from the cluster&apos;s own before and after token balances, so
          anyone can take a transaction from an explorer and check it here.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const s = input.trim();
          if (!SIG.test(s)) {
            setErr({ message: "that is not a transaction signature", stage: "input" });
            return;
          }
          setSig(s);
          void look(s);
        }}
        style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="transaction signature"
          className="mono"
          style={{ flex: "1 1 360px", minWidth: 280, fontSize: 13, padding: "8px 10px", border: "1px solid var(--color-hairline)", borderRadius: 2 }}
          aria-label="transaction signature"
        />
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Reading" : "Analyze"}
        </button>
      </form>

      {err && (
        <div className="state-card state-error">
          <div className="state-title">
            {err.stage === "lookup"
              ? "Not found"
              : err.stage === "getTransaction"
                ? "RPC request failed"
                : err.stage === "input"
                  ? "Input rejected"
                  : "Cannot read this transaction"}
          </div>
          <p className="mono" style={{ fontSize: 12, margin: 0 }}>{err.message}</p>
        </div>
      )}

      {d && (
        <div className="card" style={{ padding: 20, marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span
              className="mono"
              style={{ fontSize: 12, fontWeight: 700, color: d.failed ? "var(--color-refuse)" : "#16794c" }}
            >
              {d.failed ? "FAILED ON CHAIN" : "FINALIZED"}
            </span>
            <code className="mono" style={{ fontSize: 11 }}>{short(d.signature, 10)}</code>
            <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
              slot {d.slot ?? "—"} · {when(d.block_time)}
            </span>
            <a
              className="src-btn"
              href={`https://explorer.solana.com/tx/${d.signature}`}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: "auto", textDecoration: "none" }}
            >
              explorer
            </a>
          </div>

          <table className="dtable" style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>Mint</th>
                <th>Owner</th>
                <th style={{ textAlign: "right" }}>Before</th>
                <th style={{ textAlign: "right" }}>After</th>
                <th style={{ textAlign: "right" }}>Delta</th>
              </tr>
            </thead>
            <tbody>
              {d.movements.map((m, i) => (
                <tr key={`${m.mint}-${i}`}>
                  <td className="mono" style={{ fontSize: 11 }}>
                    <Link href={`/analyze?mint=${m.mint}`}>{short(m.mint, 6)}</Link>
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>{m.owner ? short(m.owner, 5) : "—"}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{m.pre_ui ?? "0"}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{m.post_ui ?? "0"}</td>
                  <td
                    className="mono"
                    style={{ textAlign: "right", color: BigInt(m.delta_raw) < 0n ? "var(--color-refuse)" : "#16794c" }}
                  >
                    {BigInt(m.delta_raw) < 0n ? "" : "+"}
                    {m.delta_raw}
                  </td>
                </tr>
              ))}
              {d.movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="mono" style={{ fontSize: 12, color: "var(--color-graphite)" }}>
                    no token balance moved in this transaction
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {d.mints.length > 0 && (
            <>
              <div className="label-mono" style={{ fontSize: 10, margin: "16px 0 8px" }}>
                Mints involved, and their current schedules
              </div>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Mint</th>
                    <th>Token-2022</th>
                    <th style={{ textAlign: "right" }}>Fee now</th>
                    <th style={{ textAlign: "right" }}>Next</th>
                    <th style={{ textAlign: "right" }}>Withheld implied</th>
                  </tr>
                </thead>
                <tbody>
                  {d.mints.map((m) => (
                    <tr key={m.mint}>
                      <td className="mono" style={{ fontSize: 11 }}>
                        <Link href={`/analyze?mint=${m.mint}`}>{m.symbol ?? short(m.mint, 6)}</Link>
                      </td>
                      <td className="mono">{m.readable ? String(m.is_token_2022) : "unreadable"}</td>
                      <td className="mono" style={{ textAlign: "right" }}>{m.fee_in_force_bps ?? "—"}</td>
                      <td className="mono" style={{ textAlign: "right", color: m.fee_pending_bps != null ? "#8a5a00" : undefined }}>
                        {m.fee_pending_bps ?? "none"}
                      </td>
                      <td className="mono" style={{ textAlign: "right" }}>
                        {m.derived_withheld_on_largest_move ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="mono" style={{ fontSize: 10, color: "var(--color-graphite)", marginTop: 12, display: "grid", gap: 3 }}>
            <div>{d.note}</div>
            <div>token-2022 invoked: {String(d.touches_token_2022)} · programs: {d.programs.length}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 18 }}>
        <div className="label-mono" style={{ fontSize: 10, marginBottom: 10 }}>
          Reads made at the desk
        </div>
        {!rows && <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: 0 }}>reading</p>}
        {rows?.length === 0 && (
          <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: 0 }}>
            no reads recorded yet
          </p>
        )}
        {rows && rows.length > 0 && (
          <table className="dtable">
            <thead>
              <tr>
                <th>When</th>
                <th>Asset</th>
                <th style={{ textAlign: "right" }}>Fee in force</th>
                <th style={{ textAlign: "right" }}>Scheduled</th>
                <th style={{ textAlign: "right" }}>Slot</th>
                <th>Origin</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map((r, i) => (
                <tr key={`${r.ts}-${i}`}>
                  <td className="mono" style={{ fontSize: 11 }}>{when(r.ts)}</td>
                  <td>
                    <Link href={`/analyze?mint=${r.mint}`}>{r.symbol ?? short(r.mint, 5)}</Link>
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{r.fee_in_force_bps ?? "—"}</td>
                  <td className="mono" style={{ textAlign: "right", color: r.fee_pending_bps != null ? "#8a5a00" : undefined }}>
                    {r.fee_pending_bps ?? "none"}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{r.slot}</td>
                  <td className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>{r.origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
