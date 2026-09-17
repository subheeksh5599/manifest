import Link from "next/link";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
      <IntegrationsSection />
      <HowItWorksSection />
      <CTASection />
      <FAQSection />
    </div>
  );
}

/* ── Hero — full-bleed, centered, viewport-height ── */
function HeroSection() {
  return (
    <section
      style={{
        background: "linear-gradient(180deg, #1D1D21 25%, #145FE4 70%, #99BEFF 100%)",
        color: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        paddingTop: 80,
        paddingBottom: 80,
      }}
    >
      <div style={{ maxWidth: 900, padding: "0 24px" }}>
        <h1
          style={{
            fontFamily: "Inter, ui-sans-serif, sans-serif",
            fontSize: "clamp(48px, 7vw, 88px)",
            fontWeight: 300,
            letterSpacing: "-2.02px",
            lineHeight: 1.1,
            margin: "0 auto 20px",
            maxWidth: "14ch",
          }}
        >
          A recurring buy that fills at a verified price, or refuses on-chain.
        </h1>
        <p
          style={{
            fontSize: 20,
            fontWeight: 400,
            lineHeight: 1.43,
            color: "rgba(255,255,255,0.8)",
            maxWidth: "60ch",
            margin: "0 auto 40px",
          }}
        >
          Manifest schedules purchases of tokenized equities on Solana. Every plan is checked against live
          mainnet state at the moment of the trade. When a check fails, the transaction never leaves your
          machine and the refusal is published as a receipt anyone can re-read from the chain.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/plan"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#145FE4", color: "#ffffff",
              borderRadius: 9999, padding: "10px 24px",
              fontSize: 15, fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Try a plan <span aria-hidden>&rarr;</span>
          </Link>
          <Link
            href="/tape"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", color: "#ffffff",
              borderRadius: 9999, padding: "10px 24px",
              fontSize: 15, fontWeight: 500,
              border: "1px solid rgba(255,255,255,0.5)",
              textDecoration: "none",
            }}
          >
            Read the refusal tape
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Feature Cards — 3-column grid ── */
const features = [
  {
    title: "Plan builder",
    desc: "Choose a real xStock mint and set seven bounds. The evaluator reads live Token-2022 extensions and composes a keyless Jupiter swap against real mainnet state.",
    link: "/plan",
  },
  {
    title: "Refusal tape",
    desc: "Every check that trips is written to an append-only tape with the named check, the account data hash, and the slot it was read at.",
    link: "/tape",
  },
  {
    title: "Mint truth cards",
    desc: "One page per issuer mint reads live Token-2022 state per request: multiplier, pause flag, permanent delegate, transfer hook program.",
    link: `/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB`,
  },
];

