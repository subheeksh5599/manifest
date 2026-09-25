"use client";

import { useCallback, useEffect, useState } from "react";
import type { RegistryEntry } from "@/lib/registry";

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

type ReplicaIssuer = {
  mint: string;
  fee_bps: number | null;
  pool: string;
  pool_exists: boolean;
  pool_owner_is_whirlpool: boolean;
  vault_quote: { address: string; lamports_or_units: string; exists: boolean };
  vault_issuer: { address: string; lamports_or_units: string; exists: boolean };
  deposit_confirmed: boolean;
};

type Replica = {
  network: string;
  slot: number;
  issuer_a: ReplicaIssuer;
  issuer_b: ReplicaIssuer;
  cross_issuer: {
    sig: string;
    from: string;
    to: string;
    legs_in_one_transaction: number;
    confirmed: boolean;
    slot: number | null;
    touches_whirlpool: boolean;
    measured: { issuer_b_spent: string; issuer_a_received: string; quote_asset: string; quote_asset_left_behind: string };
  };
  both_pools_live: boolean;
};

type CompareIssuer = {
  label: string;
  mint: string;
  pool: string;
  refused?: string;
  mintFeeBpsInForce?: number;
  mintFeeWithheld?: string;
  intoPool?: string;
  lands?: string;
  landedPerToken?: number;
  spotPerToken?: number | null;
  rawOutOfPool?: string;
  poolFeeMicro?: number;
  pricePerToken?: number;
  depth?: string;
  tick?: number;
  priceMovedPct?: number;
  scheduleInForce?: {
    bps: number;
    sinceEpoch: number | null;
    pendingBps: number | null;
    pendingAtEpoch: number | null;
  };
};

type Compare = {
  size: string;
  issuers: CompareIssuer[];
  better?: string | null;
  worse?: string;
  spreadBps?: number | null;
  landsAt?: Record<string, string>;
  refused?: string | null;
  rail?: {
    available: boolean;
    reason?: string;
    from?: string;
    to?: string;
    legs?: number;
    inOneTransaction?: boolean;
    leg1?: { out: string; fee: string };
    leg2?: { out: string; fee: string };
    costOfTheRail?: string;
  } | null;
};

const n = (v: string | null | undefined) => {
  if (v === null || v === undefined) return "—";
  try {
    return BigInt(v).toLocaleString("en-US");
  } catch {
    return String(v);
  }
};

const short = (v: string | null | undefined, head = 6, tail = 4) =>
  !v ? "—" : v.length <= head + tail + 1 ? v : `${v.slice(0, head)}…${v.slice(-tail)}`;

