"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";

/**
 * The verification page runs on the click.
 *
 * A page that shows a table of refusals proves nothing — it could be a
 * screenshot. Every row here is produced by the request this button makes, and
 * the response carries the time it was taken so that is checkable.
 */

type Case = {
  id: string;
  what: string;
  mint: string;
  size: string;
  network: string;
  verdict: string;
  refusal?: string | null;
  failed_check?: string | null;
  tripped?: { check: string; value: unknown; detail: unknown } | null;
  landing?: { quoted_out: string; schedule_bps: number; withheld: string; lands: string } | null;
  quote_error?: string;
  error?: string;
};

type Ablation = {
  evaluated_at_epoch?: number;
  in_force_now?: number;
  older?: { bps: number; epoch: number };
  newer?: { bps: number; epoch: number };
  with_the_epoch_read?: { bps: number; lands: string };
  with_the_epoch_read_removed?: { bps: number; lands: string };
  the_read_is_worth?: string;
  error?: string;
};

const REFUSAL_TONE: Record<string, string> = {
  mint_not_token_2022: "#B45309",
  impact_over_bound: "#B45309",
  fee_consumes_position: "#B45309",
  no_exit_route: "#B45309",
  mint_paused: "#B45309",
  transfer_hook_installed: "#B45309",
};

function Verdict({ c }: { c: Case }) {
  if (c.verdict === "ROUTE") {
    return <span className="mono" style={{ fontSize: 11, color: "#15803D" }}>ROUTE</span>;
  }
  if (c.verdict === "ERROR") {
    return <span className="mono" style={{ fontSize: 11, color: "#B91C1C" }}>ERROR</span>;
  }
  return (
    <span className="mono" style={{ fontSize: 11, color: REFUSAL_TONE[c.refusal ?? ""] ?? "#B45309" }}>
      {c.refusal ?? c.verdict}
    </span>
  );
}

export default function VerifyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/verify", { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error || `verification returned ${r.status}`);
      setData(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const cases: Case[] = data?.cases ?? [];
  const ablation: Ablation | null = data?.ablation ?? null;

  return (
    <DashboardLayout active="verify">
      <div style={{ marginBottom: 28 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Verification</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>Run the checks, live</h1>
        <p className="body-text" style={{ marginTop: 8, maxWidth: "64ch" }}>
          Each row below is evaluated against real chain state by the request this page makes. Nothing is
          precomputed and nothing is cached, so a refusal here is a refusal now, and a table like this
          cannot be a screenshot.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={run}
          disabled={loading}
          className="mono"
          style={{
            fontSize: 12, padding: "8px 16px", borderRadius: 6, cursor: loading ? "wait" : "pointer",
            border: "1px solid var(--color-ash)", background: loading ? "#F8F8FA" : "#111", color: loading ? "#6B7280" : "#fff",
          }}
        >
          {loading ? "running…" : "Run again"}
        </button>
        {data?.evaluated_at && (
          <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
            taken {data.evaluated_at} · chain epoch {data.chain_epoch}
          </span>
        )}
      </div>

      {error && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <p className="mono" style={{ fontSize: 12, color: "#B91C1C", margin: 0 }}>failed to run: {error}</p>
        </div>
      )}

      {!data && loading && (
        <div className="card" style={{ padding: 20 }}>
          <p className="mono" style={{ fontSize: 12, color: "var(--color-graphite)", margin: 0 }}>
            reading the chain and evaluating each case…
          </p>
        </div>
      )}

      {data && (
        <>
          <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--color-ash)", display: "flex", justifyContent: "space-between" }}>
              <span className="label-mono" style={{ fontSize: 10 }}>Break matrix</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)" }}>
                {data.refusals} refusals · {(data.distinct_refusals ?? []).length} distinct reasons
              </span>
            </div>
            {cases.map((c, i) => (
              <div key={c.id} style={{ padding: "18px 24px", borderBottom: i < cases.length - 1 ? "1px solid var(--color-ash)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.what}</span>
                  <Verdict c={c} />
                </div>
                <p className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", margin: "0 0 6px", wordBreak: "break-all" }}>
                  {c.mint} · size {c.size} · {c.network}
                </p>
                {c.tripped && (
                  <p className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", margin: 0 }}>
                    {c.tripped.check} saw {JSON.stringify(c.tripped.value)}
                    {c.tripped.detail ? ` against ${JSON.stringify(c.tripped.detail)}` : ""}
                  </p>
                )}
                {c.landing && (
                  <p className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", margin: 0 }}>
                    quoted {c.landing.quoted_out} · {c.landing.schedule_bps} bps · withheld {c.landing.withheld} · lands {c.landing.lands}
                  </p>
                )}
                {c.quote_error && !c.landing && (
                  <p className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", margin: 0 }}>{c.quote_error}</p>
                )}
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: "18px 24px", marginBottom: 20 }}>
            <span className="label-mono" style={{ fontSize: 10 }}>Ablation</span>
            {ablation?.error ? (
              <p className="mono" style={{ fontSize: 12, color: "#B91C1C", margin: "10px 0 0" }}>{ablation.error}</p>
            ) : ablation?.with_the_epoch_read ? (
              <>
                <p className="body-text" style={{ fontSize: 13, margin: "10px 0 12px" }}>
                  The same exit, priced at epoch {ablation.evaluated_at_epoch} — once the announced schedule
                  has taken effect — with the epoch read and with it removed.
                </p>
                <div style={{ display: "grid", gap: 6 }}>
                  <p className="mono" style={{ fontSize: 11, margin: 0 }}>
                    with the epoch read&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{ablation.with_the_epoch_read.bps} bps → lands {ablation.with_the_epoch_read.lands}
                  </p>
                  <p className="mono" style={{ fontSize: 11, margin: 0 }}>
                    with it removed&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{ablation.with_the_epoch_read_removed?.bps} bps → lands {ablation.with_the_epoch_read_removed?.lands}
                  </p>
                  <p className="mono" style={{ fontSize: 11, margin: "6px 0 0", color: "var(--color-brand-blue)" }}>
                    the read is worth {ablation.the_read_is_worth} micro-units on this exit
                  </p>
                  <p className="mono" style={{ fontSize: 11, margin: "6px 0 0", color: "var(--color-graphite)" }}>
                    in force now {ablation.in_force_now} · older {ablation.older?.bps} bps at {ablation.older?.epoch} · newer {ablation.newer?.bps} bps at {ablation.newer?.epoch}
                  </p>
                </div>
              </>
            ) : null}
          </div>

          <div className="card" style={{ padding: "18px 24px" }}>
            <span className="label-mono" style={{ fontSize: 10 }}>On chain</span>
            <p className="body-text" style={{ fontSize: 13, margin: "10px 0 0" }}>{data.on_chain}</p>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
