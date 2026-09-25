"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The wallet panel.
 *
 * Connecting uses whatever provider the browser actually has injected. Nothing
 * here invents a session: if no wallet is present, it says so; if the wallet
 * holds nothing this product can analyse, it says that instead of showing a
 * sample portfolio.
 */

type Injected = {
  publicKey?: { toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  on?: (event: string, handler: (...a: any[]) => void) => void;
  isPhantom?: boolean;
};

type Account = {
  ata: string;
  mint: string | null;
  program: string;
  decimals: number | null;
  raw_amount: string | null;
  ui_amount: string | null;
  withheld_amount: string | null;
  state: string | null;
  supported?: boolean;
  asset?: {
    readable: boolean;
    symbol: string | null;
    name: string | null;
    is_token_2022: boolean;
    fee_in_force_bps: number | null;
    fee_pending_bps: number | null;
    fee_pending_epoch: string | null;
    supported: boolean;
    error?: string;
  } | null;
};

type WalletRead = {
  ok: boolean;
  address: string;
  sol: { lamports: number | null; sol: number | null; error?: string };
  slot: number | null;
  epoch: number | null;
  epoch_progress: { slot_index: number; slots_in_epoch: number } | null;
  accounts: Account[];
  supported_count: number;
  unsupported_count: number;
  empty_reason: string | null;
  error?: string;
  stage?: string;
  read_at: string;
  source: { url: string; host: string; methods: string[] };
};

function provider(): Injected | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const cands = [w.phantom?.solana, w.solflare, w.backpack, w.solana];
  return cands.find((c) => c && typeof c.connect === "function") ?? null;
}

