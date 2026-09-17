import Link from "next/link";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <ProductsShowcase />
      <HowItWorksSection />
      <CTASection />
      <FAQSection />
    </div>
  );
}

/* ── HERO ── */
function HeroSection() {
  return (
    <section style={{
      background: "linear-gradient(180deg, #1D1D21 25%, #145FE4 70%, #99BEFF 100%)",
      color: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", textAlign: "center",
      paddingTop: 80, paddingBottom: 80, position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", top: "20%", left: "10%", width: 300, height: 300,
        borderRadius: "50%", background: "rgba(255,255,255,0.03)", filter: "blur(80px)",
      }} />
      <div aria-hidden style={{
        position: "absolute", bottom: "10%", right: "15%", width: 400, height: 400,
        borderRadius: "50%", background: "rgba(20,95,228,0.15)", filter: "blur(100px)",
      }} />
      <div style={{ maxWidth: 900, padding: "0 24px", position: "relative", zIndex: 1 }}>
        <h1 style={{
          fontFamily: "Inter, ui-sans-serif, sans-serif",
          fontSize: "clamp(48px, 7vw, 88px)", fontWeight: 300,
          letterSpacing: "-2.02px", lineHeight: 1.1,
          margin: "0 auto 20px", maxWidth: "14ch",
        }}>
          A recurring buy that fills at a verified price, or refuses on-chain.
        </h1>
        <p style={{
          fontSize: 20, fontWeight: 400, lineHeight: 1.43,
          color: "rgba(255,255,255,0.75)", maxWidth: "60ch",
          margin: "0 auto 40px",
        }}>
          Manifest schedules purchases of tokenized equities on Solana. Every plan is checked against live
          mainnet state at the moment of the trade. When a check fails, the transaction never leaves your
          machine and the refusal is published as a receipt anyone can re-read from the chain.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/plan" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#145FE4", color: "#ffffff",
            borderRadius: 9999, padding: "10px 24px",
            fontSize: 15, fontWeight: 500, textDecoration: "none",
          }}>
            Try a plan <span aria-hidden>&rarr;</span>
          </Link>
          <Link href="/tape" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", color: "#ffffff",
            borderRadius: 9999, padding: "10px 24px",
            fontSize: 15, fontWeight: 500,
            border: "1px solid rgba(255,255,255,0.5)", textDecoration: "none",
          }}>
            Read the refusal tape
          </Link>
        </div>
        {/* Terminal output — live-look */}
        <div style={{
          marginTop: 64, maxWidth: 540, marginLeft: "auto", marginRight: "auto",
          background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8, padding: "16px 20px", textAlign: "left",
          fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF5F56" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FFBD2E" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#27C93F" }} />
          </div>
          <div>$ manifest evaluate --mint TSLAx --size 500</div>
          <div style={{ color: "#27C93F" }}>&gt; reading Token-2022 extension state...</div>
          <div style={{ color: "#27C93F" }}>&gt; composing Jupiter swap route...</div>
          <div style={{ color: "#27C93F" }}>&gt; running 7 invariants...</div>
          <div style={{ color: "#FFBD2E" }}>&gt; check failed: exit_at_size (62 bps &gt; 30 bps)</div>
          <div style={{ color: "#FF5F56", marginTop: 4 }}>✗ REFUSED — evidence written to tape</div>
        </div>
      </div>
    </section>
  );
}

