import fs from "node:fs";
import path from "node:path";
import DashboardLayout from "@/components/dashboard-layout";

export const dynamic = "force-dynamic";

type Rec = {
  ts: number;
  verdict: "ACCEPT" | "REFUSE";
  check_id: string | null;
  plan: { plan_id: string; mint: string; expected_symbol?: string };
  account_data_hash: string;
  slot: number;
  line_digest?: string;
};

function loadTape(): Rec[] {
  const p = path.join(process.cwd(), "data", "tape.jsonl");
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Rec);
}

export default function TapePage() {
  const records = loadTape();
  return (
    <DashboardLayout active="tape">
      <div style={{ marginBottom: 32 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Tape</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>Refusal tape</h1>
        <p className="body-text" style={{ marginTop: 8, maxWidth: "56ch" }}>
          Append-only. Every refusal contains the check that tripped, the account data hash, and the slot it was read at.
          Re-run <span className="mono" style={{ fontSize: 13, background: "#F8F8FA", padding: "2px 6px", borderRadius: 4 }}>scripts/verify_tape.py</span> to verify the digest.
        </p>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        {records.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-graphite)", fontSize: 14 }}>No records yet</div>
        ) : (
          <div>
            {records.map((r, i) => (
              <div key={i} className="tr">
                <span className={r.verdict === "ACCEPT" ? "v-a" : "v-r"}>{r.verdict}</span>
                <span className="tr-c2">{r.check_id ?? "—"}</span>
                <span className="tr-c3">slot {r.slot}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}