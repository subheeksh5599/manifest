import fs from "node:fs";
import path from "node:path";

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
  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Rec);
}

export default function TapePage() {
  const records = loadTape();
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">refusal tape</span>
        <h1 className="serif text-3xl">Every verdict, on file.</h1>
        <p className="text-sm text-[color:var(--color-ink-700)] max-w-2xl">
          Append-only. Sealed with a canonical digest. Re-run <span className="mono">scripts/verify_tape.py</span> to prove no line has been mutated.
        </p>
      </div>
      <div className="card divide-y hair">
        {records.length === 0 && (
          <div className="p-6 text-sm text-[color:var(--color-ink-500)]">no records yet</div>
        )}
        {records.map((r, i) => (
          <div key={i} className="p-4 grid grid-cols-[100px_120px_1fr_140px] items-baseline gap-4 text-sm">
            <span
              className="mono"
              style={{ color: r.verdict === "ACCEPT" ? "var(--color-accept)" : "var(--color-refuse)" }}
            >
              {r.verdict}
            </span>
            <span className="mono text-xs">{r.check_id ?? "-"}</span>
            <span className="mono text-xs break-all">{r.plan.plan_id}</span>
            <span className="mono text-xs text-[color:var(--color-ink-500)]">slot {r.slot}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
