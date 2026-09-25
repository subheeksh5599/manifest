"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * One settlement, priced from live sources and then held to account.
 *
 * The card has three jobs. Show what the venue quotes, show what the mint keeps,
 * and show what actually arrives. Every one of those numbers can be opened to
 * reveal the URL it came from and the slot it was read at. When a wallet is
 * connected, the same quote can be executed, and after it confirms the card
 * re-reads the chain and compares the receipt with what it promised.
 */

type Source = { url: string; host: string; at: string; method?: string; slot?: number | null };

type Settle = {
  ok: true;
  mint: string;
  direction: "buy" | "sell";
  input_mint: string;
  output_mint: string;
  amount: string;
  slot: number | null;
  epoch: string | number | null;
  quote: {
    in_amount: string;
    out_amount: string;
    other_amount_threshold: string | null;
    price_impact_pct: string | null;
    route_labels: string[];
    hops: Array<{ venue: string | null; amm_key: string | null; percent: number | null }>;
    slippage_bps: number | null;
    source: Source;
  };
  terms: {
    decimals: number | null;
    symbol: string | null;
    name: string | null;
    supply: string | null;
    fee_older: { epoch: string | null; bps: number; maximum_fee: string } | null;
    fee_newer: { epoch: string | null; bps: number; maximum_fee: string } | null;
    fee_effective: { epoch: string | null; bps: number; maximum_fee: string } | null;
    fee_pending: { epoch: string | null; bps: number; maximum_fee: string } | null;
    fee_schedule_reason: string;
    withheld_amount: string | null;
    is_token_2022: boolean;
  };
  settlement: {
    quoted_out: string;
    schedule_bps: number;
    schedule_epoch: string | null;
    withheld: string;
    lands: string;
    pending_bps: number | null;
    pending_epoch: string | null;
    withheld_after_pending: string | null;
    /** True when the mint carries no transfer-fee configuration at all. */
    no_fee_schedule?: boolean;
    note?: string;
  };
  units: { input_decimals: number; output_decimals: number };
  sources: { quote: Source; mint: Source };
};

type TxRead = {
  ok: boolean;
  signature?: string;
  slot: number | null;
  failed: boolean;
  err: unknown;
  movements: Array<{ mint: string; owner: string | null; delta_raw: string; decimals: number | null }>;
  error?: string;
};

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** A percentage keeps three significant digits; a raw float is not a reading. */
const pct = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return "—";
  const x = Number(v);
  if (!Number.isFinite(x)) return String(v);
  if (x === 0) return "0%";
  return `${String(Number(x.toPrecision(3)))}%`;
};

const n = (v: string | number | null | undefined, dp = 9) => {
  if (v === null || v === undefined) return "—";
  const x = Number(v);
  if (!Number.isFinite(x)) return String(v);
  return x.toLocaleString("en-US", { maximumFractionDigits: dp });
};

const toBase = (human: string, decimals: number): string | null => {
  if (!/^[0-9]*\.?[0-9]*$/.test(human) || human === "" || human === ".") return null;
  const [w, f = ""] = human.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  const s = `${w || "0"}${frac}`.replace(/^0+(?=\d)/, "");
  return /^[0-9]+$/.test(s) && BigInt(s) > 0n ? s : null;
};

const fromBase = (raw: string | null, decimals: number) => {
  if (raw === null) return "—";
  try {
    const v = BigInt(raw);
    const d = BigInt(10) ** BigInt(decimals);
    const whole = v / d;
    const frac = (v % d).toString().padStart(decimals, "0").replace(/0+$/, "");
    return frac ? `${whole.toLocaleString("en-US")}.${frac}` : whole.toLocaleString("en-US");
  } catch {
    return String(raw);
  }
};

function SourceBox({ label, source }: { label: string; source: Source }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 10,
        color: "var(--color-graphite)",
        border: "1px solid var(--color-hairline)",
        borderRadius: 2,
        padding: "7px 9px",
        marginTop: 6,
        display: "grid",
        gap: 2,
        wordBreak: "break-all",
      }}
    >
      <div style={{ color: "var(--color-onyx)" }}>{label}</div>
      <div>{source.url}</div>
      <div>
        {source.host}
        {source.method ? ` · ${source.method}` : ""}
        {source.slot ? ` · slot ${source.slot}` : ""}
      </div>
      <div>read {source.at}</div>
    </div>
  );
}

