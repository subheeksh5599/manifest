"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/app-shell";
import WalletPanel from "@/components/wallet-panel";
import SettlementCard from "@/components/settlement-card";
import PriceChart from "@/components/price-chart";

type Asset = {
  mint: string;
  symbol: string | null;
  readable: boolean;
  supported: boolean;
  decimals: number | null;
  fee_in_force_bps: number | null;
  fee_pending_bps: number | null;
  fee_pending_epoch: string | null;
  /** Which family issued it: the issuer listing, or the registry's Solana names. */
  issuer: string | null;
  price: { usd_price: number | null; equity_price: number | null } | null;
  error?: string;
};

/**
 * Overview.
 *
 * The wallet, then one priced settlement, then the shelf. Nothing on this page is
 * written by hand: the list comes from a live listing crossed with a chain read,
 * and the numbers come from whatever the sources answered a moment ago.
 */
export default function OverviewPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mint, setMint] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/assets", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error ?? `discovery returned ${r.status}`);
        setAssets(j.assets as Asset[]);
        const first = (j.assets as Asset[]).find((a) => a.supported) ?? (j.assets as Asset[])[0];
        if (first) setMint(first.mint);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  const supported = assets?.filter((a) => a.supported) ?? [];

  return (
    <AppShell active="overview">
      <div className="dash-head">
        <div>
          <div className="label-mono" style={{ color: "var(--color-brand-blue)", marginBottom: 8 }}>
            Overview
          </div>
          <h1 className="heading-sm" style={{ margin: 0 }}>
            What actually lands
          </h1>
          <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: "8px 0 0", maxWidth: 620 }}>
            A quote is the venue&apos;s arithmetic. The mint takes its own cut on the transfer. This is
            the difference, priced live, with every number traceable to the read it came from.
          </p>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <WalletPanel onChange={(w) => setWallet(w?.address ?? null)} />
        </div>
      </div>

      {err && (
        <div className="state-card state-error">
          <div className="state-title">Discovery failed</div>
          <p className="mono" style={{ fontSize: 12, margin: 0 }}>{err}</p>
        </div>
      )}

      <div className="dash-cols">
        <div>
          {mint ? (
            <SettlementCard mint={mint} wallet={wallet} />
          ) : (
            <div className="state-card">
              <div className="state-title">Waiting on discovery</div>
              <p className="mono" style={{ fontSize: 12, margin: 0, color: "var(--color-graphite)" }}>
                {assets ? "the listing returned no analysable mints" : "reading the issuer listing and the chain"}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          {mint && (
            <div className="card" style={{ padding: 18 }}>
              <div className="label-mono" style={{ fontSize: 10, marginBottom: 10 }}>
                Price of the holding
              </div>
              <PriceChart mint={mint} />
            </div>
          )}

          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", marginBottom: 10 }}>
              <span className="label-mono" style={{ fontSize: 10 }}>
                The shelf
              </span>
              <Link href="/assets" className="src-btn" style={{ marginLeft: "auto", textDecoration: "none" }}>
                all {assets?.length ?? "…"}
              </Link>
            </div>
            {!assets && <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: 0 }}>reading</p>}
            {assets?.map((a) => (
              <button
                key={a.mint}
                onClick={() => setMint(a.mint)}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  width: "100%",
                  background: "none",
                  border: "none",
                  borderTop: "1px solid var(--color-cloud)",
                  padding: "8px 0",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: a.mint === mint ? 700 : 400 }}>
                  {a.symbol ?? a.mint.slice(0, 6)}
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", marginLeft: "auto" }}>
                  {a.price?.usd_price != null ? `$${a.price.usd_price.toFixed(2)}` : "—"}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: "var(--color-ash)", minWidth: 104, textAlign: "right" }}
                >
                  {a.issuer ? `${a.issuer} · ` : ""}
                  {a.readable === false ? "unreadable" : a.fee_in_force_bps != null ? `${a.fee_in_force_bps} bps` : "no fee"}
                </span>
              </button>
            ))}
            {supported.length === 0 && assets && (
              <p className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", marginTop: 8 }}>
                No mint on this shelf exposes a settlement schedule yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
