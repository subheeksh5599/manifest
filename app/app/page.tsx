import Link from "next/link";
import Image from "next/image";
import fs from "node:fs";
import path from "node:path";
import { loadRegistry } from "@/lib/registry";

export const dynamic = "force-dynamic";

type TapeRow = {
  verdict: "ACCEPT" | "REFUSE";
  check_id: string | null;
  account_data_hash: string;
  slot: number;
  live_value: { mint_card: { slot: number; symbol?: string; name?: string; mint: string } };
  plan: { plan_id: string; mint: string; expected_symbol: string };
};

function loadTape(): TapeRow[] {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "data", "tape.jsonl"), "utf8");
    return raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}

export default function Home() {
  const entries = loadRegistry();
  const tape = loadTape();
  const refusalCount = tape.filter((r) => r.verdict === "REFUSE").length;
  const acceptCount = tape.filter((r) => r.verdict === "ACCEPT").length;
  const latestSlot = tape.length ? Math.max(...tape.map((r) => r.live_value?.mint_card?.slot ?? 0)) : 0;
  const mintsCount = entries.length;

  return (
    <div>
      <Hero latestSlot={latestSlot} />
      <ReadFromStrip />
      <FeaturePlan />
      <FeatureTape refusalCount={refusalCount} acceptCount={acceptCount} />
      <FeatureMint mintsCount={mintsCount} />
      <HowItWorks />
      <Slab />
      <FAQ />
    </div>
  );
}

function Hero({ latestSlot }: { latestSlot: number }) {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-20 md:pt-28 pb-24 md:pb-32">
      <div className="grid gap-8 max-w-[1000px]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="badge"><span className="dot" /> Live on Solana mainnet · slot {latestSlot || "—"}</span>
          <span className="mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-500)]">v0 · sep 2026</span>
        </div>
        <h1 className="h-display text-[clamp(48px,8.4vw,88px)] max-w-[16ch]">
          A recurring buy that either fills at a verified price, or refuses on-chain.
        </h1>
        <p className="lede max-w-[62ch]">
          Manifest schedules purchases of tokenized equities on Solana. Every plan is checked against live
          mainnet state at the moment of the trade. When any check fails, the transaction never leaves your
          machine and a receipt is written that anyone can verify by re-reading the chain.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link href="/plan" className="btn-primary">Try a plan<span aria-hidden>›</span></Link>
          <Link href="/tape" className="btn-secondary">Read the refusal tape</Link>
        </div>
      </div>
    </section>
  );
}

