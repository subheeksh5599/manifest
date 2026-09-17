import Link from "next/link";
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
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <FAQSection />
    </div>
  );
}

function Hero({ latestSlot }: { latestSlot: number }) {
  return (
    <section className="hero" style={{ paddingTop: 120, paddingBottom: 100 }}>
      <div className="wrap" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
          <span className="bl bl-live"><span className="dot" /> Solana mainnet · slot {latestSlot || "—"}</span>
          <span className="mono" style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>v0 · sep 2026</span>
        </div>
        <div style={{ maxWidth: 900 }}>
          <h1 className="display" style={{ maxWidth: "14ch", marginBottom: 20 }}>
            A recurring buy that either fills at a verified price, or refuses on-chain.
          </h1>
          <p className="subheading" style={{ color: "rgba(255,255,255,0.75)", maxWidth: "60ch", marginBottom: 32 }}>
            Manifest schedules purchases of tokenized equities on Solana. Every plan is checked against live
            mainnet state at the moment of the trade. When a check fails, the transaction never leaves your
            machine and the refusal is published as a receipt anyone can re-read from the chain.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/plan" className="btn btn-primary" style={{ fontSize: 16, padding: "12px 28px" }}>Try a plan <span aria-hidden>&rarr;</span></Link>
            <Link href="/tape" className="btn btn-secondary" style={{ fontSize: 16, padding: "12px 28px" }}>Read the refusal tape</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsStrip({ refusalCount, acceptCount, mintsCount }: { refusalCount: number; acceptCount: number; mintsCount: number }) {
  return (
    <section className="section-gray" style={{ padding: "40px 0" }}>
      <div className="wrap">
        <div className="sg">
          <div><div className="sg-v">{acceptCount}</div><div className="sg-l">Accepts on tape</div></div>
          <div><div className="sg-v">{refusalCount}</div><div className="sg-l">Refusals on tape</div></div>
          <div><div className="sg-v">{mintsCount}</div><div className="sg-l">Issuer mints tracked</div></div>
          <div><div className="sg-v">7</div><div className="sg-l">Invariants checked</div></div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: "01", title: "Plan builder",
    desc: "Choose a real xStock mint, set seven bounds. The evaluator reads live Token-2022 extensions and composes a keyless Jupiter swap against real mainnet state.",
    link: "/plan",
  },
  {
    icon: "02", title: "Refusal tape",
    desc: "Every check that trips is written to an append-only tape with the named check, the account data hash, and the slot it was read at. Anyone can re-run the verifier.",
    link: "/tape",
  },
  {
    icon: "03", title: "Mint truth cards",
    desc: "One page per issuer mint reads live Token-2022 state per request: multiplier, pause flag, permanent delegate, transfer hook program, and the read slot.",
    link: `/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB`,
  },
  {
    icon: "04", title: "Evidence pack",
    desc: "Every claim in the repo maps to a runnable command. verify_receipts.py re-reads every mint quoted in the README and exits non-zero on drift.",
    link: "/evidence",
  },
];

function FeaturesSection() {
  return (
    <section className="section" style={{ padding: "96px 0" }}>
      <div className="wrap">
        <div style={{ maxWidth: 800, marginBottom: 56 }}>
          <div className="label-mono" style={{ marginBottom: 12 }}>Features</div>
          <h2 className="heading">What Manifest does</h2>
          <p className="body-text" style={{ marginTop: 12, maxWidth: "56ch" }}>
            Four surfaces that turn a seven-invariant guard into something you can click, read, and reproduce.
          </p>
        </div>
        <div className="g3">
          {features.slice(0, 3).map((f) => (
            <Link key={f.icon} href={f.link} className="card card-hover" style={{ textDecoration: "none", color: "inherit", display: "grid", gap: 16 }}>
              <div className="label-mono" style={{ color: "var(--color-brand-blue)" }}>{f.icon}</div>
              <h3 className="heading-sm" style={{ margin: 0 }}>{f.title}</h3>
              <p className="body-text" style={{ margin: 0 }}>{f.desc}</p>
              <span className="text-link" style={{ marginTop: "auto" }}>Open</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { n: "01", title: "Compose", desc: "Pick a mint, set your bounds, choose a size. The plan is a JSON object with seven bounded fields." },
    { n: "02", title: "Evaluate", desc: "The evaluator reads Token-2022 extension state, composes a Jupiter swap, then runs simulateTransaction against live mainnet accounts." },
    { n: "03", title: "Refuse or fill", desc: "If every check passes, the transaction is a valid signature. If any fails, the named error is written to the tape." },
  ];
  return (
    <section className="section-gray section" style={{ padding: "96px 0" }}>
      <div className="wrap">
        <div style={{ maxWidth: 800, marginBottom: 56 }}>
          <div className="label-mono" style={{ marginBottom: 12 }}>How it works</div>
          <h2 className="heading">Three steps between a plan and a broadcast.</h2>
        </div>
        <div className="g3" style={{ gap: 40 }}>
          {steps.map((s) => (
            <div key={s.n}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 48, fontWeight: 300, color: "var(--color-brand-blue)", marginBottom: 16, lineHeight: 1 }}>{s.n}</div>
              <h3 className="heading-sm" style={{ marginBottom: 8, marginTop: 0 }}>{s.title}</h3>
              <p className="body-text" style={{ margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="section-dark section" style={{ padding: "80px 0" }}>
      <div className="wrap">
        <div style={{ maxWidth: 720 }}>
          <h2 className="heading" style={{ marginBottom: 16 }}>The default answer is no. It is faster than yes.</h2>
          <p className="subheading" style={{ color: "rgba(255,255,255,0.6)", maxWidth: "56ch", marginBottom: 32 }}>
            No unit of equity moves unless the trade is provably safe at that instant. When it is not
            safe, the transaction refuses with a named error and the system publishes why, priced.
          </p>
          <Link href="/plan" className="btn btn-white" style={{ fontSize: 16, padding: "12px 28px" }}>Try a plan <span aria-hidden>&rarr;</span></Link>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const items = [
    { q: "Does Manifest broadcast a real transaction?", a: "No. The composed transaction is evaluated against live mainnet state with simulateTransaction and never sent. Flipping the fill path on public mainnet is one cluster constant and a funded key; the evaluator code is identical." },
    { q: "What exactly does it read?", a: "Token-2022 extension state on the issuer mint account: scaled UI amount, pausable config, permanent delegate, transfer hook. It also composes a keyless Jupiter swap instruction and reads the current route cost." },
    { q: "Why refuse instead of retry?", a: "A refusal is the product. The named check and the account data hash are written to an append-only tape. Anyone can re-verify by re-reading the same slot. A silent retry is unfalsifiable; a public refusal is evidence." },
    { q: "How many issuer mints are supported?", a: "Five canonical xStock issuer mints today: TSLAx, GOOGLx, HOODx, NVDAx, CRCLx. The registry is a committed JSON file; adding a mint is one line and a re-read." },
    { q: "Is there a wallet, a key, or a server-side signer?", a: "None. The site reads mainnet through a public RPC endpoint with a browser user-agent. No server-side key, no session, no custody. Every number on the page is from a read." },
  ];
  return (
    <section className="section" style={{ padding: "80px 0" }}>
      <div className="wrap">
        <div style={{ maxWidth: 800 }}>
          <div className="label-mono" style={{ marginBottom: 12 }}>Questions</div>
          <h2 className="heading" style={{ marginBottom: 32 }}>The five we get most.</h2>
        </div>
        <div style={{ maxWidth: 800 }}>
          {items.map((it) => (
            <details key={it.q} className="q">
              <summary><span>{it.q}</span></summary>
              <div className="q-b">{it.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}