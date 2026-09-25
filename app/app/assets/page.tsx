"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import PriceChart from "@/components/price-chart";

type Asset = {
  mint: string;
  symbol: string | null;
  name: string | null;
  readable: boolean;
  supported: boolean;
  decimals: number | null;
  supply: string | null;
  is_token_2022: boolean;
  fee_in_force_bps: number | null;
  fee_effective_epoch: string | null;
  fee_pending_bps: number | null;
  fee_pending_epoch: string | null;
  maximum_fee: string | null;
  withheld_amount: string | null;
  paused: boolean | null;
  permanent_delegate: string | null;
  transfer_hook_program: string | null;
  slot: number | null;
  price: { usd_price: number | null; liquidity: number | null; equity_price: number | null } | null;
  error?: string;
};

const short = (s: string, n = 5) => (s.length > n * 2 + 3 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);
const n = (v: any, dp = 4) =>
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

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/assets", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error ?? `discovery returned ${r.status}`);
        setAssets(j.assets as Asset[]);
        setMeta(j);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  return (
    <AppShell active="assets">
      <div style={{ marginBottom: 24 }}>
        <div className="label-mono" style={{ color: "var(--color-brand-blue)", marginBottom: 8 }}>
          Assets
        </div>
        <h1 className="heading-sm" style={{ margin: 0 }}>
          Every mint this can price, and what it costs to leave each one
        </h1>
        {meta && (
          <p className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", margin: "8px 0 0" }}>
            {meta.supported_count} of {meta.count} analysable · discovered from{" "}
            <a href={meta.discovered_from?.url} target="_blank" rel="noreferrer" style={{ color: "var(--color-brand-blue)" }}>
              {meta.discovered_from?.host}
            </a>{" "}
            at {meta.discovered_from?.at?.slice(11, 19)}Z
            {meta.errors?.shelf ? ` · listing error: ${meta.errors.shelf}` : ""}
          </p>
        )}
      </div>

      {err && (
        <div className="state-card state-error">
          <div className="state-title">Discovery failed</div>
          <p className="mono" style={{ fontSize: 12, margin: 0 }}>{err}</p>
          <p className="mono" style={{ fontSize: 11, margin: "6px 0 0", color: "var(--color-graphite)" }}>
            Nothing has been substituted for the missing list.
          </p>
        </div>
      )}

      {!assets && !err && (
        <div className="state-card">
          <div className="state-title">Reading</div>
          <p className="mono" style={{ fontSize: 12, margin: 0, color: "var(--color-graphite)" }}>
            the issuer listing, then each mint on the chain
          </p>
        </div>
      )}

      {assets && (
        <table className="dtable">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Mint</th>
              <th>Program</th>
              <th style={{ textAlign: "right" }}>Price</th>
              <th style={{ textAlign: "right" }}>Fee in force</th>
              <th style={{ textAlign: "right" }}>Scheduled</th>
              <th>Analysable</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <Fragment key={a.mint}>
                <tr>
                  <td>
                    <button
                      onClick={() => setOpenFor(openFor === a.mint ? null : a.mint)}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
                    >
                      {a.symbol ?? a.name ?? short(a.mint, 4)}
                    </button>
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    <Link href={`/analyze?mint=${a.mint}`}>{short(a.mint, 5)}</Link>
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {a.readable === false ? "unreadable" : a.is_token_2022 ? "token-2022" : "spl-token"}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {a.price?.usd_price != null ? `$${a.price.usd_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {a.fee_in_force_bps != null ? `${a.fee_in_force_bps} bps` : "—"}
                  </td>
                  <td className="mono" style={{ textAlign: "right", color: a.fee_pending_bps != null ? "#8a5a00" : undefined }}>
                    {a.fee_pending_bps != null ? `${a.fee_pending_bps} bps @ ${a.fee_pending_epoch}` : "none"}
                  </td>
                  <td>
                    {a.supported ? (
                      <span style={{ color: "#16794c" }}>yes</span>
                    ) : (
                      <span style={{ color: "var(--color-graphite)" }}>
                        {a.readable === false ? `no · ${String(a.error).slice(0, 28)}` : "not a fee mint"}
                      </span>
                    )}
                  </td>
                </tr>
                {openFor === a.mint && (
                  <tr>
                    <td colSpan={7} style={{ background: "var(--color-cloud)", padding: "14px 12px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
                        <div>
                          <table className="dtable">
                            <tbody>
                              <tr><td>Decimals</td><td className="mono">{a.decimals ?? "—"}</td></tr>
                              <tr><td>Supply</td><td className="mono">{big(a.supply)}</td></tr>
                              <tr><td>Max fee</td><td className="mono">{a.maximum_fee ? big(a.maximum_fee) : "—"}</td></tr>
                              <tr><td>Withheld on the mint</td><td className="mono">{a.withheld_amount ? big(a.withheld_amount) : "—"}</td></tr>
                              <tr><td>Paused</td><td className="mono">{String(a.paused ?? "—")}</td></tr>
                              <tr><td>Permanent delegate</td><td className="mono">{a.permanent_delegate ? short(a.permanent_delegate) : "none"}</td></tr>
                              <tr><td>Transfer hook</td><td className="mono">{a.transfer_hook_program ? short(a.transfer_hook_program) : "none"}</td></tr>
                              <tr><td>Read at slot</td><td className="mono">{a.slot ?? "—"}</td></tr>
                            </tbody>
                          </table>
                          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                            <Link href={`/analyze?mint=${a.mint}`} className="src-btn" style={{ textDecoration: "none" }}>
                              full state
                            </Link>
                            <Link href={`/settle?mint=${a.mint}`} className="src-btn" style={{ textDecoration: "none" }}>
                              price a settlement
                            </Link>
                            <a
                              href={`https://explorer.solana.com/address/${a.mint}`}
                              target="_blank"
                              rel="noreferrer"
                              className="src-btn"
                              style={{ textDecoration: "none" }}
                            >
                              explorer
                            </a>
                          </div>
                        </div>
                        <PriceChart mint={a.mint} height={120} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