function FeaturesSection() {
  return (
    <section style={{ padding: "96px 0", background: "#ffffff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#303136", marginBottom: 16 }}>
            Features
          </p>
          <h2
            style={{
              fontFamily: "Inter, ui-sans-serif, sans-serif",
              fontSize: "clamp(28px, 3.8vw, 48px)",
              fontWeight: 400,
              letterSpacing: "-1.1px",
              lineHeight: 1.2,
              margin: 0,
              color: "#000000",
            }}
          >
            Four surfaces that turn a seven-invariant guard into something you can use.
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          {features.slice(0, 3).map((f) => (
            <Link
              key={f.title}
              href={f.link}
              style={{
                background: "#ffffff",
                border: "1px solid #d7d7db",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
                textDecoration: "none",
                color: "inherit",
                display: "grid",
                gap: 16,
              }}
            >
              <h3 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: 32, fontWeight: 400, letterSpacing: "-0.74px", lineHeight: 1.25, margin: 0, color: "#000000" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.5, margin: 0, color: "#303136" }}>
                {f.desc}
              </p>
              <span style={{ color: "#145FE4", fontSize: 16, fontWeight: 500, marginTop: "auto" }}>
                Learn more &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Integration / Partner strip ── */
const partners = ["Solana", "Token-2022", "xStocks", "Jupiter", "Pyth", "Chainlink"];

function IntegrationsSection() {
  return (
    <section style={{ padding: "64px 0", borderTop: "1px solid #d7d7db", borderBottom: "1px solid #d7d7db", background: "#F8F8FA" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#303136", marginBottom: 24 }}>
          Reads live from
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
          {partners.map((p) => (
            <span key={p} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#6D6B60" }}>
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ── */
const steps = [
  { step: "01", title: "Compose", desc: "Pick a mint, set your bounds, choose a size. The plan is a JSON object with seven bounded fields." },
  { step: "02", title: "Evaluate", desc: "The evaluator reads Token-2022 extension state, composes a Jupiter swap, then runs the checks against live mainnet accounts." },
  { step: "03", title: "Refuse or fill", desc: "If every check passes, the transaction is a valid signature. If any fails, the named error is written to the tape." },
];

function HowItWorksSection() {
  return (
    <section style={{ padding: "96px 0", background: "#ffffff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#303136", marginBottom: 16 }}>
            How it works
          </p>
          <h2 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: "clamp(28px, 3.8vw, 48px)", fontWeight: 400, letterSpacing: "-1.1px", lineHeight: 1.2, margin: 0, color: "#000000" }}>
            Three steps between a plan and a broadcast.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {steps.map((s) => (
            <div key={s.step} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 48, fontWeight: 300, color: "#145FE4", marginBottom: 16, lineHeight: 1 }}>{s.step}</div>
              <h3 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: 32, fontWeight: 400, letterSpacing: "-0.74px", lineHeight: 1.25, margin: "0 0 12px", color: "#000000" }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 16, lineHeight: 1.5, margin: 0, color: "#303136", maxWidth: "36ch", marginLeft: "auto", marginRight: "auto" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Bottom CTA ── */
function CTASection() {
  return (
    <section style={{ background: "#1D1D21", color: "#ffffff", padding: "80px 0" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: "clamp(28px, 3.8vw, 48px)", fontWeight: 400, letterSpacing: "-1.1px", lineHeight: 1.2, margin: "0 0 16px" }}>
          The default answer is no. It is faster than yes.
        </h2>
        <p style={{ fontSize: 20, lineHeight: 1.43, color: "rgba(255,255,255,0.6)", margin: "0 auto 32px", maxWidth: "56ch" }}>
          No unit of equity moves unless the trade is provably safe at that instant. When it is not safe, the transaction refuses with a named error and the system publishes why, priced.
        </p>
        <Link
          href="/plan"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#ffffff", color: "#000000",
            borderRadius: 9999, padding: "10px 24px",
            fontSize: 15, fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Try a plan <span aria-hidden>&rarr;</span>
        </Link>
      </div>
    </section>
  );
}

/* ── FAQ ── */
const faq = [
  { q: "Does Manifest broadcast a real transaction?", a: "The composed transaction is evaluated against live mainnet state and never sent. Flipping the fill path on public mainnet is one cluster constant and a funded key; the evaluator code is identical." },
  { q: "What exactly does it read?", a: "Token-2022 extension state on the issuer mint account: scaled UI amount, pausable config, permanent delegate, transfer hook. It also composes a keyless Jupiter swap instruction and reads the current route cost." },
  { q: "Why refuse instead of retry?", a: "A refusal is the product. The named check and the account data hash are written to an append-only tape. Anyone can re-verify by reading the same slot. A silent retry is unfalsifiable; a public refusal is evidence." },
  { q: "Is there a wallet, a key, or a server-side signer?", a: "None. The site reads mainnet through a public RPC endpoint. No server-side key, no session, no custody. Every number on the page is from a read." },
];

function FAQSection() {
  return (
    <section style={{ padding: "80px 0", background: "#ffffff" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#303136", marginBottom: 16 }}>
            Questions
          </p>
          <h2 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: "clamp(28px, 3.8vw, 48px)", fontWeight: 400, letterSpacing: "-1.1px", lineHeight: 1.2, margin: 0, color: "#000000" }}>
            The questions we get most.
          </h2>
        </div>
        <div>
          {faq.map((item) => (
            <details key={item.q} style={{ borderTop: "1px solid #d7d7db", padding: "18px 0", cursor: "pointer" }}>
              <summary style={{ listStyle: "none", display: "flex", justifyContent: "space-between", gap: 24, fontWeight: 500, fontSize: 16, color: "#000000" }}>
                {item.q}
              </summary>
              <div style={{ marginTop: 8, color: "#303136", fontSize: 15, lineHeight: 1.65, maxWidth: "60ch" }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
        <div style={{ borderBottom: "1px solid #d7d7db" }} />
      </div>
    </section>
  );
}