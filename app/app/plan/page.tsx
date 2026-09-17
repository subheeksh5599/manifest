import { loadRegistry } from "@/lib/registry";
import PlanBuilder from "@/components/plan-builder";

export const dynamic = "force-dynamic";

export default function PlanPage() {
  const entries = loadRegistry();
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="serif text-3xl">Plan builder</h1>
        <p className="text-sm text-[color:var(--color-graphite)] max-w-2xl">
          Set the seven inputs the guard evaluates. Preflight runs against live mainnet state at request time. Nothing broadcasts.
        </p>
      </div>
      <PlanBuilder entries={entries} />
    </div>
  );
}