export default function ExitDesk({ entries }: { entries: RegistryEntry[] }) {
  // Open on the issuer whose exit terms are not free, so the desk shows the
  // mechanism on load rather than a zero.
  const [mint, setMint] = useState(
    entries.find((e) => e.issuer === "PreStocks")?.mint ?? entries[0]?.mint ?? ""
  );
  const [size, setSize] = useState("1000000000");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Exit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rep, setRep] = useState<Replica | null>(null);
  const [cmp, setCmp] = useState<Compare | null>(null);

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

  // The comparison is about the size the user is asking about, so it follows the
  // size field rather than the mint. It is priced live for each keystroke that
  // leaves a valid number, after a beat, and it keeps the last good answer on
  // screen while the next one is in flight rather than blanking.
  useEffect(() => {
    if (!/^[1-9][0-9]*$/.test(size)) return;
    let live = true;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const r = await fetch(`/api/compare?size=${encodeURIComponent(size)}`, { cache: "no-store" });
          if (r.ok && live) setCmp((await r.json()) as Compare);
        } catch {
          // the rest of the desk stands without it
        }
      })();
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [size]);

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
      }
    } catch (e) {
      setData(null);
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (mint && /^[1-9][0-9]*$/.test(size)) void evaluate(mint, size);
    // evaluated once on mount against the live chain
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = data?.terms;
  const v = data?.verdict;
  const landing = v?.landing ?? null;
  const routed = v?.verdict === "ROUTE";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Exit desk</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>What does this holding actually pay out?</h1>
        {t && (
          <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", marginTop: 8 }}>
            slot {data?.slot} · epoch {data?.epoch} · {t.symbol ?? "unknown symbol"} · {t.decimals ?? "?"} decimals
          </p>
        )}
      </div>

      {/* inputs */}
      <div className="card" style={{ padding: 20, display: "grid", gap: 14, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px auto", gap: 12, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="label-mono" style={{ fontSize: 10 }}>Mint</span>
            <input
              value={mint}
              onChange={(e) => setMint(e.target.value.trim())}
              spellCheck={false}
              className="mono"
              style={{ padding: "9px 11px", fontSize: 12, border: "1px solid #dedfe1", borderRadius: 2, background: "#fff" }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="label-mono" style={{ fontSize: 10 }}>Size (base units)</span>
            <input
              value={size}
              onChange={(e) => setSize(e.target.value.trim())}
              inputMode="numeric"
              className="mono"
              style={{ padding: "9px 11px", fontSize: 12, border: "1px solid #dedfe1", borderRadius: 2, background: "#fff" }}
            />
          </label>
          <button
            onClick={() => void evaluate(mint, size)}
            disabled={busy || !mint || !/^[1-9][0-9]*$/.test(size)}
            style={{
              padding: "10px 18px", background: "#000", color: "#fff", border: "none",
              borderRadius: 2, fontSize: 13, fontWeight: 600,
              cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Reading" : "Read the exit"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {entries.map((e) => (
            <button
              key={e.mint}
              onClick={() => { setMint(e.mint); void evaluate(e.mint, size); }}
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
      </div>

      {err && (
        <div style={{ padding: "12px 16px", background: "rgba(255,77,77,0.06)", borderRadius: 8, fontSize: 13, color: "var(--color-refuse)", marginBottom: 20 }}>
          {err}
        </div>
      )}

      {data && t && v && (
        <>
          {/* the three numbers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Stat label="Quoted by the pool" value={landing ? n(landing.quoted_out) : "—"} sub={data.quote?.route_labels?.join(" · ")} />
            <Stat label="Withheld by the mint" value={landing ? n(landing.withheld) : "—"} sub={landing ? `${landing.schedule_bps} bps` : ""} tone="warn" />
            <Stat label="Lands with the holder" value={landing ? n(landing.lands) : "—"} sub={routed ? "achievable now" : v.reason ?? ""} tone={routed ? "good" : "bad"} />
          </div>

          {/* the fee, charged twice */}
          {v.round_trip && (
            <div style={{ padding: "14px 18px", background: "rgba(0,0,0,0.03)", borderLeft: "3px solid var(--color-brand-blue)", marginBottom: 16 }}>
              <div className="label-mono" style={{ fontSize: 10, marginBottom: 6 }}>The fee, charged twice</div>
              <div style={{ fontSize: 13, color: "var(--color-onyx)", lineHeight: 1.6 }}>
                A transfer fee is withheld on every transfer, in as well as out. Together the two legs of a
                round trip on this holding cost <strong>{n(v.round_trip.total_cost)}</strong>, which is{" "}
                <strong>{v.round_trip.effective_total_bps} bps</strong> of the position — against{" "}
                {landing ? landing.schedule_bps : "—"} bps for the exit alone.
                {v.round_trip.capped && <> One leg here hit the mint's maximum fee.</>}
                {" "}A mint is exempt, so whether the first leg was charged to you depends on how the position
                reached you.
              </div>
            </div>
          )}

          {/* the announced change */}
          {t.fee_pending && (
            <div style={{ padding: "14px 18px", background: "rgba(255,176,32,0.08)", borderLeft: "3px solid #FFB020", marginBottom: 16 }}>
              <div className="label-mono" style={{ fontSize: 10, marginBottom: 6, color: "#8a5a00" }}>Schedule not yet in force</div>
              <div style={{ fontSize: 13, color: "var(--color-onyx)", lineHeight: 1.6 }}>
                The mint carries a second transfer-fee schedule of <strong>{t.fee_pending.bps} bps</strong> that
                takes effect at epoch <strong>{t.fee_pending.epoch}</strong>. The chain is at epoch {data.epoch}.
                {landing?.withheld_after_pending && (
                  <> The same exit would then withhold <strong>{n(landing.withheld_after_pending)}</strong> instead of {n(landing.withheld)}.</>
                )}
              </div>
            </div>
          )}

          {/* verdict */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="label-mono" style={{ fontSize: 10 }}>Verdict</div>
              <code className="mono" style={{ fontSize: 12, fontWeight: 700, color: routed ? "var(--color-graphite)" : "var(--color-refuse)" }}>
                {v.verdict}{v.reason ? ` · ${v.reason}` : ""}
              </code>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {v.checks.map((c) => (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "18px 260px 1fr", gap: 10, alignItems: "baseline", fontSize: 12 }}>
                  <span style={{ color: c.passed ? "#2E7D32" : "var(--color-refuse)" }}>{c.passed ? "✓" : "✕"}</span>
                  <code className="mono" style={{ color: "var(--color-onyx)" }}>{c.id}</code>
                  <span className="mono" style={{ color: "var(--color-graphite)", wordBreak: "break-all" }}>
                    {c.value === null || c.value === undefined ? "—" : typeof c.value === "object" ? JSON.stringify(c.value) : String(c.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* fee schedules side by side */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="label-mono" style={{ fontSize: 10, marginBottom: 12 }}>Transfer-fee schedules on the mint</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["schedule", "epoch", "basis points", "maximum fee", "state"].map((h) => (
                    <th key={h} className="label-mono" style={{ textAlign: "left", fontSize: 10, padding: "6px 8px", borderBottom: "1px solid #9ca3af" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["older", t.fee_older],
                  ["newer", t.fee_newer],
                ].map(([label, s]) => {
                  const sch = s as FeeSchedule | null;
                  const inForce = t.fee_effective && sch && t.fee_effective.epoch === sch.epoch;
                  return (
                    <tr key={label as string}>
                      <td className="mono" style={{ padding: "7px 8px", borderBottom: "1px solid #edeff2" }}>{label as string}</td>
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
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--color-graphite)" }}>
              {t.fee_exact ? "Read from the account bytes." : "Read from parsed values; u64 fields may be imprecise."}
            </p>
          </div>

          {/* routes */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="label-mono" style={{ fontSize: 10, marginBottom: 12 }}>Exit routes</div>
            <div style={{ display: "grid", gap: 10 }}>
              {data.routes.routes.map((r) => (
                <div key={r.venue} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 12, fontSize: 12, alignItems: "baseline" }}>
                  <code className="mono" style={{ color: "var(--color-onyx)" }}>{r.venue}</code>
                  <span className="mono" style={{ color: "var(--color-graphite)" }}>
                    {r.available
                      ? `lands ${n(r.effective_out)}${r.price_impact_bps ? ` · impact ${r.price_impact_bps} bps` : ""}`
                      : `not achievable · ${r.unavailable_reason}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* the same shape, recreated on devnet, with the route across issuers */}
          {rep && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="label-mono" style={{ fontSize: 10, marginBottom: 4 }}>
                The route across issuers · devnet
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--color-graphite)" }}>
                Two issuers, each with its own pool against wrapped SOL, both holding real
                liquidity{rep.both_pools_live ? "" : " (one is not live right now)"}.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {[rep.issuer_b, rep.issuer_a].map((x, i) => (
                  <div key={x.pool} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, fontSize: 12, alignItems: "baseline" }}>
                    <code className="mono" style={{ color: "var(--color-onyx)" }}>
                      {i === 0 ? "issuer B" : "issuer A"} {short(x.pool, 5, 4)}
                    </code>
                    <span className="mono" style={{ color: "var(--color-graphite)" }}>
                      issuer vault {n(x.vault_issuer.lamports_or_units)} · quote vault {n(x.vault_quote.lamports_or_units)}
                      {x.pool_owner_is_whirlpool ? "" : " · not a pool"}
                    </span>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, fontSize: 12, alignItems: "baseline", marginTop: 4 }}>
                  <code className="mono" style={{ color: "var(--color-onyx)" }}>one transaction</code>
                  <span className="mono" style={{ color: rep.cross_issuer.confirmed ? "#2E7D32" : "var(--color-refuse)" }}>
                    {rep.cross_issuer.legs_in_one_transaction} swaps · sold {n(rep.cross_issuer.measured.issuer_b_spent)} of issuer B
                    · landed {n(rep.cross_issuer.measured.issuer_a_received)} of issuer A
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


          {/* the same company at both issuers, priced at the size in the box */}
          {cmp && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="label-mono" style={{ fontSize: 10, marginBottom: 4 }}>
                The same company at both issuers · devnet
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--color-graphite)" }}>
                Priced at your size, after the mint fee actually in force and the pool's own fee.
                Both numbers are read on this page load; nothing here is remembered between visits.
              </p>

              {cmp.issuers.map((x) => (
                <div
                  key={x.label}
                  style={{ display: "grid", gap: 6, borderTop: "1px solid var(--color-hairline)", paddingTop: 10, marginTop: 10 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, fontSize: 12, alignItems: "baseline" }}>
                    <code className="mono" style={{ color: "var(--color-onyx)" }}>
                      issuer {x.label} {short(x.pool, 5, 4)}
                    </code>
                    {x.refused ? (
                      <span className="mono" style={{ color: "var(--color-refuse)" }}>
                        refused: {x.refused}
                      </span>
                    ) : (
                      <span className="mono" style={{ color: "var(--color-onyx)" }}>
                        {n(x.mintFeeWithheld)} withheld at {x.mintFeeBpsInForce ?? 0} bps · {n(x.intoPool)} into the pool
                        · {n(x.rawOutOfPool)} out of the pool · <strong>{n(x.lands)} lands</strong>
                      </span>
                    )}
                  </div>
                  {!x.refused && (
                    <div style={{ display: "grid", gap: 4 }}>
                      {[
                        ["price", x.pricePerToken ? `${x.pricePerToken.toFixed(4)} tokens per SOL` : "—"],
                        ["spot", x.spotPerToken ? `${x.spotPerToken.toFixed(6)} SOL per token` : null],
                        [
                          "you land",
                          x.landedPerToken != null && x.spotPerToken
                            ? `${x.landedPerToken.toFixed(6)} SOL per token (${(((x.landedPerToken - x.spotPerToken) / x.spotPerToken) * 100).toFixed(2)}% to fees and depth)`
                            : null,
                        ],
                        ["depth", n(x.depth)],
                        ["tick", String(x.tick)],
                        [
                          "scheduled",
                          x.scheduleInForce?.pendingBps
                            ? `${x.scheduleInForce.pendingBps} bps at epoch ${x.scheduleInForce.pendingAtEpoch}`
                            : null,
                        ],
                      ]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div
                            key={k as string}
                            style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, fontSize: 11, alignItems: "baseline" }}
                          >
                            <code className="mono" style={{ color: "var(--color-graphite)" }}>{k}</code>
                            <span className="mono" style={{ color: "var(--color-onyx)" }}>{v}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, fontSize: 12, alignItems: "baseline", marginTop: 14 }}>
                <code className="mono" style={{ color: "var(--color-onyx)" }}>apart by</code>
                <span className="mono" style={{ color: "var(--color-onyx)" }}>
                  {cmp.refused
                    ? `refused: ${cmp.refused}`
                    : `${cmp.spreadBps} bps at this size — ${cmp.better} lands more than ${cmp.worse}`}
                </span>
              </div>

              {cmp.rail && (
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, fontSize: 12, alignItems: "baseline", marginTop: 8 }}>
                  <code className="mono" style={{ color: "var(--color-onyx)" }}>the rail</code>
                  <span className="mono" style={{ color: "var(--color-graphite)" }}>
                    {cmp.rail.available ? (
                      <>
                        {cmp.rail.from} → {cmp.rail.to} · leg 1 {n(cmp.rail.leg1?.out)} · leg 2 {n(cmp.rail.leg2?.out)}
                        {" · "}
                        {cmp.rail.legs} swaps in one transaction · costs {n(cmp.rail.costOfTheRail)}
                      </>
                    ) : (
                      <>unavailable right now: {cmp.rail.reason}</>
                    )}
                  </span>
                </div>
              )}
              <p style={{ margin: "12px 0 0", fontSize: 10, color: "var(--color-graphite)" }}>
                These two pools were opened for this replica, so the spread is the mechanism being
                priced rather than a dislocation in a real market. On mainnet no second issuer of
                this company trades yet, and the desk says so instead of quoting one.
              </p>
            </div>
          )}

          {/* the mint's levers */}
          <div className="card" style={{ padding: 20 }}>
            <div className="label-mono" style={{ fontSize: 10, marginBottom: 12 }}>
              Authorities · {t.authority.total_levers} levers behind {t.authority.distinct_keys} key{t.authority.distinct_keys === 1 ? "" : "s"}
            </div>
            {t.authority.distinct_keys === 1 ? (
              <>
                <code
                  className="mono"
                  style={{ display: "block", fontSize: 12, color: "var(--color-onyx)", wordBreak: "break-all" }}
                >
                  {t.authority.levers[0]?.key}
                </code>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  {t.authority.levers.map((l) => (
                    <span
                      key={l.lever}
                      className="mono"
                      style={{
                        fontSize: 10, color: "var(--color-graphite)",
                        border: "1px solid var(--color-hairline)", padding: "3px 7px", borderRadius: 2,
                      }}
                    >
                      {l.lever}
                    </span>
                  ))}
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--color-graphite)" }}>
                  One key behind all {t.authority.total_levers} levers: it cannot move a holder&apos;s tokens, and nothing in this
                  repository holds it.
                </p>
              </>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {t.authority.levers.map((l) => (
                  <div key={l.lever} style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 12, fontSize: 12, alignItems: "baseline" }}>
                    <code className="mono" style={{ color: "var(--color-onyx)" }}>{l.lever}</code>
                    <code className="mono" style={{ color: "var(--color-graphite)", wordBreak: "break-all" }}>{l.key}</code>
                  </div>
                ))}
              </div>
            )}
            <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--color-graphite)" }}>
              Round trip on this size costs {n(v.round_trip.total_cost)} ·
              the fee is charged twice, once on the way in and once on the way out.
            </p>
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
    <div className="card" style={{ padding: 18 }}>
      <div className="label-mono" style={{ fontSize: 10, marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: colour, wordBreak: "break-all" }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 10, color: "var(--color-graphite)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}
