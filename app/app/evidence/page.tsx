import DashboardLayout from "@/components/dashboard-layout";

export const dynamic = "force-dynamic";

/**
 * Every row is a claim this site makes, the file that carries it, and the exact
 * command that reproduces it. Rows must name something that exists.
 */
export default function EvidencePage() {
  const rows = [
    {
      claim: "The fee fields come from the account bytes, read independently of the site",
      artifact: "scripts/verify_receipts.py",
      cmd: "python3 scripts/verify_receipts.py",
      note: "Walks the Token-2022 TLV region in Python and re-derives both schedules. It does not call the TypeScript module, so a bug there cannot hide behind itself.",
    },
    {
      claim: "A u64 maximum fee cannot survive a float, which is why the bytes are read",
      artifact: "scripts/verify_receipts.py",
      cmd: "python3 scripts/verify_receipts.py --check",
      note: "Asserts the value is exactly 2^64-1 and that the same value through a double is not.",
    },
    {
      claim: "The schedule in force is selected by epoch, at every boundary",
      artifact: "app/lib/exit-terms.test.mjs",
      cmd: "node --test app/lib/exit-terms.test.mjs",
      note: "Covers an epoch below both schedules, between them, exactly at the newer epoch, and past it. Includes a live read against a real mint.",
    },
    {
      claim: "A quote is not a payout, and the gap is the withheld fee",
      artifact: "app/lib/exit-engine.test.mjs",
      cmd: "node --test app/lib/exit-engine.test.mjs",
      note: "Landing, the six checks with their refusals, route comparison by what lands, and the ablation that shows what ignoring the epoch costs.",
    },
    {
      claim: "Two issuers of the same asset class differ at the exit",
      artifact: "app/api/issuers/route.ts",
      cmd: "curl -s localhost:3000/api/issuers",
      note: "Reads every mint in the registry live and groups by issuer. Today one charges nothing at the exit and another carries a schedule not yet in force.",
    },
    {
      claim: "One reading, three numbers, and the slot it was taken at",
      artifact: "app/api/exit/route.ts",
      cmd: "curl -s 'localhost:3000/api/exit?mint=PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB&size=1000000000'",
      note: "Quoted, withheld, lands. Plus the full check list and every route with its reason for being reachable or not.",
    },
    {
      claim: "The readings on the tape are the verifier's own output",
      artifact: "app/data/readings.jsonl",
      cmd: "tail -3 app/data/readings.jsonl",
      note: "Appended by the verifier on each run. Nothing on the tape is hand-written.",
    },
  ];

  return (
    <DashboardLayout active="evidence">
      <div style={{ marginBottom: 32 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Evidence</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>Claim → artifact → command</h1>
        <p className="body-text" style={{ marginTop: 8, maxWidth: "62ch" }}>
          Every claim this site makes, with the command that reproduces it. If a row fails to
          reproduce on a fresh clone, that is a bug, not a documentation problem.
        </p>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ padding: "20px 24px", borderBottom: i < rows.length - 1 ? "1px solid var(--color-ash)" : "none" }}>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{r.claim}</p>
            <p style={{ fontSize: 12, color: "var(--color-graphite)", marginBottom: 12, lineHeight: 1.6 }}>{r.note}</p>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8, fontSize: 13 }}>
                <span className="label-mono" style={{ fontSize: 10 }}>Artifact</span>
                <code className="mono" style={{ wordBreak: "break-all", background: "#F8F8FA", padding: "4px 8px", borderRadius: 4 }}>{r.artifact}</code>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8, fontSize: 13 }}>
                <span className="label-mono" style={{ fontSize: 10 }}>Command</span>
                <code className="mono" style={{ wordBreak: "break-all", background: "#F8F8FA", padding: "4px 8px", borderRadius: 4 }}>{r.cmd}</code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
