import DashboardLayout from "@/components/dashboard-layout";

export const dynamic = "force-dynamic";

export default function EvidencePage() {
  const rows = [
    { claim: "TSLAx multiplier == 1 on mainnet", artifact: "data/mints/TSLAx.json", cmd: "python3 scripts/mint_truth.py XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB" },
    { claim: "Registry entries all owned by Token-2022", artifact: "data/registry.json", cmd: "python3 scripts/verify_receipts.py" },
    { claim: "Refusal tape verifies", artifact: "data/tape.jsonl", cmd: "python3 scripts/verify_tape.py" },
    { claim: "Tampered tape, dup plan, stale mirror, guardless accepts", artifact: "scripts/adversarial_gate.py", cmd: "python3 scripts/adversarial_gate.py" },
    { claim: "Four reproducible refusals + one accept", artifact: "docs/REFUSALS.md", cmd: "cat docs/REFUSALS.md" },
    { claim: "Guard host tests all pass", artifact: "program/src/policy.rs", cmd: "cd program && cargo test --lib" },
    { claim: "Anchor program deployed on devnet", artifact: "programs/preflight/src/lib.rs", cmd: "solana program show pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA --url devnet" },
    { claim: "Plan created, preflight passed, fill+refusal recorded", artifact: "scripts/devnet_full_test.py", cmd: "python3 scripts/devnet_full_test.py" },
  ];
  return (
    <DashboardLayout active="evidence">
      <div style={{ marginBottom: 32 }}>
        <div className="label-mono" style={{ marginBottom: 8, color: "var(--color-brand-blue)" }}>Evidence</div>
        <h1 className="heading-sm" style={{ margin: 0 }}>Evidence pack</h1>
        <p className="body-text" style={{ marginTop: 8, maxWidth: "60ch" }}>
          Every claim in this repo maps to a runnable command. If a row fails to reproduce on a fresh clone, that is a real bug.
        </p>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ padding: "20px 24px", borderBottom: i < rows.length - 1 ? "1px solid var(--color-ash)" : "none" }}>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{r.claim}</p>
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