export default function SettlementCard({
  mint,
  wallet,
  initialAmount,
}: {
  mint: string;
  wallet?: string | null;
  initialAmount?: string;
}) {
  const [amount, setAmount] = useState(initialAmount ?? "100");
  const [data, setData] = useState<Settle | null>(null);
  const [err, setErr] = useState<{ message: string; stage?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  const [exec, setExec] = useState<{
    state: "idle" | "building" | "signing" | "sent" | "confirming" | "done" | "failed";
    message?: string;
    signature?: string;
    receipt?: TxRead;
  }>({ state: "idle" });

  const settleId = useRef(0);

  // The input side is USDC (6dp) for a buy; for a sell the input is the holding.
  const inputDecimals = 6;

  const load = useCallback(async () => {
    const base = toBase(amount, inputDecimals);
    if (!base) {
      setErr({ message: "amount must be a positive number", stage: "input" });
      setData(null);
      return;
    }
    const id = ++settleId.current;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/settle?mint=${encodeURIComponent(mint)}&amount=${base}&direction=buy`, {
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        if (id !== settleId.current) return;
        setData(null);
        setErr({ message: j.error ?? `the read returned ${r.status}`, stage: j.stage });
        return;
      }
      if (id !== settleId.current) return;
      setData(j as Settle);
      setFetchedAt(Date.now());
    } catch (e) {
      if (id === settleId.current) {
        setData(null);
        setErr({ message: (e as Error).message, stage: "network" });
      }
    } finally {
      if (id === settleId.current) setBusy(false);
    }
  }, [amount, mint]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 350);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const age = fetchedAt ? Math.round((Date.now() - fetchedAt) / 1000) : null;
  const outDecimals = data?.units.output_decimals ?? data?.terms.decimals ?? 9;

  const execute = useCallback(async () => {
    if (!wallet) {
      setExec({ state: "failed", message: "connect a wallet before executing" });
      return;
    }
    if (!data) {
      setExec({ state: "failed", message: "there is no live quote to execute" });
      return;
    }
    const w = window as any;
    const provider = [w.phantom?.solana, w.solflare, w.backpack, w.solana].find(
      (c) => c && typeof c.connect === "function"
    );
    if (!provider?.signAndSendTransaction) {
      setExec({
        state: "failed",
        message: "this wallet cannot sign and send from the page; it must support signAndSendTransaction",
      });
      return;
    }

    setExec({ state: "building" });
    try {
      const r = await fetch("/api/swap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          inputMint: data.input_mint,
          outputMint: data.output_mint,
          amount: data.amount,
          slippageBps: data.quote.slippage_bps ?? 50,
          userPublicKey: wallet,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? `the transaction build failed (${r.status})`);
      if (!j.swapTransaction) throw new Error("the venue returned no transaction");

      setExec({ state: "signing" });
      const bin = Uint8Array.from(atob(j.swapTransaction), (c) => c.charCodeAt(0));
      // The wallet signs and broadcasts; this page never sees a key.
      const res = await provider.signAndSendTransaction({
        serialize: () => bin,
      } as any);
      const signature = typeof res === "string" ? res : res?.signature;
      if (!signature) throw new Error("the wallet returned no signature");

      setExec({ state: "confirming", signature });

      // Hold the receipt to the promise: poll the chain until the transaction has
      // a slot, then compare what moved against what the card said would move.
      for (let i = 0; i < 40; i++) {
        await new Promise((r2) => setTimeout(r2, 2000));
        const tr = await fetch(`/api/tx?signature=${encodeURIComponent(signature)}`, { cache: "no-store" });
        if (tr.status === 404) continue;
        const tj = (await tr.json()) as TxRead;
        if (tj?.ok && tj.slot != null) {
          setExec({ state: "done", signature, receipt: tj });
          return;
        }
      }
      setExec({
        state: "sent",
        signature,
        message: "a signature exists but the chain has not confirmed it within the window this page waits",
      });
    } catch (e) {
      setExec({ state: "failed", message: (e as Error).message });
    }
  }, [wallet, data]);

  const receiptLine = useMemo(() => {
    const r = exec.receipt;
    if (!r) return null;
    const expected = data?.settlement.lands ?? null;
    const moved = r.movements.find((m) => m.mint === data?.output_mint && BigInt(m.delta_raw) > 0n);
    const actual = moved ? moved.delta_raw : null;
    const diff =
      expected && actual ? (BigInt(actual) - BigInt(expected)).toString() : null;
    return { expected, actual, diff };
  }, [exec.receipt, data]);

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span className="label-mono" style={{ fontSize: 10 }}>
          {data?.terms.symbol ?? "settlement"}
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
          {data?.direction === "buy" ? "USDC in, holding out" : "holding in, USDC out"}
        </span>
        {age !== null && (
          <span className="mono" style={{ fontSize: 11, color: "var(--color-ash)", marginLeft: "auto" }}>
            fetched {age}s ago{data?.slot ? ` · slot ${data.slot}` : ""}
          </span>
        )}
        <button className="src-btn" onClick={() => void load()} disabled={busy}>
          {busy ? "reading" : "refresh"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "baseline",
          margin: "14px 0 4px",
          flexWrap: "wrap",
        }}
      >
        <span className="label-mono" style={{ fontSize: 10 }}>
          Amount in
        </span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          className="mono"
          style={{
            width: 140,
            fontSize: 15,
            fontWeight: 600,
            padding: "4px 8px",
            border: "1px solid var(--color-hairline)",
            borderRadius: 2,
          }}
          aria-label="amount to settle"
        />
        <span className="mono" style={{ fontSize: 12, color: "var(--color-graphite)" }}>
          USDC
        </span>
        {["10", "100", "1000"].map((p) => (
          <button key={p} className="src-btn" onClick={() => setAmount(p)}>
            {p}
          </button>
        ))}
      </div>

      {err && (
        <div className="state-card state-error" style={{ marginTop: 14 }}>
          <div className="state-title">
            {err.stage === "quote"
              ? "No route available"
              : err.stage === "mint_read"
                ? "Mint state unreadable"
                : err.stage === "input"
                  ? "Input rejected"
                  : err.stage === "network"
                    ? "Source unreachable"
                    : "Cannot price this"}
          </div>
          <p className="mono" style={{ fontSize: 12, margin: 0 }}>{err.message}</p>
          <p className="mono" style={{ fontSize: 11, margin: "6px 0 0", color: "var(--color-graphite)" }}>
            No transaction was created and no value has been inferred.
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="flow" style={{ marginTop: 16 }}>
            <div className="flow-step">
              <span className="flow-label">Quoted by the venue</span>
              <span className="flow-value">
                {n(fromBase(data.settlement.quoted_out, outDecimals).replace(/,/g, ""))}
                <span style={{ fontSize: 12, color: "var(--color-graphite)" }}>
                  {" "}
                  {data.terms.symbol ?? "out"}
                </span>
              </span>
              <button className="src-btn" onClick={() => setOpen(open === "quote" ? null : "quote")}>
                source
              </button>
            </div>
            {open === "quote" && (
              <SourceBox label="Aggregator quote" source={data.quote.source} />
            )}

            <div className="flow-step flow-cut">
              <span className="flow-label">Mint withholds</span>
              <span className="flow-value">
                {n(fromBase(data.settlement.withheld, outDecimals).replace(/,/g, ""))}
                <span style={{ fontSize: 12, color: "var(--color-graphite)" }}>
                  {" "}
                  {data.settlement.no_fee_schedule
                    ? "no fee schedule on this mint"
                    : `at ${data.settlement.schedule_bps} bps`}
                </span>
              </span>
              <button className="src-btn" onClick={() => setOpen(open === "mint" ? null : "mint")}>
                source
              </button>
            </div>
            {open === "mint" && (
              <>
                <SourceBox label="Mint account, fee config decoded from bytes" source={data.sources.mint} />
                <div className="mono" style={{ fontSize: 10, color: "var(--color-graphite)", marginTop: 6 }}>
                  {data.settlement.no_fee_schedule
                    ? data.settlement.note
                    : `field olderTransferFee.transferFeeBasisPoints · epoch ${String(
                        data.settlement.schedule_epoch
                      )} · max fee ${data.terms.fee_effective?.maximum_fee ?? "—"}`}
                </div>
              </>
            )}

            <div className="flow-step flow-lands">
              <span className="flow-label">Lands with the holder</span>
              <span className="flow-value">
                {n(fromBase(data.settlement.lands, outDecimals).replace(/,/g, ""))}
                <span style={{ fontSize: 12, color: "var(--color-graphite)" }}>
                  {" "}
                  {data.terms.symbol ?? "out"}
                </span>
              </span>
              <button className="src-btn" onClick={() => setOpen(open === "why" ? null : "why")}>
                why
              </button>
            </div>
            {open === "why" && (
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  display: "grid",
                  gap: 3,
                  padding: "10px 0 4px",
                  color: "var(--color-graphite)",
                }}
              >
                <div>gross {data.settlement.quoted_out} base units</div>
                <div>
                  fee {data.settlement.withheld} = {data.settlement.quoted_out} × {data.settlement.schedule_bps} /
                  10000, capped at {data.terms.fee_effective?.maximum_fee ?? "—"}
                </div>
                <div>net {data.settlement.lands} base units</div>
                <div>
                  mint {data.mint} · decimals {data.terms.decimals} · read at epoch {String(data.epoch)}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid var(--color-hairline)",
              fontSize: 11,
            }}
            className="mono"
          >
            <span style={{ color: "var(--color-graphite)" }}>
              route {data.quote.route_labels.join(" → ") || "unknown"}
            </span>
            <span style={{ color: "var(--color-graphite)" }}>
              impact {pct(data.quote.price_impact_pct)}
            </span>
            <span style={{ color: "var(--color-graphite)" }}>hops {data.quote.hops.length}</span>
            {data.settlement.pending_bps != null && (
              <span style={{ color: "#8a5a00" }}>
                next schedule {data.settlement.pending_bps} bps at epoch {data.settlement.pending_epoch}
              </span>
            )}
          </div>

          {data.settlement.withheld_after_pending && (
            <div className="mono" style={{ fontSize: 11, color: "#8a5a00", marginTop: 6 }}>
              the same trade after that epoch keeps{" "}
              {n(fromBase(data.settlement.withheld_after_pending, outDecimals).replace(/,/g, ""))} instead of{" "}
              {n(fromBase(data.settlement.withheld, outDecimals).replace(/,/g, ""))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              onClick={() => void execute()}
              disabled={!wallet || exec.state === "building" || exec.state === "signing" || exec.state === "confirming"}
            >
              {exec.state === "building"
                ? "Building"
                : exec.state === "signing"
                  ? "Sign in wallet"
                  : exec.state === "confirming"
                    ? "Confirming"
                    : `Execute real swap`}
            </button>
            <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
              {wallet
                ? "signs in your wallet; nothing is simulated"
                : "connect a wallet to execute"}
            </span>
          </div>

          {exec.state !== "idle" && (
            <div
              className="state-card"
              style={{ marginTop: 14, borderColor: exec.state === "failed" ? "var(--color-refuse)" : undefined }}
            >
              <div className="state-title">
                {exec.state === "failed"
                  ? "Not settled"
                  : exec.state === "done"
                    ? "Finalized"
                    : exec.state === "sent"
                      ? "Submitted, unconfirmed"
                      : "In flight"}
              </div>
              {exec.message && (
                <p className="mono" style={{ fontSize: 12, margin: 0 }}>{exec.message}</p>
              )}
              {exec.signature && (
                <p className="mono" style={{ fontSize: 11, margin: "6px 0 0", wordBreak: "break-all" }}>
                  sig {exec.signature}
                  {" · "}
                  <a
                    href={`https://explorer.solana.com/tx/${exec.signature}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--color-brand-blue)" }}
                  >
                    explorer
                  </a>
                </p>
              )}
              {receiptLine && (
                <div className="mono" style={{ fontSize: 11, display: "grid", gap: 3, marginTop: 8 }}>
                  <div>this card promised {n(fromBase(receiptLine.expected, outDecimals).replace(/,/g, ""))}</div>
                  <div>
                    the wallet actually moved{" "}
                    {receiptLine.actual ? n(fromBase(receiptLine.actual, outDecimals).replace(/,/g, "")) : "nothing of this mint"}
                  </div>
                  <div
                    style={{
                      color:
                        receiptLine.diff === "0"
                          ? "#16794c"
                          : receiptLine.diff === null
                            ? "var(--color-refuse)"
                            : "#8a5a00",
                    }}
                  >
                    difference {receiptLine.diff ?? "not observable"}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