/* ── PRODUCT SHOWCASE — browser frame mockups ── */
function ProductsShowcase() {
  return (
    <section style={{ padding: "96px 0", background: "#ffffff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#303136", marginBottom: 16 }}>
            Product
          </p>
          <h2 style={{
            fontFamily: "Inter, ui-sans-serif, sans-serif",
            fontSize: "clamp(28px, 3.8vw, 48px)", fontWeight: 400,
            letterSpacing: "-1.1px", lineHeight: 1.2, margin: 0, color: "#000000",
          }}>
            Four surfaces. One invariant guard.
          </h2>
        </div>

        {/* 01 Plan builder */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", marginBottom: 96 }}>
          <div>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#145FE4", marginBottom: 12 }}>01 · Plan builder</p>
            <h3 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: 32, fontWeight: 400, letterSpacing: "-0.74px", lineHeight: 1.25, margin: "0 0 16px", color: "#000000" }}>
              Compose a plan in seven bounds.
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 20px", color: "#303136" }}>
              Pick a real xStock mint, set your multiplier snapshot, route cost, exit bound, size cap, and
              reference age limits. The evaluator reads live Token-2022 state and composes a keyless Jupiter
              swap — no wallet, no server, no gas.
            </p>
            <Link href="/plan" style={{ color: "#145FE4", fontSize: 16, fontWeight: 500, textDecoration: "none" }}>
              Try the plan builder &rarr;
            </Link>
          </div>
          <BrowserWindow url="manifest.xyz/plan">
            <PlanBuilderMock />
          </BrowserWindow>
        </div>

        {/* 02 Refusal tape */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", marginBottom: 96 }}>
          <BrowserWindow url="manifest.xyz/tape">
            <RefusalTapeMock />
          </BrowserWindow>
          <div>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#145FE4", marginBottom: 12 }}>02 · Refusal tape</p>
            <h3 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: 32, fontWeight: 400, letterSpacing: "-0.74px", lineHeight: 1.25, margin: "0 0 16px", color: "#000000" }}>
              Every refusal is public evidence.
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 20px", color: "#303136" }}>
              When a check trips, the named error, the account data hash, and the read slot are written to
              an append-only tape. Anyone can re-verify by reading the same slot at the same mint.
            </p>
            <Link href="/tape" style={{ color: "#145FE4", fontSize: 16, fontWeight: 500, textDecoration: "none" }}>
              Read the tape &rarr;
            </Link>
          </div>
        </div>

        {/* 03 Mint truth cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", marginBottom: 96 }}>
          <div>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#145FE4", marginBottom: 12 }}>03 · Mint truth cards</p>
            <h3 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: 32, fontWeight: 400, letterSpacing: "-0.74px", lineHeight: 1.25, margin: "0 0 16px", color: "#000000" }}>
              One live-read per issuer mint.
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 20px", color: "#303136" }}>
              Every mint gets its own page that reads Token-2022 extension state at request time: multiplier,
              paused status, permanent delegate, transfer hook program, and the slot it was read at.
            </p>
            <Link href={`/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB`} style={{ color: "#145FE4", fontSize: 16, fontWeight: 500, textDecoration: "none" }}>
              View a truth card &rarr;
            </Link>
          </div>
          <BrowserWindow url="manifest.xyz/mint/TSLAx">
            <TruthCardMock />
          </BrowserWindow>
        </div>

        {/* 04 Evidence */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <BrowserWindow url="manifest.xyz/evidence">
            <EvidenceMock />
          </BrowserWindow>
          <div>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#145FE4", marginBottom: 12 }}>04 · Evidence pack</p>
            <h3 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: 32, fontWeight: 400, letterSpacing: "-0.74px", lineHeight: 1.25, margin: "0 0 16px", color: "#000000" }}>
              Every claim maps to a command.
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 20px", color: "#303136" }}>
              Every claim in the project README maps to a runnable command that proves or disproves it.
              verify_receipts.py re-reads every mint quoted in the docs and exits non-zero on mismatch.
            </p>
            <Link href="/evidence" style={{ color: "#145FE4", fontSize: 16, fontWeight: 500, textDecoration: "none" }}>
              See the evidence &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── BROWSER WINDOW FRAME ── */
