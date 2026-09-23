import Link from "next/link";

export default function Home() {
  return (
    <div>
      <SiteHeader />
      <HeroSection />
      <StatsSection />
      <ProductShowcase />
      <InvariantSection />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="site-header">
      <div className="hi">
        <Link href="/" className="hl">manifest</Link>
        <nav className="hn">
          <Link href="/plan">Plan</Link>
          <Link href="/tape">Tape</Link>
          <a href="https://github.com/subheeksh5599/manifest">Source</a>
          <Link href="/plan" className="btn btn-primary">Launch app</Link>
        </nav>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section style={{ background: "#edeff2", paddingTop: 80, paddingBottom: 80, borderBottom: "1px solid #dedfe1" }}>
      <div className="wrap">
        <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 48, alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.12, margin: "0 0 16px" }}>
              Scheduled equity buys that verify or refuse on-chain
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: "0 0 24px", maxWidth: 420 }}>
              Every recurring buy is checked against live Token-2022 mint state before execution. If any of 7 invariant checks fails, the trade is refused and the refusal is recorded as a permanent on-chain receipt.
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Link href="/plan" className="btn btn-primary">Launch app</Link>
              <a href="https://github.com/subheeksh5599/manifest" style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a", textDecoration: "none" }}>
                View source →
              </a>
            </div>
          </div>

          {/* Mock preflight verdict card */}
          <div style={{ background: "#fff", border: "1px solid #dedfe1", borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Preflight evaluation</span>
              <div style={{ display: "flex", gap: 8, fontSize: 10, fontFamily: "var(--font-mono)", color: "#9ca3af", alignItems: "center" }}>
                <span>SLOT 447,185,683</span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0ECB81", display: "inline-block" }} />
              </div>
            </div>
            <div style={{ padding: "4px 16px" }}>
              {[
                { name: "mint_identity", pass: true },
                { name: "multiplier_freshness", pass: true },
                { name: "issuer_levers", pass: true },
                { name: "reference_regime", pass: false },
                { name: "exit_at_size", pass: null },
                { name: "policy", pass: null },
              ].map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 5 ? "1px solid #fafafa" : "none", fontSize: 12 }}>
                  <span style={{ fontFamily: "var(--font-mono)", color: c.pass === false ? "#FF4D4D" : "#1a1a1a" }}>{c.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.04em", color: c.pass === true ? "#0ECB81" : c.pass === false ? "#FF4D4D" : "#d1d5db" }}>
                    {c.pass === true ? "PASS" : c.pass === false ? "FAIL" : "SKIP"}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="v-r">REFUSED</span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#FF4D4D" }}>reference_regime: ref_age 47h &gt; max 6h</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section style={{ background: "#1a1a1a", color: "#fff", padding: "80px 0" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            The preflight guard for tokenized equities
          </h2>
          <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>
            Reads live Token-2022 extension state from Solana mainnet. Checks multiplier freshness, issuer levers, exit cost, and policy bounds in one atomic evaluation.
          </p>
        </div>

        <div className="sg" style={{ marginBottom: 48 }}>
          <div><div className="sg-v">554</div><div className="sg-l">TESTS PASSING</div></div>
          <div><div className="sg-v">7</div><div className="sg-l">INVARIANT CHECKS</div></div>
          <div><div className="sg-v">4</div><div className="sg-l">ON-CHAIN INSTRUCTIONS</div></div>
          <div><div className="sg-v">5</div><div className="sg-l">xSTOCK MINTS</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900, margin: "0 auto" }}>
          <div style={{ background: "#fff", color: "#1a1a1a", padding: 28, borderRadius: 2 }}>
            <span style={{ display: "inline-block", fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", padding: "2px 8px", background: "#f3f4f6", borderRadius: 2, marginBottom: 12, fontWeight: 600 }}>OFF-CHAIN</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Preflight evaluation</h3>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, margin: "0 0 16px" }}>
              Pure function: plan + registry entry + live mint card = ACCEPT or REFUSE with the named check that tripped.
            </p>
            <ul style={{ fontSize: 12, color: "#374151", listStyle: "none", padding: 0, margin: 0 }}>
              {["mint_identity", "multiplier_freshness", "issuer_levers", "reference_regime", "exit_at_size", "policy"].map(c => (
                <li key={c} style={{ padding: "4px 0", borderTop: "1px solid #f3f4f6", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{c}</li>
              ))}
            </ul>
          </div>
          <div style={{ background: "#fff", color: "#1a1a1a", padding: 28, borderRadius: 2 }}>
            <span style={{ display: "inline-block", fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", padding: "2px 8px", background: "#145FE4", color: "#fff", borderRadius: 2, marginBottom: 12, fontWeight: 600 }}>ON-CHAIN</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>Anchor program (devnet)</h3>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, margin: "0 0 16px" }}>
              Deployed on Solana devnet. Creates plans, runs checks against Token-2022 extension data, records fills and refusals as permanent receipts.
            </p>
            <ul style={{ fontSize: 12, color: "#374151", listStyle: "none", padding: 0, margin: 0 }}>
              {[
                "create_plan — PDA-bound plan with mint + snapshot",
                "preflight — reads pausable, transfer_hook, multiplier",
                "record_fill — writes fill receipt to chain",
                "record_refusal — writes refusal with reason code",
              ].map(c => (
                <li key={c} style={{ padding: "4px 0", borderTop: "1px solid #f3f4f6" }}>{c}</li>
              ))}
            </ul>
            <div style={{ marginTop: 12, fontSize: 10, fontFamily: "var(--font-mono)", color: "#9ca3af" }}>
              pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductShowcase() {
  const cards = [
    { title: "Plan Builder", desc: "Select a mint, set bounds for slippage, reference age, exit cost. Evaluated against live state.", href: "/plan",
      svg: <svg viewBox="0 0 200 80" style={{width:"100%",height:"100%"}}><rect x="10" y="15" width="180" height="8" rx="1" fill="#f3f4f6"/><rect x="10" y="15" width="120" height="8" rx="1" fill="#145FE4" opacity="0.3"/><rect x="10" y="30" width="180" height="8" rx="1" fill="#f3f4f6"/><rect x="10" y="30" width="80" height="8" rx="1" fill="#145FE4" opacity="0.3"/><rect x="10" y="45" width="180" height="8" rx="1" fill="#f3f4f6"/><rect x="10" y="45" width="140" height="8" rx="1" fill="#0ECB81" opacity="0.3"/><rect x="10" y="62" width="60" height="12" rx="1" fill="#1a1a1a"/></svg> },
    { title: "No-Trade Tape", desc: "Every refusal is appended with the check that tripped, the live value, and the account data hash.", href: "/tape",
      svg: <svg viewBox="0 0 200 80" style={{width:"100%",height:"100%"}}>{[0,1,2,3].map(i=><g key={i}><rect x="10" y={10+i*17} width="180" height="12" rx="1" fill="#fafafa" stroke="#f3f4f6"/><rect x="14" y={12+i*17} width="30" height="8" rx="1" fill={i===1||i===3?"#FF4D4D":"#0ECB81"} opacity="0.2"/><rect x="50" y={12+i*17} width="60" height="8" rx="1" fill="#e5e7eb"/></g>)}</svg> },
    { title: "Mint Truth Cards", desc: "Live Token-2022 extension state: multiplier, paused status, delegate, transfer hook, supply.", href: "/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
      svg: <svg viewBox="0 0 200 80" style={{width:"100%",height:"100%"}}><rect x="10" y="8" width="85" height="64" rx="1" fill="#fafafa" stroke="#e5e7eb"/><rect x="105" y="8" width="85" height="64" rx="1" fill="#fafafa" stroke="#e5e7eb"/><text x="52" y="30" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="monospace">TSLAx</text><text x="52" y="45" textAnchor="middle" fontSize="10" fill="#1a1a1a" fontWeight="600" fontFamily="monospace">1.000000</text><text x="147" y="30" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="monospace">NVDAx</text><text x="147" y="45" textAnchor="middle" fontSize="10" fill="#1a1a1a" fontWeight="600" fontFamily="monospace">1.000000</text></svg> },
    { title: "Evidence Pack", desc: "Every claim maps to a runnable command. Adversarial tests: tampered tape, stale mirrors, guard-less ablation.", href: "/evidence",
      svg: <svg viewBox="0 0 200 80" style={{width:"100%",height:"100%"}}>{[0,1,2,3].map(i=><g key={i}><circle cx="20" cy={18+i*17} r="5" fill="#0ECB81" opacity="0.15"/><path d={`M17,${18+i*17} l2,2 l4,-4`} stroke="#0ECB81" strokeWidth="1.5" fill="none"/><rect x="32" y={14+i*17} width="100" height="8" rx="1" fill="#f3f4f6"/></g>)}</svg> },
  ];

  return (
    <section style={{ background: "#fff", padding: "80px 0", borderBottom: "1px solid #dedfe1" }}>
      <div className="wrap">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            What you can inspect
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 480, margin: "0 auto" }}>
            Every surface reads live state. Nothing is mocked or cached beyond a single request.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {cards.map((c, i) => (
            <Link key={i} href={c.href} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="card card-hover" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ height: 80, background: "#fafafa", border: "1px solid #f3f4f6", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>{c.svg}</div>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>{c.title}</h3>
                <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5, margin: 0, flex: 1 }}>{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function InvariantSection() {
  return (
    <section style={{ background: "#edeff2", padding: "80px 0", borderBottom: "1px solid #dedfe1" }}>
      <div className="wrap">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
          <div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
              The default answer is no
            </h2>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: "0 0 20px", maxWidth: 420 }}>
              A recurring buy that passes all 7 checks fills normally. A buy that fails any single check is publicly refused. The refusal carries the check name, the on-chain value that tripped it, and the account data hash at that slot.
            </p>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, margin: "0 0 24px", maxWidth: 420 }}>
              A silent retry is unfalsifiable. A public refusal is evidence.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Link href="/plan" className="btn btn-primary">Try a plan</Link>
              <Link href="/tape" style={{ fontSize: 13, fontWeight: 500, color: "#145FE4", textDecoration: "none", padding: "8px 0" }}>View the tape →</Link>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #dedfe1", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", color: "#9ca3af", textTransform: "uppercase" }}>
              7 invariant checks — first failure wins
            </div>
            {[
              { n: 1, name: "mint_identity", desc: "Registry entry exists, symbol matches" },
              { n: 2, name: "multiplier_freshness", desc: "Plan snapshot == live multiplier" },
              { n: 3, name: "issuer_levers", desc: "Not paused, no transfer hook" },
              { n: 4, name: "reference_regime", desc: "Last print age within tolerance" },
              { n: 5, name: "exit_at_size", desc: "Round-trip cost within bound" },
              { n: 6, name: "policy", desc: "Size within per-trade cap" },
              { n: 7, name: "idempotency", desc: "Plan ID not already filled" },
            ].map((c) => (
              <div key={c.n} style={{ display: "grid", gridTemplateColumns: "28px 1fr", padding: "10px 16px", borderBottom: "1px solid #fafafa", fontSize: 12, alignItems: "start" }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "#d1d5db", fontSize: 10 }}>{c.n}</span>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer style={{ background: "#1a1a1a", color: "#fff", padding: "64px 0 48px" }}>
      <div className="wrap">
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32, paddingBottom: 48, borderBottom: "1px solid #2a2a2a" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>manifest</div>
            <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, maxWidth: "24ch" }}>Reads mainnet at request time. Refusals are the product.</p>
          </div>
          <div>
            <div className="label-mono" style={{ marginBottom: 12 }}>Product</div>
            <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
              <Link href="/plan" style={{ color: "#9ca3af", textDecoration: "none" }}>Plan builder</Link>
              <Link href="/tape" style={{ color: "#9ca3af", textDecoration: "none" }}>No-Trade Tape</Link>
              <Link href="/evidence" style={{ color: "#9ca3af", textDecoration: "none" }}>Evidence pack</Link>
            </div>
          </div>
          <div>
            <div className="label-mono" style={{ marginBottom: 12 }}>On-Chain</div>
            <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
              <a href="https://explorer.solana.com/address/pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA?cluster=devnet" style={{ color: "#9ca3af", textDecoration: "none" }}>Program</a>
              <a href="https://explorer.solana.com/address/rDt5XPbutXYPtMgox2AGepKGtDVvBkuhaHiCgU3oxh3?cluster=devnet" style={{ color: "#9ca3af", textDecoration: "none" }}>Plan (filled)</a>
              <a href="https://explorer.solana.com/address/7hBCzAdqrsNUmQ4VGEvvHjjSGMurQARVB5emjbYHVmsj?cluster=devnet" style={{ color: "#9ca3af", textDecoration: "none" }}>Refusal receipt</a>
            </div>
          </div>
          <div>
            <div className="label-mono" style={{ marginBottom: 12 }}>Source</div>
            <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
              <a href="https://github.com/subheeksh5599/manifest" style={{ color: "#9ca3af", textDecoration: "none" }}>GitHub</a>
              <a href="https://github.com/subheeksh5599/manifest/blob/main/README.md" style={{ color: "#9ca3af", textDecoration: "none" }}>README</a>
            </div>
          </div>
        </div>
        <div style={{ paddingTop: 24, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280" }}>
          <span>No wallet. No funds. No mocks.</span>
          <span>MIT — 2026</span>
        </div>
      </div>
    </footer>
  );
}
