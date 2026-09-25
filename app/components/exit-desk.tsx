"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { RegistryEntry } from "@/lib/registry";

/* ── shapes returned by /api/exit ─────────────────────────────────────────── */

type FeeSchedule = { epoch: string; bps: number; maximum_fee: string };

type Terms = {
  mint: string;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  supply: string | null;
  slot: number;
  epoch: string;
  is_token_2022: boolean | null;
  fee_exact: boolean | null;
  fee_older: FeeSchedule | null;
  fee_newer: FeeSchedule | null;
  fee_effective: FeeSchedule | null;
  fee_pending: FeeSchedule | null;
  fee_schedule_reason: string;
  withheld_amount: string | null;
  permanent_delegate: string | null;
  freeze_authority: string | null;
  mint_authority: string | null;
  paused: boolean | null;
  transfer_hook_program: string | null;
  multiplier: string | null;
  authority: { levers: { lever: string; key: string }[]; distinct_keys: number; total_levers: number };
};

type Check = { id: string; passed: boolean; value: unknown; detail: unknown; refusal: string | null };

type Landing = {
  quoted_out: string;
  schedule_bps: number;
  schedule_epoch: string | null;
  withheld: string;
  lands: string;
  pending_bps: number | null;
  pending_epoch: string | null;
  withheld_after_pending: string | null;
};

type Route = {
  venue: string;
  available: boolean;
  unavailable_reason?: string;
  achievable_now?: boolean;
  out_amount?: string;
  price_impact_bps?: number;
  effective_out?: string;
  effective_cost_bps?: number;
  route_labels?: string[];
  hops?: number;
};

type Exit = {
  mint: string;
  size: string;
  slot: number;
  epoch: string;
  terms: Terms;
  quote: Route | null;
  quote_error: string | null;
  verdict: {
    verdict: "ROUTE" | "REFUSE";
    reason: string | null;
    failed_check: string | null;
    checks: Check[];
    landing: Landing | null;
    round_trip: { total_cost: string; effective_total_bps: number; capped?: boolean };
  };
  routes: { routes: Route[]; best: Route | null; achievable_count: number; unreachable_reasons: { venue: string; reason: string }[] };
  error?: string;
};

type Replica = {
  network: string;
  slot: number;
  issuer_a: { pool: string; vault_quote: { lamports_or_units: string }; vault_issuer: { lamports_or_units: string }; pool_owner_is_whirlpool: boolean };
  issuer_b: { pool: string; vault_quote: { lamports_or_units: string }; vault_issuer: { lamports_or_units: string }; pool_owner_is_whirlpool: boolean };
  cross_issuer: {
    sig: string;
    legs_in_one_transaction: number;
    confirmed: boolean;
    touches_whirlpool: boolean;
    measured: { issuer_b_spent: string; issuer_a_received: string; quote_asset: string; quote_asset_left_behind: string };
  };
  both_pools_live: boolean;
};

type CompareIssuer = {
  label: string; mint: string; pool: string; refused?: string;
  mintFeeBpsInForce?: number; mintFeeWithheld?: string; intoPool?: string;
  lands?: string; landedPerToken?: number; spotPerToken?: number | null;
  rawOutOfPool?: string; pricePerToken?: number; depth?: string; tick?: number;
  scheduleInForce?: { bps: number; sinceEpoch: number | null; pendingBps: number | null; pendingAtEpoch: number | null };
};

type Compare = {
  size: string; issuers: CompareIssuer[]; better?: string | null; worse?: string;
  spreadBps?: number | null; refused?: string | null;
  rail?: {
    available: boolean; reason?: string; from?: string; to?: string; legs?: number; inOneTransaction?: boolean;
    leg1?: { out: string; fee: string }; leg2?: { out: string; fee: string }; costOfTheRail?: string;
  } | null;
};

/* ── number helpers ───────────────────────────────────────────────────────── */

const n = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return "—";
  try {
    return BigInt(v as string).toLocaleString("en-US");
  } catch {
    return typeof v === "number" ? v.toLocaleString("en-US") : String(v);
  }
};

const short = (v: string | null | undefined, head = 6, tail = 4) =>
  !v ? "—" : v.length <= head + tail + 1 ? v : `${v.slice(0, head)}…${v.slice(-tail)}`;

/** base units -> a human number, exact for the integer part */
const fromBase = (base: string | bigint, decimals: number): number => {
  const b = typeof base === "bigint" ? base : BigInt(base);
  const d = 10n ** BigInt(decimals);
  return Number(b / d) + Number(b % d) / Number(d);
};

