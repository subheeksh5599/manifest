"use client";

import { useEffect, useState } from "react";

type Row = {
  mint: string;
  symbol: string;
  name: string;
  issuer: string;
  decimals?: number;
  slot?: number;
  epoch?: string;
  fee_exact?: boolean | null;
  fee_in_force_bps?: number;
  fee_in_force_epoch?: string | null;
  fee_pending_bps?: number | null;
  fee_pending_epoch?: string | null;
  maximum_fee?: string | null;
  paused?: boolean | null;
  hook?: string | null;
  levers?: number;
  keys?: number;
  quote_out?: string | null;
  quote_error?: string | null;
  lands?: string | null;
  withheld?: string | null;
  withheld_after_pending?: string | null;
  route_labels?: string[];
  error?: string | null;
};

type Board = {
  observed: number;
  requested: number;
  issuers: string[];
  by_issuer: {
    issuer: string;
    mints: number;
    fee_bps_min: number;
    fee_bps_max: number;
    keys_min: number;
    keys_max: number;
    any_pending_change: boolean;
  }[];
  rows: Row[];
  error?: string;
};

const n = (v?: string | null) => {
  if (v === null || v === undefined) return "—";
  try {
    return BigInt(v).toLocaleString("en-US");
  } catch {
    return String(v);
  }
};

export default function IssuerBoard() {
  const [data, setData] = useState<Board | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/issuers", { cache: "no-store" });
        const j = (await r.json()) as Board;
        if (!alive) return;
        if (!r.ok || j.error) setErr(j.error ?? `request failed with ${r.status}`);
        else setData(j);
      } catch (e) {
        if (alive) setErr((e as Error).message);
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const th: React.CSSProperties = {
    textAlign: "left",
    fontSize: 10,
    padding: "8px 10px",
    borderBottom: "1px solid #9ca3af",
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "9px 10px",
    borderBottom: "1px solid #edeff2",
    fontSize: 12,
    fontFamily: "var(--font-mono)",
    whiteSpace: "nowrap",
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Issuers</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>Same asset class, different exit</h1>
        {data && (
          <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", marginTop: 8 }}>
            {data.observed} of {data.requested} mints read · one whole token quoted per mint
          </p>
        )}
      </div>

      {busy && <div className="mono" style={{ fontSize: 13, color: "var(--color-graphite)" }}>Reading every mint</div>}
      {err && (
        <div style={{ padding: "12px 16px", background: "rgba(255,77,77,0.06)", borderRadius: 8, fontSize: 13, color: "var(--color-refuse)" }}>
          {err}
        </div>
      )}

      {data?.by_issuer?.map((b) => (
        <div key={b.issuer} className="card" style={{ padding: 18, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--color-onyx)" }}>{b.issuer}</div>
            <div className="mono" style={{ fontSize: 12, color: "var(--color-graphite)" }}>
              {b.mints} mint{b.mints === 1 ? "" : "s"} ·{" "}
              exit fee {b.fee_bps_min === b.fee_bps_max ? `${b.fee_bps_min} bps` : `${b.fee_bps_min}-${b.fee_bps_max} bps`} ·{" "}
              {b.keys_min === b.keys_max ? `${b.keys_min} key${b.keys_min === 1 ? "" : "s"}` : `${b.keys_min}-${b.keys_max} keys`} behind the levers
              {b.any_pending_change ? " · a change is scheduled" : ""}
            </div>
          </div>
        </div>
      ))}

      {data && (
        <div className="card" style={{ padding: 0, overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["issuer", "symbol", "fee now", "not yet in force", "quote", "withheld", "lands", "levers", "keys", "paused", "hook"].map((h) => (
                  <th key={h} className="label-mono" style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.mint}>
                  <td style={{ ...td, color: "var(--color-onyx)" }}>{r.issuer}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.symbol}</td>
                  <td style={{ ...td, color: r.fee_in_force_bps ? "#8a5a00" : "var(--color-graphite)" }}>
                    {r.error ? "—" : `${r.fee_in_force_bps} bps`}
                  </td>
                  <td style={{ ...td, color: r.fee_pending_bps ? "#8a5a00" : "var(--color-graphite)" }}>
                    {r.fee_pending_bps ? `${r.fee_pending_bps} bps @ ${r.fee_pending_epoch}` : "—"}
                  </td>
                  <td style={td}>{r.quote_error ? `no route` : n(r.quote_out)}</td>
                  <td style={{ ...td, color: "var(--color-refuse)" }}>{n(r.withheld)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{n(r.lands)}</td>
                  <td style={td}>{r.levers ?? "—"}</td>
                  <td style={{ ...td, color: r.keys === 1 ? "#8a5a00" : "var(--color-graphite)" }}>{r.keys ?? "—"}</td>
                  <td style={td}>{r.paused === null || r.paused === undefined ? "—" : r.paused ? "yes" : "no"}</td>
                  <td style={td}>{r.hook ? "installed" : "none"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 11, color: "var(--color-graphite)", maxWidth: "70ch" }}>
        Every value above is read from the mint at request time. A mint with no transfer-fee
        extension reports 0 bps, which is a different statement from a fee of zero that someone
        intends to raise later.
      </p>
    </div>
  );
}