const short = (s: string, n = 4) => (s.length > n * 2 + 3 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

const n = (v: string | number | null | undefined, dp = 6) => {
  if (v === null || v === undefined) return "—";
  const x = Number(v);
  if (!Number.isFinite(x)) return String(v);
  return x.toLocaleString("en-US", { maximumFractionDigits: dp });
};

export default function WalletPanel({ onChange }: { onChange?: (w: WalletRead | null) => void }) {
  const [address, setAddress] = useState<string | null>(null);
  const [data, setData] = useState<WalletRead | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);

  useEffect(() => {
    setHasProvider(provider() !== null);
  }, []);

  const load = useCallback(
    async (addr: string) => {
      setBusy(true);
      setErr(null);
      try {
        const r = await fetch(`/api/wallet?address=${encodeURIComponent(addr)}`, { cache: "no-store" });
        const j = (await r.json()) as WalletRead;
        if (!r.ok || !j.ok) throw new Error(j.error ?? `the wallet read returned ${r.status}`);
        setData(j);
        onChange?.(j);
      } catch (e) {
        setData(null);
        onChange?.(null);
        setErr((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [onChange]
  );

  const connect = useCallback(async () => {
    const p = provider();
    if (!p) {
      setErr("no wallet extension found in this browser");
      return;
    }
    try {
      const res = await p.connect();
      const key = res?.publicKey?.toString() ?? p.publicKey?.toString() ?? null;
      if (!key) throw new Error("the wallet did not return a public key");
      setAddress(key);
      await load(key);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [load]);

  // A wallet can be switched from its own UI, so the panel follows the provider
  // instead of assuming the address it connected with is still the one in use.
  useEffect(() => {
    const p = provider();
    if (!p?.on) return;
    const handler = () => {
      const key = p.publicKey?.toString() ?? null;
      setAddress(key);
      if (key) void load(key);
      else {
        setData(null);
        onChange?.(null);
      }
    };
    p.on("accountChanged", handler);
    return () => {
      try {
        p.on?.("accountChanged", () => {});
      } catch {
        /* some providers do not support removal */
      }
    };
  }, [load, onChange]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span className="label-mono" style={{ fontSize: 10 }}>
          Wallet
        </span>
        {!address ? (
          <button className="btn-primary" onClick={() => void connect()} disabled={busy}>
            {busy ? "Connecting" : "Connect wallet"}
          </button>
        ) : (
          <>
            <code className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{short(address, 6)}</code>
            <button className="src-btn" onClick={() => void load(address)} disabled={busy}>
              {busy ? "reading" : "refresh"}
            </button>
            {data?.source?.url && (
              <a
                className="src-btn"
                style={{ textDecoration: "none" }}
                href={`https://explorer.solana.com/address/${address}`}
                target="_blank"
                rel="noreferrer"
              >
                explorer
              </a>
            )}
          </>
        )}
      </div>

      {hasProvider === false && !address && (
        <p className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", marginTop: 8 }}>
          No wallet extension detected. Install one, or paste any address into the box to read it
          without connecting.
        </p>
      )}

      {err && (
        <div className="state-card state-error" style={{ marginTop: 12 }}>
          <div className="state-title">Wallet unreadable</div>
          <p className="mono" style={{ fontSize: 12, margin: 0, color: "var(--color-refuse)" }}>{err}</p>
          <p className="mono" style={{ fontSize: 11, margin: "6px 0 0", color: "var(--color-graphite)" }}>
            Nothing has been inferred from this failure.
          </p>
        </div>
      )}

      {address && data && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              gap: 22,
              flexWrap: "wrap",
              padding: "10px 0 12px",
              borderTop: "1px solid var(--color-hairline)",
            }}
          >
            <span className="mono" style={{ fontSize: 12 }}>
              <span style={{ color: "var(--color-graphite)" }}>SOL </span>
              {data.sol.sol === null ? data.sol.error ?? "unreadable" : n(data.sol.sol, 9)}
            </span>
            <span className="mono" style={{ fontSize: 12 }}>
              <span style={{ color: "var(--color-graphite)" }}>slot </span>
              {data.slot ?? "—"}
            </span>
            <span className="mono" style={{ fontSize: 12 }}>
              <span style={{ color: "var(--color-graphite)" }}>epoch </span>
              {data.epoch ?? "—"}
            </span>
            <span className="mono" style={{ fontSize: 12 }}>
              <span style={{ color: "var(--color-graphite)" }}>accounts </span>
              {data.accounts.length}
            </span>
            <time className="mono" style={{ fontSize: 11, color: "var(--color-ash)", marginLeft: "auto" }}>
              read {data.read_at.slice(11, 19)}Z
            </time>
          </div>

          {data.empty_reason && (
            <div className="state-card">
              <div className="state-title">Nothing to price</div>
              <p className="mono" style={{ fontSize: 12, margin: 0 }}>{data.empty_reason}</p>
            </div>
          )}

          {data.accounts.length > 0 && (
            <table className="dtable">
              <thead>
                <tr>
                  <th>Mint</th>
                  <th>Asset</th>
                  <th>Program</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th style={{ textAlign: "right" }}>Withheld</th>
                  <th>Fee</th>
                  <th>Analysable</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((a) => (
                  <tr key={a.ata}>
                    <td>
                      <a href={`/analyze?mint=${a.mint}`}>{short(String(a.mint), 5)}</a>
                    </td>
                    <td>{a.asset?.symbol ?? "—"}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{a.program}</td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {a.ui_amount ?? "—"}
                      <span style={{ color: "var(--color-ash)" }}> /{a.decimals ?? "?"}</span>
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {a.withheld_amount ? a.withheld_amount : "—"}
                    </td>
                    <td className="mono">
                      {a.asset?.fee_in_force_bps != null ? `${a.asset.fee_in_force_bps} bps` : "—"}
                      {a.asset?.fee_pending_bps != null && (
                        <span style={{ color: "#8a5a00" }}>
                          {" "}
                          → {a.asset.fee_pending_bps}
                        </span>
                      )}
                    </td>
                    <td>
                      {a.supported ? (
                        <span style={{ color: "#16794c" }}>yes</span>
                      ) : (
                        <span style={{ color: "var(--color-graphite)" }}>
                          {a.asset?.readable === false ? "unreadable" : "unsupported"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
