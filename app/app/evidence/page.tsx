export const dynamic = "force-dynamic";

export default function EvidencePage() {
  const rows = [
    { claim: "TSLAx multiplier == 1 on mainnet", artifact: "data/mints/TSLAx.json", cmd: "python3 scripts/mint_truth.py XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB" },
    { claim: "Registry entries all owned by Token-2022", artifact: "data/registry.json", cmd: "python3 scripts/verify_receipts.py" },
    { claim: "Refusal tape verifies", artifact: "data/tape.jsonl", cmd: "python3 scripts/verify_tape.py" },
    { claim: "Tampered tape refused, dup plan refused, stale mirror detected, guardless accepts", artifact: "scripts/adversarial_gate.py", cmd: "python3 scripts/adversarial_gate.py" },
    { claim: "Four reproducible refusals + one accept", artifact: "docs/REFUSALS.md", cmd: "cat docs/REFUSALS.md" },
    { claim: "Guard host tests all pass", artifact: "program/src/policy.rs", cmd: "cd program && cargo test --lib" },
  ];
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-[color:var(--color-graphite)]">evidence pack</span>
        <h1 className="serif text-3xl">Every claim in this repo maps to a command.</h1>
        <p className="text-sm text-[color:var(--color-graphite)] max-w-2xl">
          If a row fails to reproduce on a fresh clone, that is a real bug.
        </p>
      </div>
      <div className="card divide-y hair">
        {rows.map((r, i) => (
          <div key={i} className="p-4 grid gap-2">
            <span className="text-sm">{r.claim}</span>
            <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
              <span className="text-[color:var(--color-graphite)]">artifact</span>
              <span className="mono break-all">{r.artifact}</span>
              <span className="text-[color:var(--color-graphite)]">command</span>
              <span className="mono break-all">{r.cmd}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