function BrowserWindow({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <div style={{
      background: "#F4F5F7", borderRadius: 8, padding: 24,
      border: "1px solid #d7d7db", boxShadow: "0 8px 24px 0 rgba(0,0,0,0.06)",
    }}>
      <div style={{ background: "#ffffff", borderRadius: 8, overflow: "hidden", border: "1px solid #e0e0e0" }}>
        <div style={{ display: "flex", gap: 6, padding: "10px 16px", background: "#F8F8FA", borderBottom: "1px solid #e0e0e0", alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F56" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#27C93F" }} />
          <span style={{ marginLeft: 24, fontSize: 11, color: "#6D6B60", fontFamily: "JetBrains Mono, monospace", padding: "1px 12px", background: "#eee", borderRadius: 4, flex: 1, textAlign: "center" }}>{url}</span>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

/* ── PLAN BUILDER MOCK ── */
function PlanBuilderMock() {
  return (
    <>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 16 }}>Plan configuration</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>MINT</div>
          <div style={{ padding: "8px 12px", border: "1px solid #d7d7db", borderRadius: 6, fontSize: 13, background: "#fafafa" }}>TSLAx</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>SIZE</div>
          <div style={{ padding: "8px 12px", border: "1px solid #d7d7db", borderRadius: 6, fontSize: 13, background: "#fafafa" }}>500</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>ROUTE COST</div>
          <div style={{ padding: "8px 12px", border: "1px solid #d7d7db", borderRadius: 6, fontSize: 13, background: "#fafafa" }}>30 bps</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>EXIT BOUND</div>
          <div style={{ padding: "8px 12px", border: "1px solid #d7d7db", borderRadius: 6, fontSize: 13, background: "#fafafa" }}>50 bps</div>
        </div>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ padding: "8px 20px", background: "#145FE4", color: "#fff", borderRadius: 9999, fontSize: 13, fontWeight: 500 }}>Evaluate</div>
        <div style={{ padding: "5px 12px", background: "#E8F5E9", color: "#2E7D32", borderRadius: 9999, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>ACCEPT</div>
      </div>
    </>
  );
}

/* ── REFUSAL TAPE MOCK ── */
function RefusalTapeMock() {
  const rows = [
    { v: "REFUSE", check: "exit_at_size", slot: "447185683" },
    { v: "REFUSE", check: "multiplier_freshness", slot: "447185680" },
    { v: "ACCEPT", check: "", slot: "447185677" },
    { v: "REFUSE", check: "issuer_levers", slot: "447185674" },
  ];
  return (
    <>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 12 }}>Recent tape entries</div>
      <div style={{
        display: "grid", gridTemplateColumns: "90px 1fr 120px", gap: 16, padding: "10px 0",
        borderBottom: "2px solid #eee", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: "#999", marginBottom: 4,
      }}>
        <span>Verdict</span>
        <span>Check</span>
        <span>Slot</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "90px 1fr 120px", gap: 16, padding: "10px 0",
          borderBottom: i < 3 ? "1px solid #f0f0f0" : "none", fontSize: 13,
          fontFamily: "JetBrains Mono, monospace", alignItems: "center",
        }}>
          <span style={{
            padding: "3px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 600, textAlign: "center", width: "fit-content",
            background: row.v === "ACCEPT" ? "#E8F5E9" : "#FFF3E0",
            color: row.v === "ACCEPT" ? "#2E7D32" : "#E65100",
          }}>{row.v}</span>
          <span style={{ color: "#000" }}>{row.check || "—"}</span>
          <span style={{ color: "#999" }}>#{row.slot}</span>
        </div>
      ))}
    </>
  );
}

/* ── TRUTH CARD MOCK ── */
function TruthCardMock() {
  const fields = [
    ["Multiplier", "1.000000"],
    ["Paused", "false"],
    ["Permanent Delegate", "0x8a3...de9f"],
    ["Transfer Hook", "none"],
    ["Slot", "447185683"],
  ];
  return (
    <>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 12 }}>TSLAx — Token-2022 State</div>
      {fields.map(([k, v]) => (
        <div key={k as string} style={{
          display: "grid", gridTemplateColumns: "160px 1fr", gap: 12,
          padding: "8px 0", borderBottom: "1px solid #f0f0f0",
          fontSize: 12, fontFamily: "JetBrains Mono, monospace",
        }}>
          <span style={{ color: "#999" }}>{k}</span>
          <span style={{ color: "#000", wordBreak: "break-all" }}>{v}</span>
        </div>
      ))}
    </>
  );
}

