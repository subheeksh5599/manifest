import Link from "next/link";
import { loadRegistry } from "@/lib/registry";
import PlanBuilder from "@/components/plan-builder";

export const dynamic = "force-dynamic";

export default function Home() {
  const entries = loadRegistry();
  return (
    <div className="grid gap-16">
      <section className="grid gap-4 pt-4">
        <h1 className="serif text-5xl leading-[1.05] tracking-tight max-w-3xl">
          Scheduled buys that either fill at a verified price, or publicly refuse.
        </h1>
        <p className="text-[color:var(--color-ink-700)] max-w-2xl">
          Every refusal is a receipt you can verify by re-reading the chain. Nothing is broadcast until every invariant holds against live mainnet state.
        </p>
        <div className="text-xs mono text-[color:var(--color-ink-500)] pt-2">
          reads live: {entries.length} issuer mints. token-2022 extensions. keyless jupiter route.
        </div>
      </section>

      <section className="grid gap-6">
        <div className="flex items-baseline justify-between">
          <h2 className="serif text-2xl">Build a plan</h2>
          <Link href="/plan" className="text-sm underline underline-offset-4">full builder</Link>
        </div>
        <PlanBuilder entries={entries} />
      </section>

      <section className="grid gap-6">
        <div className="flex items-baseline justify-between">
          <h2 className="serif text-2xl">Issuer mints</h2>
          <Link href="/evidence" className="text-sm underline underline-offset-4">evidence</Link>
        </div>
        <div className="card divide-y hair">
          {entries.map((e) => (
            <Link key={e.mint} href={`/mint/${e.mint}`} className="flex items-baseline justify-between p-4 hover:bg-[color:var(--color-ink-100)]">
              <div className="flex items-baseline gap-4">
                <span className="serif text-lg">{e.symbol}</span>
                <span className="text-sm text-[color:var(--color-ink-700)]">{e.name}</span>
              </div>
              <span className="mono text-xs text-[color:var(--color-ink-500)]">{e.mint.slice(0, 6)}...{e.mint.slice(-6)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
