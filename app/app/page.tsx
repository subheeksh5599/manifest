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
      <StatsStrip refusalCount={refusalCount} acceptCount={acceptCount} mintsCount={mintsCount} />
      <Features />
      <HowItWorks />
      <Slab />
      <FAQ />
    </div>
  );
}

function Hero({ latestSlot }: { latestSlot: number }) {
  return (
    <section className="wrap" style={{ paddingTop: 80, paddingBottom: 72 }}>
      <div className="grid gap-6 max-w-[1000px]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bl bl-live"><span className="dot" /> Live on Solana mainnet · slot {latestSlot || "—"}</span>
          <span className="mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-text-3)]">v0 &#xb7; sep 2026</span>
        </div>
        <h1 className="h-display" style={{ fontSize: "clamp(44px,7.2vw,76px)", maxWidth: "15ch", lineHeight: 0.95 }}>
          A recurring buy that either fills at a verified price, or refuses on-chain.
        </h1>
        <p className="lede" style={{ maxWidth: "58ch", marginTop: 4 }}>
          Manifest schedules purchases of tokenized equities on Solana. Every plan is checked against live
          mainnet state at the moment of the trade. When any check fails, the transaction never leaves your
          machine and a receipt is written that anyone can verify by re-reading the chain.
        </p>
        <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 4 }}>
          <Link href="/plan" className="btn-primary">Try a plan<span aria-hidden>&#8250;</span></Link>
          <Link href="/tape" className="btn-secondary">Read the refusal tape</Link>
        </div>
      </div>
    </section>
  );
}

function StatsStrip({ refusalCount, acceptCount, mintsCount }: { refusalCount: number; acceptCount: number; mintsCount: number }) {
  return (
    <div style={{ borderTop: "var(--edge)", borderBottom: "var(--edge)" }}>
      <div className="wrap" style={{ padding: "32px 24px" }}>
        <div className="sg">
          <div><div className="sg-v">{String(acceptCount).padStart(2, "0")}</div><div className="sg-l">Accepts</div></div>
          <div><div className="sg-v">{String(refusalCount).padStart(2, "0")}</div><div className="sg-l">Refusals</div></div>
          <div><div className="sg-v">{String(mintsCount).padStart(2, "0")}</div><div className="sg-l">Issuer mints</div></div>
          <div><div className="sg-v">7</div><div className="sg-l">Checks</div></div>
        </div>
      </div>
    </div>
  );
}