/* ── EVIDENCE MOCK ── */
function EvidenceMock() {
  const claims = [
    { check: "mint_identity", cmd: "verify_receipts.py --check mint_identity" },
    { check: "multiplier_freshness", cmd: "verify_receipts.py --check multiplier_freshness" },
    { check: "exit_at_size", cmd: "verify_receipts.py --plan data/plan.json" },
  ];
  return (
    <>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 12 }}>Verifiable claims</div>
      {claims.map((c, i) => (
        <div key={i} style={{
          padding: "12px 16px", background: "#F8F8FA", borderRadius: 6,
          border: "1px solid #eee", marginBottom: 8,
          fontFamily: "JetBrains Mono, monospace", fontSize: 12,
        }}>
          <div style={{ color: "#145FE4", marginBottom: 4 }}>{c.check}</div>
          <div style={{ color: "#6D6B60" }}>$ {c.cmd}</div>
        </div>
      ))}
    </>
  );
}

/* ── HOW IT WORKS ── */
const steps = [
  { step: "01", title: "Compose", desc: "Pick a mint, set your bounds, choose a size. The plan is a JSON object with seven bounded fields." },
  { step: "02", title: "Evaluate", desc: "The evaluator reads Token-2022 extension state, composes a Jupiter swap, then runs the checks against live mainnet accounts." },
  { step: "03", title: "Refuse or fill", desc: "If every check passes, the transaction is signed and broadcast. If any fails, the named error is written to the tape." },
];

function HowItWorksSection() {
  return (
    <section style={{ padding: "96px 0", background: "#F8F8FA" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{
            fontFamily: "Inter, ui-sans-serif, sans-serif",
            fontSize: "clamp(28px, 3.8vw, 48px)", fontWeight: 400,
            letterSpacing: "-1.1px", lineHeight: 1.2, margin: 0, color: "#000000",
          }}>
            Three steps between a plan and a broadcast.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {steps.map((s) => (
            <div key={s.step} style={{ textAlign: "center" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "#145FE4", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Inter, sans-serif", fontSize: 18, fontWeight: 500,
                margin: "0 auto 16px",
              }}>
                {s.step}
              </div>
              <h3 style={{ fontFamily: "Inter, ui-sans-serif, sans-serif", fontSize: 24, fontWeight: 500, letterSpacing: "-0.4px", lineHeight: 1.3, margin: "0 0 8px", color: "#000000" }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: "#303136", maxWidth: "36ch", marginLeft: "auto", marginRight: "auto" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA ── */
function CTASection() {
  return (
    <section style={{ background: "#1D1D21", color: "#ffffff", padding: "80px 0" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{
          fontFamily: "Inter, ui-sans-serif, sans-serif",
          fontSize: "clamp(28px, 3.8vw, 48px)", fontWeight: 400,
          letterSpacing: "-1.1px", lineHeight: 1.2, margin: "0 0 16px",
        }}>
          The default answer is no. It is faster than yes.
        </h2>
        <p style={{ fontSize: 20, lineHeight: 1.43, color: "rgba(255,255,255,0.6)", margin: "0 auto 32px", maxWidth: "56ch" }}>
          No unit of equity moves unless the trade is provably safe at that instant. When it is not safe,
          the transaction refuses with a named error and the system publishes why, priced.
        </p>
        <Link href="/plan" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#ffffff", color: "#000000",
          borderRadius: 9999, padding: "10px 24px",
          fontSize: 15, fontWeight: 500, textDecoration: "none",
        }}>
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
          <h2 style={{
            fontFamily: "Inter, ui-sans-serif, sans-serif",
            fontSize: "clamp(28px, 3.8vw, 48px)", fontWeight: 400,
            letterSpacing: "-1.1px", lineHeight: 1.2, margin: 0, color: "#000000",
          }}>
            The questions we get most.
          </h2>
        </div>
        {faq.map((item) => (
          <details key={item.q} style={{ borderTop: "1px solid #d7d7db", padding: "18px 0", cursor: "pointer" }}>
            <summary style={{ listStyle: "none", display: "flex", justifyContent: "space-between", gap: 24, fontWeight: 500, fontSize: 16, color: "#000000" }}>
              {item.q}
              <span style={{ color: "#999", fontSize: 18 }}>+</span>
            </summary>
            <div style={{ marginTop: 8, color: "#303136", fontSize: 15, lineHeight: 1.65, maxWidth: "60ch" }}>
              {item.a}
            </div>
          </details>
        ))}
        <div style={{ borderBottom: "1px solid #d7d7db" }} />
      </div>
    </section>
  );
}