"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/app-shell";
import SettlementCard from "@/components/settlement-card";
import PriceChart from "@/components/price-chart";

type Asset = { mint: string; symbol: string | null; supported: boolean; readable: boolean; fee_in_force_bps: number | null };

/**
 * Quote to settlement.
 *
 * Pick a holding, size the trade, and the card prices it end to end: what the
 * venue quotes, what the mint withholds, what lands. With a wallet connected the
 * same quote can be executed against the real network, and the receipt is then
 * held against what the card promised.
 */
export default function SettlePage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [mint, setMint] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/assets", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error ?? `discovery returned ${r.status}`);
        const list = j.assets as Asset[];
        setAssets(list);
        const q = new URLSearchParams(window.location.search).get("mint");
        const chosen = q && list.some((a) => a.mint === q) ? q : null;
        setMint(chosen ?? list.find((a) => a.supported)?.mint ?? list[0]?.mint ?? null);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  // The wallet panel lives on the overview; this screen reads the same wallet by
  // asking the page's provider directly, so a settlement can be executed here.
  useEffect(() => {
    const w = window as any;
    const p = [w.phantom?.solana, w.solflare, w.backpack, w.solana].find(
      (c) => c && typeof c.connect === "function"
    );
    if (p?.publicKey) setWallet(p.publicKey.toString());
    const handler = () => setWallet(p?.publicKey?.toString() ?? null);
    p?.on?.("accountChanged", handler);
  }, []);

  return (
    <AppShell active="settle">
      <div style={{ marginBottom: 22 }}>
        <div className="label-mono" style={{ color: "var(--color-brand-blue)", marginBottom: 8 }}>
          Settlement
        </div>
        <h1 className="heading-sm" style={{ margin: 0 }}>
          Quote, withholding, receipt
        </h1>
      </div>

      {err && (
        <div className="state-card state-error">
          <div className="state-title">No assets to price</div>
          <p className="mono" style={{ fontSize: 12, margin: 0 }}>{err}</p>
        </div>
      )}

      {assets && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {assets.map((a) => (
            <button
              key={a.mint}
              onClick={() => setMint(a.mint)}
              className={a.mint === mint ? "btn-primary" : "src-btn"}
              style={{ padding: a.mint === mint ? "5px 10px" : "3px 8px", fontSize: a.mint === mint ? 12 : 11 }}
            >
              {a.symbol ?? a.mint.slice(0, 6)}
              {!a.supported && <span style={{ opacity: 0.6 }}> ·n/a</span>}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <div>
          {mint ? (
            <SettlementCard mint={mint} wallet={wallet} />
          ) : (
            <div className="state-card">
              <div className="state-title">Waiting on discovery</div>
              <p className="mono" style={{ fontSize: 12, margin: 0, color: "var(--color-graphite)" }}>
                reading the issuer listing and the chain
              </p>
            </div>
          )}
        </div>
        {mint && (
          <div className="card" style={{ padding: 18 }}>
            <div className="label-mono" style={{ fontSize: 10, marginBottom: 10 }}>
              Price of this holding
            </div>
            <PriceChart mint={mint} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
