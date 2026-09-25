import fs from "node:fs";
import path from "node:path";
import DashboardLayout from "@/components/dashboard-layout";

export const dynamic = "force-dynamic";

/** One recorded read: what the mint said at the slot it was read at. */
type Rec = {
  ts: number;
  symbol: string | null;
  mint: string;
  slot: number;
  epoch: number;
  source: string;
  fee_in_force_bps: number | null;
  fee_pending_bps: number | null;
  fee_pending_epoch: number | null;
  withheld_amount: string | null;
};

function loadTape(): Rec[] {
  const p = path.join(process.cwd(), "data", "readings.jsonl");
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Rec)
    .reverse();
}

const when = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 19).replace("T", " ") + "Z";

export default function TapePage() {
  const records = loadTape();
  return (
    <DashboardLayout active="tape">
      <div style={{ marginBottom: 32 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>
          Tape
        </div>
        <h1 className="heading-sm" style={{ margin: 0 }}>
          Reading tape
        </h1>
        <p className="body-text" style={{ marginTop: 8, maxWidth: "60ch" }}>
          Append-only, newest first. Each line is one read of one mint: the fee in force, any change already
          announced, the slot it was read at, and the field the fee was read out of. Every row was produced by a real
          request — nothing here is precomputed for the page.
        </p>
      </div>

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        {records.length === 0 ? (
          <div style={{ padding: 40, color: "var(--color-graphite)", fontSize: 14 }}>
            No reads recorded yet. Run <span className="mono" style={{ fontSize: 13 }}>node scripts/prove_onchain.mjs</span> to
            append one.
          </div>
        ) : (
          <div style={{ padding: "0 20px" }}>
            <div
              className="label-mono"
              style={{
                display: "grid",
                gridTemplateColumns: "150px 1fr 148px 96px 176px",
                gap: 12,
                fontSize: 10,
                padding: "12px 0",
                borderBottom: "1px solid var(--color-hairline)",
              }}
            >
              <span>Holding</span>
              <span>Fee in force, and what is announced</span>
              <span>Read at</span>
              <span>Withheld</span>
              <span>Read from</span>
            </div>
            {records.map((r, i) => (
              <div
                key={`${r.mint}-${r.slot}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr 148px 96px 176px",
                  gap: 12,
                  alignItems: "baseline",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--color-cloud)",
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 500 }}>{r.symbol ?? r.mint.slice(0, 6)}</span>
                <span className="mono" style={{ fontSize: 12 }}>
                  {r.fee_in_force_bps ?? 0} bps
                  {r.fee_pending_bps != null ? (
                    <span style={{ color: "#8a5a00" }}>
                      {" · "}
                      {r.fee_pending_bps} bps announced
                      {r.fee_pending_epoch != null ? ` for epoch ${r.fee_pending_epoch}` : ""}
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-graphite)" }}> · nothing announced</span>
                  )}
                </span>
                <span className="mono" style={{ fontSize: 12, color: "var(--color-graphite)" }}>{when(r.ts)}</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--color-graphite)" }}>
                  {r.withheld_amount ? Number(r.withheld_amount).toLocaleString("en-US") : "—"}
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--color-graphite)", wordBreak: "break-all" }}>
                  {r.source} · slot {r.slot}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="body-text" style={{ marginTop: 16, fontSize: 12 }}>
        {records.length} read{records.length === 1 ? "" : "s"} recorded. Epoch and slot are the network&apos;s own; a fee of
        0 bps with nothing announced means the mint carries no transfer-fee extension at all.
      </p>
    </DashboardLayout>
  );
}
