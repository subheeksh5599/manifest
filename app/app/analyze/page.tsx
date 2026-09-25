"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import PriceChart from "@/components/price-chart";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const short = (s: string, n = 6) => (s.length > n * 2 + 3 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);
const n = (v: any, dp = 0) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: dp });

/** u64 values go through BigInt, because Number(18446744073709551615) is wrong. */
const big = (v: any) => {
  if (v === null || v === undefined) return "—";
  try {
    return BigInt(v).toLocaleString("en-US");
  } catch {
    return String(v);
  }
};

/**
 * Analyze any mint.
 *
 * Paste an address and the mint's own state is read and shown: which program owns
 * it, every extension detected, and the transfer-fee configuration decoded from
 * the account bytes at the offsets the format defines. Nothing here needs the
 * mint to be on a list — a list only decides what gets offered, not what can be
 * read.
 */
export default function AnalyzePage() {
  const [input, setInput] = useState("");
  const [mint, setMint] = useState<string | null>(null);
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<{ message: string; stage?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const look = useCallback(async (m: string) => {
    setBusy(true);
    setErr(null);
    setD(null);
    try {
      const r = await fetch(`/api/settle?mint=${encodeURIComponent(m)}&amount=100000000`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (j.terms) {
        setD(j);
        if (!r.ok) setErr({ message: j.error ?? `read returned ${r.status}`, stage: j.stage });
      } else {
        setErr({ message: j.error ?? `read returned ${r.status}`, stage: j.stage });
      }
    } catch (e) {
      setErr({ message: (e as Error).message, stage: "network" });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("mint");
    if (q && BASE58.test(q)) {
      setInput(q);
      setMint(q);
      void look(q);
    }
  }, [look]);

  const t = d?.terms;

  return (
    <AppShell active="analyze">
      <div style={{ marginBottom: 24 }}>
        <div className="label-mono" style={{ color: "var(--color-brand-blue)", marginBottom: 8 }}>
          Analyze mint
        </div>
        <h1 className="heading-sm" style={{ margin: 0 }}>
          Paste any mint
        </h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!BASE58.test(input.trim())) {
            setErr({ message: "that is not a base58 address", stage: "input" });
            return;
          }
          setMint(input.trim());
          void look(input.trim());
        }}
        style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="mint address"
          className="mono"
          style={{
            flex: "1 1 320px",
            minWidth: 260,
            fontSize: 13,
            padding: "8px 10px",
            border: "1px solid var(--color-hairline)",
            borderRadius: 2,
          }}
          aria-label="mint address"
        />
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Reading" : "Analyze"}
        </button>
      </form>

      {err && (
        <div className="state-card state-error">
          <div className="state-title">
            {err.stage === "mint_read"
              ? "Mint state unreadable"
              : err.stage === "quote"
                ? "No venue route"
                : err.stage === "input"
                  ? "Input rejected"
                  : "Cannot read this mint"}
          </div>
          <p className="mono" style={{ fontSize: 12, margin: 0 }}>{err.message}</p>
          {t && (
            <p className="mono" style={{ fontSize: 11, margin: "6px 0 0", color: "var(--color-graphite)" }}>
              the mint itself still read: {t.is_token_2022 ? "token-2022" : "spl-token"}, decimals{" "}
              {t.decimals ?? "—"} — the failure was downstream of the account read.
            </p>
          )}
        </div>
      )}

      {t && (
        <div style={{ display: "grid", gap: 18 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{t.symbol ?? "unnamed mint"}</span>
              <code className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>{d.mint}</code>
              <span
                className="mono"
                style={{ fontSize: 11, marginLeft: "auto", color: t.is_token_2022 ? "#16794c" : "var(--color-graphite)" }}
              >
                {t.is_token_2022 ? "token-2022" : "spl-token"}
              </span>
              <a className="src-btn" href={`https://explorer.solana.com/address/${d.mint}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                explorer
              </a>
            </div>

            <table className="dtable" style={{ marginTop: 14 }}>
              <tbody>
                <tr><td>Owner program</td><td className="mono" style={{ fontSize: 11 }}>{t.is_token_2022 ? "TokenzQd…PxuEb" : "Tokenkeg…VQ5DA"}</td></tr>
                <tr><td>Decimals</td><td className="mono">{t.decimals ?? "—"}</td></tr>
                <tr><td>Supply</td><td className="mono">{big(t.supply)}</td></tr>
                <tr><td>Mint authority</td><td className="mono" style={{ fontSize: 11 }}>{t.mint_authority ? short(t.mint_authority) : "none"}</td></tr>
                <tr><td>Freeze authority</td><td className="mono" style={{ fontSize: 11 }}>{t.freeze_authority ? short(t.freeze_authority) : "none"}</td></tr>
                <tr><td>Paused</td><td className="mono">{String(t.paused ?? "—")}</td></tr>
                <tr><td>Permanent delegate</td><td className="mono" style={{ fontSize: 11 }}>{t.permanent_delegate ? short(t.permanent_delegate) : "none"}</td></tr>
                <tr><td>Transfer hook</td><td className="mono" style={{ fontSize: 11 }}>{t.transfer_hook_program ? short(t.transfer_hook_program) : "none"}</td></tr>
                <tr><td>Withheld on the mint</td><td className="mono">{t.withheld_amount ? big(t.withheld_amount) : "—"}</td></tr>
                <tr><td>Read at</td><td className="mono">slot {d.slot ?? "—"} · epoch {String(d.epoch ?? "—")}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="label-mono" style={{ fontSize: 10, marginBottom: 4 }}>
              Transfer fee configuration, decoded from the account bytes
            </div>
            <p className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", margin: "0 0 12px" }}>
              bytes [165] = account type 1 (mint) · TLV from 166 · extension type 1 · body 108 bytes ·
              [72:90] older schedule · [90:108] newer schedule
            </p>

            {!t.fee_older && !t.fee_newer && (
              <div className="state-card" style={{ margin: "0 0 12px" }}>
                <div className="state-title">No fee schedule present</div>
                <p className="mono" style={{ fontSize: 12, margin: 0 }}>
                  this mint carries no TransferFeeConfig extension. A zero here would be a claim; there
                  is simply no configuration to read.
                </p>
              </div>
            )}

            <table className="dtable">
              <thead>
                <tr>
                  <th>Schedule</th>
                  <th style={{ textAlign: "right" }}>Basis points</th>
                  <th style={{ textAlign: "right" }}>Maximum fee</th>
                  <th style={{ textAlign: "right" }}>Starts at epoch</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {[["older", t.fee_older], ["newer", t.fee_newer]].map(([label, s]: any) => (
                  <tr key={label}>
                    <td className="mono">{label}TransferFee</td>
                    <td className="mono" style={{ textAlign: "right" }}>{s ? s.bps : "—"}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{s ? big(s.maximum_fee) : "—"}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{s ? String(s.epoch) : "—"}</td>
                    <td>
                      {!s ? (
                        <span style={{ color: "var(--color-ash)" }}>absent</span>
                      ) : String(s.epoch) === String(t.fee_effective?.epoch) ? (
                        <span style={{ color: "#16794c" }}>in force</span>
                      ) : (
                        <span style={{ color: "#8a5a00" }}>announced</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", marginTop: 12, display: "grid", gap: 3 }}>
              <div>reason: {t.fee_schedule_reason ?? "—"}</div>
              {t.fee_pending && (
                <div>
                  the next schedule is announced for epoch {String(t.fee_pending.epoch)}; until that epoch
                  begins the older schedule is the one the runtime applies.
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="label-mono" style={{ fontSize: 10, marginBottom: 10 }}>
              Price of this mint
            </div>
            <PriceChart mint={d.mint} />
            <div style={{ marginTop: 12 }}>
              <Link href={`/settle?mint=${d.mint}`} className="src-btn" style={{ textDecoration: "none" }}>
                price a settlement on this mint
              </Link>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
