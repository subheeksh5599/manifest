"use client";

import Link from "next/link";

const MONO = "JetBrains Mono, monospace";

export default function V7() {
  return (
    <div style={{ background: "#fff", color: "#000", fontFamily: "Inter, sans-serif" }}>
      {/* Nav */}
      <nav style={{ padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee" }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Manifest</div>
        <div style={{ display: "flex", gap: 24, fontSize: 14, color: "#666" }}>
          <Link href="/plan" style={{ color: "#666", textDecoration: "none" }}>Plan</Link>
          <Link href="/tape" style={{ color: "#666", textDecoration: "none" }}>Tape</Link>
          <Link href="/evidence" style={{ color: "#666", textDecoration: "none" }}>Evidence</Link>
          <Link href="/plan" style={{ color: "#000", textDecoration: "none", fontWeight: 600 }}>Get started →</Link>
        </div>
      </nav>

      {/* Hero with product screenshot */}
      <section style={{ padding: "80px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.05, margin: "0 auto 20px", maxWidth: "16ch" }}>
            A recurring buy that fills at a verified price, or refuses on-chain.
          </h1>
          <p style={{ fontSize: 18, color: "#666", maxWidth: "55ch", margin: "0 auto 32px", lineHeight: 1.6 }}>
            Manifest schedules purchases of tokenized equities on Solana. Every plan is checked against live Token-2022 extension state at the moment of the trade.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/plan" style={{ textDecoration: "none" }}>
              <div style={{ padding: "14px 32px", background: "#000", color: "#fff", fontSize: 15, fontWeight: 500, borderRadius: 6, cursor: "pointer" }}>
                Try a plan →
              </div>
            </Link>
            <Link href="/tape" style={{ textDecoration: "none" }}>
              <div style={{ padding: "14px 32px", background: "transparent", color: "#000", fontSize: 15, fontWeight: 500, borderRadius: 6, border: "1px solid #ddd", cursor: "pointer" }}>
                Read the tape
              </div>
            </Link>
          </div>
        </div>

        {/* Product screenshot mockup */}
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e0e0e0", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}>
          {/* Browser chrome */}
          <div style={{ background: "#f5f5f5", padding: "10px 16px", display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid #e0e0e0" }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#27C93F" }} />
            <span style={{ marginLeft: 24, fontSize: 12, color: "#999", fontFamily: MONO, padding: "2px 12px", background: "#fff", borderRadius: 4, border: "1px solid #e0e0e0" }}>manifest.xyz/plan</span>
          </div>
          {/* App content */}
          <div style={{ background: "#fff", padding: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, color: "#999", fontFamily: MONO, marginBottom: 16, letterSpacing: "0.1em" }}>PLAN CONFIGURATION</div>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  ["MINT", "TSLAx · Tesla xStock"],
                  ["MULTIPLIER SNAPSHOT", "1.000000"],
                  ["ROUTE COST", "30 bps"],
                  ["EXIT BOUND", "100 bps"],
                  ["REQUESTED SIZE", "1,000,000"],
                  ["PER-TRADE CAP", "5,000,000"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                    <span style={{ color: "#999", fontFamily: MONO, fontSize: 11 }}>{k}</span>
                    <span style={{ color: "#000" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: "12px 20px", background: "#000", color: "#fff", borderRadius: 6, fontSize: 14, fontWeight: 500, textAlign: "center", cursor: "pointer" }}>
                Run preflight
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#999", fontFamily: MONO, marginBottom: 16, letterSpacing: "0.1em" }}>LIVE STATE</div>
              <div style={{ fontSize: 13, lineHeight: 2, fontFamily: MONO }}>
                <div style={{ color: "#2E7D32" }}>▸ reading Token-2022 extension state...</div>
                <div style={{ color: "#2E7D32" }}>▸ scaledUiAmountConfig.multiplier = 1.000000</div>
                <div style={{ color: "#2E7D32" }}>▸ pausableConfig.paused = false</div>
                <div style={{ color: "#2E7D32" }}>▸ permanentDelegate = 5aMN...HFvEq</div>
                <div style={{ color: "#2E7D32" }}>▸ transferHook = null</div>
                <div style={{ color: "#145FE4" }}>▸ composing Jupiter swap route...</div>
                <div style={{ color: "#145FE4" }}>▸ route cost = 28 bps</div>
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#E8F5E9", borderRadius: 6, color: "#2E7D32", fontWeight: 600 }}>
                  ✓ VERDICT: ACCEPT
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video section */}
      <section style={{ padding: "80px 32px", background: "#fafafa" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-0.02em", marginBottom: 16 }}>See it in action</h2>
          <p style={{ fontSize: 16, color: "#666", marginBottom: 32 }}>Watch a plan get evaluated against live mainnet state in under 30 seconds.</p>
          {/* Video placeholder */}
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e0e0e0", background: "#000", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "#666" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>▶</div>
              <div style={{ fontSize: 14 }}>Demo video — 2 min</div>
              <div style={{ fontSize: 12, color: "#444", marginTop: 8 }}>Landing → Plan builder → Evaluation → Verdict → Tape</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features with screenshots */}
      <section style={{ padding: "80px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-0.02em", textAlign: "center", marginBottom: 48 }}>Four surfaces. One invariant guard.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          {[
            { title: "Plan builder", desc: "Compose a plan in seven bounds. Live price from Jupiter V3 shown inline. Estimated fill price calculated from route cost.", img: "plan" },
            { title: "Refusal tape", desc: "Every check that trips is written to an append-only tape with the named check, the account data hash, and the slot it was read at.", img: "tape" },
            { title: "Mint truth cards", desc: "One page per issuer mint reads live Token-2022 state per request: multiplier, pause flag, permanent delegate, transfer hook.", img: "mint" },
            { title: "Evidence pack", desc: "Every claim in the repo maps to a runnable command. verify_receipts.py re-reads every mint quoted in the README.", img: "evidence" },
          ].map((f) => (
            <div key={f.title} style={{ display: "grid", gap: 16 }}>
              <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #e0e0e0", background: "#f5f5f5", aspectRatio: "16/10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center", color: "#999" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>□</div>
                  <div style={{ fontSize: 12, fontFamily: MONO }}>{f.img}.png</div>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Market ticker */}
      <section style={{ padding: "48px 32px", background: "#000", color: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#666", fontFamily: MONO, letterSpacing: "0.2em", marginBottom: 24, textAlign: "center" }}>LIVE PRICES VIA JUPITER V3</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 24 }}>
            {[
              { sym: "TSLAx", name: "Tesla", price: "371.92", chg: "+2.73%", up: true },
              { sym: "GOOGLx", name: "Alphabet", price: "343.82", chg: "-0.23%", up: false },
              { sym: "HOODx", name: "Robinhood", price: "98.41", chg: "+1.12%", up: true },
              { sym: "NVDAx", name: "NVIDIA", price: "187.33", chg: "+0.89%", up: true },
              { sym: "CRCLx", name: "Circle", price: "64.18", chg: "-0.45%", up: false },
            ].map((s) => (
              <div key={s.sym} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 20, fontWeight: 300 }}>{s.sym}</div>
                <div style={{ fontSize: 16, marginTop: 4 }}>${s.price}</div>
                <div style={{ fontSize: 12, color: s.up ? "#4CAF50" : "#FF5722", marginTop: 4 }}>{s.chg}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 32px", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-0.02em", marginBottom: 16 }}>The default answer is no.</h2>
        <p style={{ fontSize: 16, color: "#666", maxWidth: "50ch", margin: "0 auto 32px" }}>
          No unit of equity moves unless the trade is provably safe at that instant.
        </p>
        <Link href="/plan" style={{ textDecoration: "none" }}>
          <div style={{ display: "inline-block", padding: "16px 48px", background: "#000", color: "#fff", fontSize: 15, fontWeight: 500, borderRadius: 6, cursor: "pointer" }}>
            Try a plan →
          </div>
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", fontSize: 13, color: "#999" }}>
        <span>Manifest — 2026</span>
        <span>554 tests passing</span>
        <span>MIT</span>
      </footer>
    </div>
  );
}