/** a decimal string -> base units, with no float in the multiply */
const toBase = (value: string | number, decimals: number): string | null => {
  const s = String(value).trim();
  if (!/^[0-9]*\.?[0-9]+$/.test(s)) return null;
  const [int, frac = ""] = s.split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const v = BigInt(int || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
  return v > 0n ? v.toString() : null;
};

const human = (v: number) =>
  v >= 1000
    ? v.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : v.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** the slider runs over four decades: 0.0001% of the float up to all of it */
const POSITIONS = 400;

/** The largest size the devnet replica's pools were built to absorb. */
const REPLICA_CAP = 100_000_000n;

/* ── the desk ─────────────────────────────────────────────────────────────── */

export default function ExitDesk({
  entries,
  initialMint,
  initialSize,
}: {
  entries: RegistryEntry[];
  initialMint?: string;
  initialSize?: string;
}) {
  // Open on the issuer whose exit terms are not free, so the desk shows the
  // mechanism on load rather than a zero.
  const first =
    initialMint && entries.some((e) => e.mint === initialMint)
      ? initialMint
      : entries.find((e) => e.issuer === "PreStocks")?.mint ?? entries[0]?.mint ?? "";

  const [mint, setMint] = useState(first);
  const entry = entries.find((e) => e.mint === mint);
  const [decimals, setDecimals] = useState(entry?.decimals ?? 9);
  const [pos, setPos] = useState(300);
  // Seed from the registry's own decimals so the first read can happen at all:
  // supply is only known *after* a read, so waiting for it deadlocks the desk.
  const [sizeBase, setSizeBase] = useState(() =>
    initialSize && /^[1-9][0-9]*$/.test(initialSize)
      ? initialSize
      : toBase(1, entry?.decimals ?? 9) ?? "1000000000"
  );
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Exit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rep, setRep] = useState<Replica | null>(null);
  const [cmp, setCmp] = useState<Compare | null>(null);
  const [trace, setTrace] = useState<{ size: string; costPct: number; impact: number }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const firstLoad = useRef(true);

  const t = data?.terms;
  const v = data?.verdict;
  const landing = v?.landing ?? null;
  const routed = v?.verdict === "ROUTE";
  const traits = data?.routes?.routes ?? [];

  // Supply drives the presets, so a preset is a real fraction of the float
  // rather than a number that means nothing on a given mint.
  const supplyBase = t?.supply ? BigInt(t.supply) : null;
  const supplyTokens = supplyBase ? fromBase(supplyBase, decimals) : null;
  const sizeTokens = sizeBase ? fromBase(sizeBase, decimals) : null;

  const presets = useMemo(() => {
    if (!supplyBase || supplyBase <= 0n) return [];
    // The values below are per-mille (1 = 0.1%), so the divisor is 1000. Dividing
    // by 100 made every preset a tenth of its label and "50%" five times the float.
    const at = (perMille: bigint) => {
      const v = (supplyBase * perMille) / 1000n;
      return v > 0n ? v : 1n;
    };
    return [
      { label: "0.1%", base: at(1n).toString() },
      { label: "1%", base: at(10n).toString() },
      { label: "10%", base: at(100n).toString() },
      { label: "50%", base: at(500n).toString() },
      { label: "all", base: supplyBase.toString() },
    ].filter((p, i, arr) => arr.findIndex((x) => x.base === p.base) === i);
  }, [supplyBase]);

  // Keep the thumb where the size actually is. sizeAtPos solves pct = 10^(p/100 - 4) * 100,
  // so the inverse is p = 100 * (log10(pct) + 2). Without this the thumb sat at its
  // seed position while the size said something else entirely.
  useEffect(() => {
    if (!supplyBase || !sizeBase) return;
    const pct = (Number(BigInt(sizeBase)) / Number(supplyBase)) * 100;
    if (!(pct > 0)) return;
    const p = Math.round((Math.log10(Math.max(pct, 0.01)) + 2) * (POSITIONS / 4));
    setPos(Math.min(POSITIONS, Math.max(0, p)));
  }, [supplyBase, sizeBase]);

  const sizeAtPos = useCallback(
    (p: number) => {
      if (!supplyBase) return null;
      const pct = Math.pow(10, (p / POSITIONS) * 4 - 4) * 100; // 0.0001% .. 100%
      let frac = BigInt(Math.max(1, Math.round(pct * 100)));
      if (frac > 10000n) frac = 10000n;
      const size = (supplyBase * frac) / 10000n;
      return (size > 0n ? size : 1n).toString();
    },
    [supplyBase]
  );

  const evaluate = useCallback(async (m: string, s: string) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/exit?mint=${encodeURIComponent(m)}&size=${encodeURIComponent(s)}`, {
        cache: "no-store",
      });
      const j = (await r.json()) as Exit;
      if (!r.ok || j.error) {
        setData(null);
        setErr(j.error ?? `request failed with ${r.status}`);
      } else {
        setData(j);
        if (j.terms?.decimals != null) setDecimals(j.terms.decimals);
        // Every read at the desk appends one line to the tape. The tape is
        // therefore a log of what was actually asked, not a fixture.
        void fetch("/api/tape", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            symbol: j.terms?.symbol ?? null,
            mint: j.mint,
            slot: typeof j.slot === "number" ? j.slot : 0,
            epoch: j.epoch != null ? Number(j.epoch) : null,
            source: "desk_read",
            fee_in_force_bps: j.terms?.fee_effective?.bps ?? 0,
            fee_pending_bps: j.terms?.fee_pending?.bps ?? null,
            fee_pending_epoch: j.terms?.fee_pending?.epoch != null ? Number(j.terms.fee_pending.epoch) : null,
            withheld_amount: j.verdict?.landing?.withheld ?? null,
          }),
        }).catch(() => {
          // the tape is a record, not a dependency: a failed append must not
          // change what the desk reports
        });
        try {
          window.localStorage.setItem("manifest:desk", JSON.stringify({ mint: m, size: s }));
        } catch {
          // private mode, or no storage at all
        }
        // The tape's server-side log needs a writable filesystem, which the
        // deployed host does not have. Keeping the row here as well means the
        // tape still grows with every read, wherever this is running.
        try {
          const row = {
            ts: Math.floor(Date.now() / 1000),
            symbol: j.terms?.symbol ?? null,
            mint: j.mint,
            slot: typeof j.slot === "number" ? j.slot : 0,
            epoch: j.epoch != null ? Number(j.epoch) : null,
            source: "desk_read",
            fee_in_force_bps: j.terms?.fee_effective?.bps ?? 0,
            fee_pending_bps: j.terms?.fee_pending?.bps ?? null,
            fee_pending_epoch:
              j.terms?.fee_pending?.epoch != null ? Number(j.terms.fee_pending.epoch) : null,
            withheld_amount: j.verdict?.landing?.withheld ?? null,
            origin: "this browser",
          };
          const key = "manifest:tape";
          const held = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
          held.unshift(row);
          window.localStorage.setItem(key, JSON.stringify(held.slice(0, 50)));
        } catch {
          // same as above: the desk works without it
        }
        const l = j.verdict?.landing;
        if (l && j.quote) {
          const quoted = Number(l.quoted_out);
          const costPct = quoted > 0 ? ((quoted - Number(l.lands)) / quoted) * 100 : 0;
          const row = { size: j.size, costPct, impact: j.quote.price_impact_bps ?? 0 };
          setTrace((prev) =>
            [...prev.filter((x) => x.size !== row.size), row]
              .sort((a, b) => (BigInt(a.size) < BigInt(b.size) ? -1 : 1))
              .slice(-8)
          );
        }
      }
    } catch (e) {
      setData(null);
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  // Coming back to the desk should not reset your position. A size in the URL
  // wins, because that link was shared deliberately; otherwise the last reading
  // made in this browser is restored. The first read waits for this to settle.
  useEffect(() => {
    if (!initialSize && !initialMint) {
      try {
        const raw = window.localStorage.getItem("manifest:desk");
        if (raw) {
          const saved = JSON.parse(raw) as { mint?: string; size?: string };
          const match = saved.mint ? entries.find((e) => e.mint === saved.mint) : null;
          if (match) {
            setMint(match.mint);
            setDecimals(match.decimals);
          }
          if (saved.size && /^[1-9][0-9]*$/.test(saved.size)) setSizeBase(saved.size);
        }
      } catch {
        // a desk that cannot remember is still a working desk
      }
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read on load, and again whenever the size settles. The button stays for
  // anyone who wants to force a fresh read at the same size.
  useEffect(() => {
    if (!ready || !mint || !sizeBase || !/^[1-9][0-9]*$/.test(sizeBase)) return;
    const delay = firstLoad.current ? 0 : 350;
    firstLoad.current = false;
    const id = setTimeout(() => void evaluate(mint, sizeBase), delay);
    return () => clearTimeout(id);
  }, [ready, mint, sizeBase, evaluate]);

  // The replica lives on devnet and is read on the request like everything else.
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const r = await fetch("/api/replica", { cache: "no-store" });
        if (r.ok && live) setRep((await r.json()) as Replica);
      } catch {
        // the desk still works without it; nothing is invented to fill the gap
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // The replica pools are a fixture with fixed liquidity and cannot absorb an
  // arbitrary size, so the comparison is priced at what they can take. When that
  // is smaller than the size on screen, the card states the size it used.
  const compareSize = useMemo(() => {
    if (!sizeBase) return "";
    try {
      const s = BigInt(sizeBase);
      return (s > REPLICA_CAP ? REPLICA_CAP : s).toString();
    } catch {
      return sizeBase;
    }
  }, [sizeBase]);

  // The comparison follows the size on screen, not the mint.
  useEffect(() => {
    if (!compareSize || !/^[1-9][0-9]*$/.test(compareSize)) return;
    let live = true;
    const id = setTimeout(() => {
      void (async () => {
        try {
          const r = await fetch(`/api/compare?size=${encodeURIComponent(compareSize)}`, { cache: "no-store" });
          if (r.ok && live) setCmp((await r.json()) as Compare);
        } catch {
          // the rest of the desk stands without it
        }
      })();
    }, 400);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [compareSize]);

  const permalink = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/exit?mint=${mint}&size=${sizeBase}`),
    [mint, sizeBase]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(permalink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const bestVenue = data?.routes?.best?.venue ?? null;
  const shown = traits.find((r) => r.venue === (selected ?? bestVenue)) ?? null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Exit desk</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>What does this holding actually pay out?</h1>
        {t && (
          <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", marginTop: 8 }}>
            slot {data?.slot} · epoch {data?.epoch} · {t.symbol ?? "unknown symbol"} · {t.decimals ?? "?"} decimals
            {supplyTokens ? ` · float ${human(supplyTokens)} tokens` : ""}
          </p>
        )}
        {data && (
          <Link
            href={`/mint/${data.mint}`}
            className="mono"
            style={{ fontSize: 11, color: "var(--color-brand-blue)", display: "inline-block", marginTop: 6 }}
          >
            open this mint&apos;s own terms →
          </Link>
        )}
      </div>

      {/* ── controls ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {entries.map((e) => (
            <button
              key={e.mint}
              onClick={() => {
                setMint(e.mint);
                setSelected(null);
                setTrace([]);
                setDecimals(e.decimals);
              }}
              style={{
                padding: "5px 10px", fontSize: 11, borderRadius: 2,
                border: mint === e.mint ? "1px solid #145FE4" : "1px solid #dedfe1",
                background: mint === e.mint ? "rgba(20,95,228,0.08)" : "#fff",
                color: mint === e.mint ? "#145FE4" : "#6b7280",
                cursor: "pointer", fontFamily: "var(--font-mono)",
              }}
            >
              {e.symbol}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "end" }}>
          <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
            <div className="stack-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span className="label-mono" style={{ fontSize: 10 }}>Size to exit</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                {sizeTokens !== null
                  ? `${human(sizeTokens)} token${sizeTokens === 1 ? "" : "s"}`
                  : "—"}
                {supplyTokens && sizeTokens !== null ? (
                  <span style={{ color: "var(--color-graphite)", fontWeight: 400 }}>
                    {" "}of {human(supplyTokens)} · {((sizeTokens / supplyTokens) * 100).toFixed(2)}% of float
                  </span>
                ) : null}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={POSITIONS}
              value={pos}
              onChange={(e) => {
                const p = Number(e.target.value);
                setPos(p);
                const s = sizeAtPos(p);
                if (s) setSizeBase(s);
              }}
              style={{ width: "100%", accentColor: "#145FE4" }}
              aria-label="size to exit"
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSizeBase(p.base)}
                  style={{
                    padding: "4px 9px", fontSize: 10, borderRadius: 2, cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    border: sizeBase === p.base ? "1px solid #145FE4" : "1px solid #dedfe1",
                    background: sizeBase === p.base ? "rgba(20,95,228,0.08)" : "#fff",
                    color: sizeBase === p.base ? "#145FE4" : "#6b7280",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="label-mono" style={{ fontSize: 10 }}>Exact size, in tokens</span>
              <input
                value={sizeTokens !== null ? String(Number(sizeTokens.toFixed(6))) : ""}
                onChange={(e) => {
                  const b = toBase(e.target.value, decimals);
                  if (b) setSizeBase(b);
                }}
                inputMode="decimal"
                className="mono"
                style={{ padding: "9px 11px", fontSize: 12, width: 190, border: "1px solid #dedfe1", borderRadius: 2, background: "#fff" }}
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => void evaluate(mint, sizeBase)}
                disabled={busy || !mint || !sizeBase}
                style={{
                  padding: "9px 16px", background: "#000", color: "#fff", border: "none",
                  borderRadius: 2, fontSize: 13, fontWeight: 600,
                  cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? "Reading" : "Read again"}
              </button>
              <button
                onClick={() => void copy()}
                style={{
                  padding: "9px 12px", background: "#fff", color: "#6b7280",
                  border: "1px solid #dedfe1", borderRadius: 2, fontSize: 11,
                  fontFamily: "var(--font-mono)", cursor: "pointer",
                }}
              >
                {copied ? "link copied" : "copy link"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── loading / error ──────────────────────────────────────────────── */}
      {busy && !data && (
        <div className="state-card" style={{ color: "var(--color-graphite)", fontSize: 13 }}>
          <span className="mono">reading the mint…</span>
        </div>
      )}
      {err && (
        <div className="state-card state-error">
          <div className="label-mono" style={{ fontSize: 10, color: "var(--color-refuse)", marginBottom: 6 }}>Read failed</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--color-refuse)", wordBreak: "break-all" }}>{err}</div>
          <button
            onClick={() => void evaluate(mint, sizeBase)}
            style={{ marginTop: 10, padding: "6px 12px", fontSize: 11, border: "1px solid #dedfe1", background: "#fff", borderRadius: 2, cursor: "pointer" }}
          >
            try again
          </button>
        </div>
      )}

      {data && t && v && (
        <>
          {/* ── the result, in one line ──────────────────────────────────── */}
          <div className="card" style={{ padding: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <div className="mono" style={{ fontSize: 15, lineHeight: 1.6 }}>
                {sizeTokens !== null ? human(sizeTokens) : n(data.size)} {t.symbol ?? "tokens"}
                <span style={{ color: "var(--color-graphite)" }}> → </span>
                <strong>{landing ? n(landing.lands) : "—"}</strong>
                <span style={{ color: "var(--color-graphite)" }}> USDC lands</span>
                {landing && landing.schedule_bps > 0 && (
                  <span style={{ color: "#8a5a00" }}> · {landing.schedule_bps} bps withheld</span>
                )}
                {data.quote?.price_impact_bps ? (
                  <span style={{ color: "var(--color-graphite)" }}> · {data.quote.price_impact_bps} bps impact</span>
                ) : null}
              </div>
              <code className="mono" style={{ fontSize: 12, fontWeight: 700, color: routed ? "#2E7D32" : "var(--color-refuse)" }}>
                {v.verdict}
                {v.reason ? ` · ${v.reason}` : ""}
              </code>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginTop: 14 }}>
              <Stat label="Quoted by the pool" value={landing ? n(landing.quoted_out) : "—"} sub={data.quote?.route_labels?.join(" · ")} />
              <Stat label="Withheld by the mint" value={landing ? n(landing.withheld) : "—"} sub={landing ? `${landing.schedule_bps} bps` : ""} tone="warn" />
              <Stat label="Lands with the holder" value={landing ? n(landing.lands) : "—"} sub={routed ? "achievable now" : v.reason ?? ""} tone={routed ? "good" : "bad"} />
            </div>

            {trace.length > 1 && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--color-hairline)", paddingTop: 10 }}>
                <div className="label-mono" style={{ fontSize: 10, marginBottom: 8 }}>
                  Cost at the sizes you have read this session
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {trace.map((x) => (
                    <button
                      key={x.size}
                      onClick={() => setSizeBase(x.size)}
                      className="mono"
                      style={{
                        background: "none", border: "none", padding: 0, cursor: "pointer",
                        fontSize: 11,
                        color: x.size === data.size ? "var(--color-onyx)" : "var(--color-graphite)",
                        fontWeight: x.size === data.size ? 700 : 400,
                      }}
                    >
                      {human(fromBase(x.size, decimals))} → {x.costPct.toFixed(2)}%
                      {x.impact ? ` (${x.impact} bps)` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── every route, priced, best marked ────────────────────────── */}
          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="label-mono" style={{ fontSize: 10 }}>Where the exit goes</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--color-graphite)" }}>
                {data.routes.achievable_count} of {traits.length} achievable now
              </span>
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
              {traits.map((r) => {
                const isBest = r.venue === bestVenue;
                const isShown = r.venue === (selected ?? bestVenue);
                return (
                  <button
                    key={r.venue}
                    onClick={() => setSelected(r.venue)}
                    style={{
                      display: "grid", gridTemplateColumns: "150px minmax(0,1fr) auto", gap: 12,
                      alignItems: "baseline", textAlign: "left",
                      cursor: r.achievable_now ? "pointer" : "default",
                      padding: "9px 10px", borderRadius: 2, fontFamily: "inherit",
                      border: isShown ? "1px solid #145FE4" : "1px solid transparent",
                      background: isShown ? "rgba(20,95,228,0.05)" : "transparent",
                    }}
                  >
                    <code className="mono" style={{ fontSize: 12, color: "var(--color-onyx)" }}>{r.venue}</code>
                    <span className="mono" style={{ fontSize: 12, color: r.achievable_now ? "var(--color-onyx)" : "var(--color-graphite)" }}>
                      {r.achievable_now
                        ? `lands ${n(r.effective_out)}${r.price_impact_bps ? ` · impact ${r.price_impact_bps} bps` : ""}`
                        : `not achievable · ${r.unavailable_reason}`}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: isBest ? "#2E7D32" : "var(--color-graphite)" }}>
                      {isBest ? "best at this size" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            {shown?.achievable_now && (
              <div className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", marginTop: 10, borderTop: "1px solid var(--color-hairline)", paddingTop: 10 }}>
                via {shown.venue}: {n(shown.out_amount)} out of the venue · {n(shown.effective_out)} after the mint&apos;s fee
                {shown.effective_cost_bps != null ? ` · total ${Math.round(shown.effective_cost_bps)} bps` : ""}
                {shown.hops ? ` · ${shown.hops} hop${shown.hops === 1 ? "" : "s"}` : ""}
              </div>
            )}
          </div>

          {/* ── the checks, and the schedules behind them ────────────────── */}
          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="label-mono" style={{ fontSize: 10, marginBottom: 12 }}>Checks behind the verdict</div>
            <div style={{ display: "grid", gap: 7 }}>
              {v.checks.map((c) => (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "18px minmax(0,240px) minmax(0,1fr)", gap: 10, alignItems: "baseline", fontSize: 12 }}>
                  <span style={{ color: c.passed ? "#2E7D32" : "var(--color-refuse)" }}>{c.passed ? "✓" : "✕"}</span>
                  <code className="mono" style={{ color: "var(--color-onyx)" }}>{c.id}</code>
                  <span className="mono" style={{ color: "var(--color-graphite)", wordBreak: "break-all" }}>
                    {c.value === null || c.value === undefined ? "—" : typeof c.value === "object" ? JSON.stringify(c.value) : String(c.value)}
                  </span>
                </div>
              ))}
            </div>

            <details style={{ marginTop: 14 }}>
              <summary className="label-mono" style={{ fontSize: 10, cursor: "pointer" }}>
                The fee, charged twice · transfer-fee schedules on the mint
              </summary>
              {v.round_trip && (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--color-onyx)", lineHeight: 1.6 }}>
                  A fee is withheld on every transfer, in as well as out. Both legs of a round trip on this holding cost{" "}
                  <strong>{n(v.round_trip.total_cost)}</strong> ({v.round_trip.effective_total_bps} bps), against{" "}
                  {landing ? landing.schedule_bps : "—"} bps for the exit alone.
                  {v.round_trip.capped && " One leg hit the mint's maximum fee."} A mint is exempt, so whether the first
                  leg was charged to you depends on how the position reached you.
                </p>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 10 }}>
                <thead>
                  <tr>
                    {["schedule", "epoch", "basis points", "maximum fee", "state"].map((h) => (
                      <th key={h} className="label-mono" style={{ textAlign: "left", fontSize: 10, padding: "6px 8px", borderBottom: "1px solid #9ca3af" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([["older", t.fee_older], ["newer", t.fee_newer]] as const).map(([label, s]) => {
                    const sch = s as FeeSchedule | null;
                    const inForce = t.fee_effective && sch && t.fee_effective.epoch === sch.epoch;
                    return (
                      <tr key={label}>
                        <td className="mono" style={{ padding: "7px 8px", borderBottom: "1px solid #edeff2" }}>{label}</td>
                        <td className="mono" style={{ padding: "7px 8px", borderBottom: "1px solid #edeff2" }}>{sch?.epoch ?? "—"}</td>
                        <td className="mono" style={{ padding: "7px 8px", borderBottom: "1px solid #edeff2" }}>{sch?.bps ?? "—"}</td>
                        <td className="mono" style={{ padding: "7px 8px", borderBottom: "1px solid #edeff2" }}>{sch ? n(sch.maximum_fee) : "—"}</td>
                        <td className="mono" style={{ padding: "7px 8px", borderBottom: "1px solid #edeff2", color: inForce ? "#2E7D32" : "#8a5a00", fontWeight: inForce ? 700 : 400 }}>
                          {inForce ? "IN FORCE" : "not in force"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--color-graphite)" }}>
                {t.fee_exact ? "Read from the account bytes." : "Read from parsed values; u64 fields may be imprecise."}
              </p>
            </details>
          </div>

          {/* ── the announced change ─────────────────────────────────────── */}
          {t.fee_pending && (
            <div className="card" style={{ padding: 16, marginBottom: 14, borderLeft: "3px solid #FFB020" }}>
              <div className="label-mono" style={{ fontSize: 10, marginBottom: 6, color: "#8a5a00" }}>Schedule not yet in force</div>
              <div style={{ fontSize: 13, color: "var(--color-onyx)", lineHeight: 1.6 }}>
                A second schedule of <strong>{t.fee_pending.bps} bps</strong> takes effect at epoch{" "}
                <strong>{t.fee_pending.epoch}</strong>; the chain is at {data.epoch}.
                {landing?.withheld_after_pending && (
                  <> The same exit would then withhold <strong>{n(landing.withheld_after_pending)}</strong> instead of {n(landing.withheld)}.</>
                )}
              </div>
            </div>
          )}

          {/* ── the route across issuers, recreated on devnet ────────────── */}
          {rep && (
            <div className="card" style={{ padding: 20, marginBottom: 14 }}>
              <div className="label-mono" style={{ fontSize: 10, marginBottom: 10 }}>The route across issuers · devnet</div>
              <div style={{ display: "grid", gap: 7 }}>
                {[rep.issuer_b, rep.issuer_a].map((x, i) => (
                  <div key={x.pool} style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", gap: 12, fontSize: 12, alignItems: "baseline" }}>
                    <code className="mono" style={{ color: "var(--color-onyx)" }}>
                      {i === 0 ? "issuer B" : "issuer A"} {short(x.pool, 5, 4)}
                    </code>
                    <span className="mono" style={{ color: "var(--color-graphite)" }}>
                      issuer vault {n(x.vault_issuer.lamports_or_units)} · quote vault {n(x.vault_quote.lamports_or_units)}
                    </span>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", gap: 12, fontSize: 12, alignItems: "baseline" }}>
                  <code className="mono" style={{ color: "var(--color-onyx)" }}>one transaction</code>
                  <span className="mono" style={{ color: rep.cross_issuer.confirmed ? "#2E7D32" : "var(--color-refuse)" }}>
                    {rep.cross_issuer.legs_in_one_transaction} swaps · sold {n(rep.cross_issuer.measured.issuer_b_spent)} of B
                    · landed {n(rep.cross_issuer.measured.issuer_a_received)} of A
                    · {rep.cross_issuer.confirmed ? "confirmed on chain" : "not confirmed"}
                  </span>
                </div>
              </div>
              <a
                className="mono"
                href={`https://explorer.solana.com/tx/${rep.cross_issuer.sig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", marginTop: 12, fontSize: 11, color: "var(--color-graphite)" }}
              >
                {short(rep.cross_issuer.sig, 12, 6)} ↗
              </a>
            </div>
          )}

          {/* ── the same company at both issuers ─────────────────────────── */}
          {cmp && (
            <div className="card" style={{ padding: 20, marginBottom: 14 }}>
              <div className="label-mono" style={{ fontSize: 10, marginBottom: 4 }}>The same company at both issuers · devnet</div>
              <p className="mono" style={{ margin: "0 0 10px", fontSize: 11, color: "var(--color-graphite)" }}>
                priced at {n(cmp.size)} base units
                {sizeBase && cmp.size !== sizeBase
                  ? ` · clamped, because these pools cannot absorb the ${n(sizeBase)} the desk is reading`
                  : ""}
              </p>
              {cmp.issuers.map((x) => (
                <div key={x.label} style={{ display: "grid", gap: 6, borderTop: "1px solid var(--color-hairline)", paddingTop: 10, marginTop: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", gap: 12, fontSize: 12, alignItems: "baseline" }}>
                    <code className="mono" style={{ color: "var(--color-onyx)" }}>issuer {x.label} {short(x.pool, 5, 4)}</code>
                    {x.refused ? (
                      <span className="mono" style={{ color: "var(--color-refuse)" }}>refused: {x.refused}</span>
                    ) : (
                      <span className="mono" style={{ color: "var(--color-onyx)" }}>
                        {n(x.mintFeeWithheld)} withheld at {x.mintFeeBpsInForce ?? 0} bps · {n(x.rawOutOfPool)} out of the pool
                        · <strong>{n(x.lands)} lands</strong>
                      </span>
                    )}
                  </div>
                  {!x.refused && (
                    <div className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
                      {x.landedPerToken != null && x.spotPerToken
                        ? `${x.landedPerToken.toFixed(6)} SOL per token · ${(((x.landedPerToken - x.spotPerToken) / x.spotPerToken) * 100).toFixed(2)}% to fees and depth`
                        : "—"}
                      {x.depth ? ` · depth ${n(x.depth)}` : ""}
                      {x.scheduleInForce?.pendingBps
                        ? ` · ${x.scheduleInForce.pendingBps} bps announced for epoch ${x.scheduleInForce.pendingAtEpoch}`
                        : ""}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", gap: 12, fontSize: 12, alignItems: "baseline", marginTop: 14 }}>
                <code className="mono" style={{ color: "var(--color-onyx)" }}>apart by</code>
                <span className="mono" style={{ color: "var(--color-onyx)" }}>
                  {cmp.refused ? `refused: ${cmp.refused}` : `${cmp.spreadBps} bps at this size — ${cmp.better} lands more than ${cmp.worse}`}
                </span>
              </div>
              {cmp.rail && (
                <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", gap: 12, fontSize: 12, alignItems: "baseline", marginTop: 8 }}>
                  <code className="mono" style={{ color: "var(--color-onyx)" }}>the rail</code>
                  <span className="mono" style={{ color: "var(--color-graphite)" }}>
                    {cmp.rail.available ? (
                      <>
                        {cmp.rail.from} → {cmp.rail.to} · leg 1 {n(cmp.rail.leg1?.out)} · leg 2 {n(cmp.rail.leg2?.out)} ·{" "}
                        {cmp.rail.legs} swaps in one transaction · costs {n(cmp.rail.costOfTheRail)}
                      </>
                    ) : (
                      <>unavailable right now: {cmp.rail.reason}</>
                    )}
                  </span>
                </div>
              )}
              <details style={{ marginTop: 12 }}>
                <summary className="label-mono" style={{ fontSize: 10, cursor: "pointer" }}>Why this spread exists</summary>
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--color-graphite)" }}>
                  These two pools were opened for this replica, so the spread is the mechanism being priced rather than a
                  dislocation in a real market. On the network no second issuer of this company trades yet, and the desk
                  says so instead of quoting one.
                </p>
              </details>
            </div>
          )}

          {/* ── the mint's levers ────────────────────────────────────────── */}
          <div className="card" style={{ padding: 20 }}>
            <div className="label-mono" style={{ fontSize: 10, marginBottom: 12 }}>
              Authorities · {t.authority.total_levers} levers behind {t.authority.distinct_keys} key
              {t.authority.distinct_keys === 1 ? "" : "s"}
            </div>
            {t.authority.distinct_keys === 1 ? (
              <>
                <code className="mono" style={{ display: "block", fontSize: 12, color: "var(--color-onyx)", wordBreak: "break-all" }}>
                  {t.authority.levers[0]?.key}
                </code>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  {t.authority.levers.map((l) => (
                    <span
                      key={l.lever}
                      className="mono"
                      style={{ fontSize: 10, color: "var(--color-graphite)", border: "1px solid var(--color-hairline)", padding: "3px 7px", borderRadius: 2 }}
                    >
                      {l.lever}
                    </span>
                  ))}
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--color-graphite)" }}>
                  One key behind all {t.authority.total_levers} levers: it cannot move a holder&apos;s tokens.
                </p>
              </>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {t.authority.levers.map((l) => (
                  <div key={l.lever} style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", gap: 12, fontSize: 12, alignItems: "baseline" }}>
                    <code className="mono" style={{ color: "var(--color-onyx)" }}>{l.lever}</code>
                    <code className="mono" style={{ color: "var(--color-graphite)", wordBreak: "break-all" }}>{l.key}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "bad" }) {
  const colour =
    tone === "good" ? "#2E7D32" : tone === "warn" ? "#8a5a00" : tone === "bad" ? "var(--color-refuse)" : "var(--color-onyx)";
  return (
    <div style={{ border: "1px solid var(--color-hairline)", padding: 14, borderRadius: 2, minWidth: 0 }}>
      <div className="label-mono" style={{ fontSize: 10, marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: colour, wordBreak: "break-all" }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 10, color: "var(--color-graphite)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