function ReadFromStrip() {
  const items = [
    "Solana mainnet",
    "Token-2022",
    "Scaled UI Amount",
    "Jupiter routes",
    "Confidential transfers",
  ];
  return (
    <section style={{ borderTop: "var(--edge)", borderBottom: "var(--edge)", background: "color-mix(in oklab, var(--color-paper) 65%, white)" }}>
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
          <div className="kicker">Reads live from</div>
          <div className="wordmark-row">
            {items.map((w) => <div key={w} className="wordmark">{w}</div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBlock({
  children,
  reverse = false,
}: { children: React.ReactNode; reverse?: boolean }) {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
      <div className={`grid gap-12 md:gap-16 md:grid-cols-12 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
        {children}
      </div>
    </section>
  );
}

function ShotFrame({ src, alt, url }: { src: string; alt: string; url: string }) {
  return (
    <figure className="shot-frame">
      <div className="shot-chrome">
        <span className="cdot" /><span className="cdot" /><span className="cdot" />
        <span className="url">{url}</span>
      </div>
      <Image src={src} alt={alt} width={1440} height={900} priority className="w-full h-auto block" />
    </figure>
  );
}

function FeaturePlan() {
  return (
    <FeatureBlock>
      <div className="md:col-span-7">
        <ShotFrame src="/shots/plan.png" alt="Plan builder with an ACCEPT verdict against live mainnet state" url="manifest.build/plan" />
      </div>
      <div className="md:col-span-5 grid gap-6">
        <div className="kicker">01 · Plan builder</div>
        <h2 className="h-section text-[clamp(32px,4.6vw,52px)]">Plans that ask mainnet first.</h2>
        <p className="lede">
          Compose a recurring buy by choosing a real xStock mint and setting your seven bounds. The evaluator
          runs against live Token-2022 extension state and the current Jupiter route.
        </p>
        <ul className="grid gap-3 text-[15px] text-[color:var(--color-ink-700)]">
          <Bullet>Reads Token-2022 extensions: scaled UI amount, pausable config, permanent delegate, transfer hook.</Bullet>
          <Bullet>Composes a keyless Jupiter swap instruction and simulates the whole transaction.</Bullet>
          <Bullet>No wallet, no funds, no key. Every verdict is a live account snapshot.</Bullet>
        </ul>
        <Link href="/plan" className="underlink text-[14px] w-fit">Open the plan builder ›</Link>
      </div>
    </FeatureBlock>
  );
}

function FeatureTape({ refusalCount, acceptCount }: { refusalCount: number; acceptCount: number }) {
  return (
    <section style={{ borderTop: "var(--edge)", borderBottom: "var(--edge)", background: "color-mix(in oklab, var(--color-paper) 55%, white)" }}>
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
        <div className="grid gap-12 md:gap-16 md:grid-cols-12 items-center">
          <div className="md:col-span-5 grid gap-6">
            <div className="kicker">02 · Refusal tape</div>
            <h2 className="h-section text-[clamp(32px,4.6vw,52px)]">Every refusal is a receipt.</h2>
            <p className="lede">
              When a plan fails a check, the composed transaction is written to an append-only tape with the
              named check, the account data hash, and the slot it was read at. Anyone can re-run the verifier
              and reproduce the verdict.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-2 border-t hair">
              <Stat n={refusalCount} label="Refusals on tape" />
              <Stat n={acceptCount} label="Accepts on tape" />
            </div>
            <Link href="/tape" className="underlink text-[14px] w-fit">Read the tape ›</Link>
          </div>
          <div className="md:col-span-7">
            <ShotFrame src="/shots/tape.png" alt="The refusal tape, showing named on-chain check failures" url="manifest.build/tape" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureMint({ mintsCount }: { mintsCount: number }) {
  return (
    <FeatureBlock>
      <div className="md:col-span-7">
        <ShotFrame src="/shots/mint.png" alt="The truth card for a single issuer mint" url="manifest.build/mint" />
      </div>
      <div className="md:col-span-5 grid gap-6">
        <div className="kicker">03 · Truth card</div>
        <h2 className="h-section text-[clamp(32px,4.6vw,52px)]">One card per issuer mint.</h2>
        <p className="lede">
          Every one of the {mintsCount} tracked xStock mints has a page that reads its live Token-2022 state:
          multiplier, pause flag, permanent delegate, transfer hook program, and the slot the values were read at.
        </p>
        <ul className="grid gap-3 text-[15px] text-[color:var(--color-ink-700)]">
          <Bullet>Values are fetched at request time. No cache, no CDN warm-up.</Bullet>
          <Bullet>Every field ties back to a specific Token-2022 extension on the mint account.</Bullet>
          <Bullet>Direct link to the account on a public explorer alongside the read.</Bullet>
        </ul>
      </div>
    </FeatureBlock>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[16px_1fr] gap-3 items-baseline">
      <span aria-hidden className="mono text-[color:var(--color-accent)]">›</span>
      <span>{children}</span>
    </li>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="mono text-[32px] tracking-tight font-medium">{String(n).padStart(2, "0")}</div>
      <div className="kicker mt-1">{label}</div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", h: "Compose", b: "Pick a mint, set your bounds, choose a size. The plan is a JSON object with seven fields, all bounded." },
    { n: "02", h: "Simulate", b: "The evaluator reads Token-2022 extension state and composes a Jupiter swap, then runs simulateTransaction against mainnet." },
    { n: "03", h: "Refuse or fill", b: "If every check passes, the transaction is a valid signature. If any fails, the named error is written to the tape." },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 md:py-28">
      <div className="grid gap-10">
        <div className="max-w-[62ch] grid gap-4">
          <div className="kicker">How it works</div>
          <h2 className="h-section text-[clamp(28px,3.6vw,40px)]">Three steps between a plan and a broadcast.</h2>
        </div>
        <ol className="grid md:grid-cols-3 border-t hair-strong">
          {steps.map((s) => (
            <li key={s.n} className="py-8 md:py-10 md:px-6 first:md:pl-0 last:md:pr-0 md:border-l hair grid gap-3">
              <div className="mono text-[13px] tracking-widest text-[color:var(--color-accent)]">{s.n}</div>
              <div className="h-section text-[22px] tracking-[-0.01em]">{s.h}</div>
              <p className="text-[15px] text-[color:var(--color-ink-700)] leading-relaxed max-w-[36ch]">{s.b}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Slab() {
  return (
    <section className="slab">
      <div className="mx-auto max-w-[1200px] px-6 py-28 md:py-40">
        <div className="grid gap-10 md:grid-cols-12 items-end">
          <div className="md:col-span-9">
            <div className="kicker">The invariant</div>
            <p className="mt-6 h-display text-[clamp(38px,6.4vw,80px)] max-w-[18ch]">
              The default answer is no. It is faster than yes.
            </p>
            <p className="mt-8 lede max-w-[58ch]" style={{ color: "rgba(246,244,238,0.72)" }}>
              No unit of equity moves unless the trade is provably safe at that instant. When it is not
              safe, the transaction refuses with a named error and the system publishes why, priced.
            </p>
          </div>
          <div className="md:col-span-3 flex md:justify-end">
            <Link href="/plan" className="btn-slab">Try a plan<span aria-hidden>›</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "Does Manifest broadcast a real transaction?",
      a: "No. The composed transaction is evaluated against live mainnet state with simulateTransaction and never sent. Flipping the fill path on public mainnet is one cluster constant and a funded key; the evaluator code is identical.",
    },
    {
      q: "What does it read?",
      a: "Token-2022 extension state on the issuer mint account: scaled UI amount, pausable config, permanent delegate, transfer hook. It also composes a keyless Jupiter swap instruction and reads the current route cost.",
    },
    {
      q: "Why refuse instead of retry?",
      a: "A refusal is the product. The named check and the account data hash are written to an append-only tape. Anyone can re-verify by re-reading the same slot. A silent retry is unfalsifiable; a public refusal is evidence.",
    },
    {
      q: "How many issuer mints are supported?",
      a: "Five canonical xStock issuer mints today: TSLAx, GOOGLx, HOODx, NVDAx, CRCLx. The registry is a committed JSON file; adding a mint is a one-line change and a re-read of Token-2022 state.",
    },
    {
      q: "Is there a wallet, a key, a server-side signer?",
      a: "None. The site reads mainnet through a public RPC endpoint with a browser user-agent. There is no server-side key, no session, no custody. Every number on the page is the result of a read.",
    },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-28 md:py-32">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4 grid gap-5">
          <div className="kicker">Questions</div>
          <h2 className="h-section text-[clamp(28px,3.6vw,40px)]">The five we get most.</h2>
          <p className="text-[14px] text-[color:var(--color-ink-500)] max-w-[32ch]">
            Every answer here is reproducible from the code in the repository.
          </p>
        </div>
        <div className="md:col-span-8">
          {items.map((it) => (
            <details key={it.q} className="q">
              <summary>
                <span>{it.q}</span>
                <span className="q-plus" aria-hidden />
              </summary>
              <div className="q-body">{it.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