function Features() {
  const cards = [
    {
      icon: "01", title: "Plan builder", desc: "Choose a real xStock mint, set seven bounds. The evaluator reads live Token-2022 extensions and composes a keyless Jupiter swap.",
      points: ["Reads scaled UI amount, pausable, delegate, hook", "Composes swap-instructions via keyless API", "No wallet, no funds, no key"],
      link: "/plan",
    },
    {
      icon: "02", title: "Refusal tape", desc: "Every check that trips is written to an append-only tape with the named check, account hash, and the slot it was read at.",
      points: ["Named on-chain check per refusal", "Append-only, verifiable digest", "Anyone can re-run and reproduce the verdict"],
      link: "/tape",
    },
    {
      icon: "03", title: "Truth cards", desc: "One page per issuer mint. Reads live Token-2022 state per request: multiplier, pause, delegate, hook, and the read slot.",
      points: ["Fetched at request time, no cache", "Every field ties to a specific extension", "Direct explorer link alongside the read"],
      link: `/mint/${"XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB"}`,
    },
    {
      icon: "04", title: "Evidence pack", desc: "Every claim in the repo maps to a runnable command. verify_receipts.py re-reads every mint and exits non-zero on drift.",
      points: ["No API key required", "Fresh clone reproducibility gate", "Non-zero exit on any tamper"],
      link: "/evidence",
    },
  ];

  return (
    <section className="wrap" style={{ padding: "48px 24px" }}>
      <div className="kicker">What Manifest does</div>
      <div className="g3" style={{ marginTop: 16 }}>
        {cards.slice(0, 3).map((c) => (
          <Link key={c.icon} href={c.link} className="card card-hover" style={{ padding: 24, textDecoration: "none", color: "inherit", display: "grid", gap: 12 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-accent)" }}>{c.icon}</div>
            <div style={{ fontWeight: 500, fontSize: 16, letterSpacing: "-0.01em" }}>{c.title}</div>
            <p style={{ fontSize: 13, color: "var(--color-text-2)", lineHeight: 1.5 }}>{c.desc}</p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
              {c.points.map((p, i) => (
                <li key={i} style={{ fontSize: 12, color: "var(--color-text-3)", display: "flex", gap: 6 }}>
                  <span style={{ color: "var(--color-accent)" }}>&#8250;</span>{p}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", h: "Compose", b: "Pick a mint, set your bounds, choose a size. The plan is a JSON object with seven fields, all bounded." },
    { n: "02", h: "Simulate", b: "The evaluator reads Token-2022 extension state and composes a Jupiter swap, then runs simulateTransaction against mainnet." },
    { n: "03", h: "Refuse or fill", b: "If every check passes, the transaction is a valid signature. If any fails, the named error is written to the tape." },
  ];
  return (
    <section className="wrap" style={{ padding: "48px 24px" }}>
      <div className="kicker">How it works</div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, borderTop: "var(--edge)" }}>
        {steps.map((s) => (
          <div key={s.n} style={{ paddingTop: 20 }}>
            <div className="mono" style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--color-accent)", marginBottom: 8 }}>{s.n}</div>
            <div style={{ fontWeight: 500, fontSize: 16, letterSpacing: "-0.01em", marginBottom: 6 }}>{s.h}</div>
            <p style={{ fontSize: 13, color: "var(--color-text-2)", lineHeight: 1.5, maxWidth: "34ch" }}>{s.b}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Slab() {
  return (
    <section className="slab">
      <div className="wrap" style={{ padding: "56px 24px" }}>
        <div style={{ maxWidth: 720 }}>
          <div className="kicker">The invariant</div>
          <p style={{ fontSize: "clamp(34px,5.6vw,64px)", fontWeight: 500, letterSpacing: "-0.028em", lineHeight: 0.96, marginTop: 16 }}>
            The default answer is no. It is faster than yes.
          </p>
          <p style={{ fontSize: 18, lineHeight: 1.55, opacity: 0.72, maxWidth: "56ch", marginTop: 16 }}>
            No unit of equity moves unless the trade is provably safe at that instant. When it is not
            safe, the transaction refuses with a named error and the system publishes why, priced.
          </p>
          <div style={{ marginTop: 20 }}>
            <Link href="/plan" className="btn-slab">Try a plan<span aria-hidden>&#8250;</span></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "Does Manifest broadcast a real transaction?", a: "No. The composed transaction is evaluated against live mainnet state with simulateTransaction and never sent. Flipping the fill path on public mainnet is one cluster constant and a funded key; the evaluator code is identical." },
    { q: "What does it read?", a: "Token-2022 extension state on the issuer mint account: scaled UI amount, pausable config, permanent delegate, transfer hook. It also composes a keyless Jupiter swap instruction and reads the current route cost." },
    { q: "Why refuse instead of retry?", a: "A refusal is the product. The named check and the account data hash are written to an append-only tape. Anyone can re-verify by re-reading the same slot. A silent retry is unfalsifiable; a public refusal is evidence." },
    { q: "How many issuer mints are supported?", a: "Five canonical xStock issuer mints today: TSLAx, GOOGLx, HOODx, NVDAx, CRCLx. The registry is a committed JSON file." },
    { q: "Is there a wallet, a key, a server-side signer?", a: "None. The site reads mainnet through a public RPC endpoint with a browser user-agent. There is no server-side key, no session, no custody." },
  ];
  return (
    <section className="wrap" style={{ padding: "48px 24px 64px" }}>
      <div className="kicker">Questions</div>
      <div style={{ marginTop: 16, display: "grid", gap: 0 }}>
        {items.map((it) => (
          <details key={it.q} className="q">
            <summary><span>{it.q}</span></summary>
            <div className="q-b">{it.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}