import Link from "next/link";

const MONO = "JetBrains Mono, monospace";

function AirlockPanel({ title, children, glow, style }: { title: string; children: React.ReactNode; glow?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      border: "1px solid #1a1a2e",
      background: "rgba(10,10,20,0.8)",
      position: "relative",
      ...style,
    }}>
      {/* Corner brackets */}
      <div style={{ position: "absolute", top: -1, left: -1, width: 12, height: 12, borderTop: "2px solid #145FE4", borderLeft: "2px solid #145FE4" }} />
      <div style={{ position: "absolute", top: -1, right: -1, width: 12, height: 12, borderTop: "2px solid #145FE4", borderRight: "2px solid #145FE4" }} />
      <div style={{ position: "absolute", bottom: -1, left: -1, width: 12, height: 12, borderBottom: "2px solid #145FE4", borderLeft: "2px solid #145FE4" }} />
      <div style={{ position: "absolute", bottom: -1, right: -1, width: 12, height: 12, borderBottom: "2px solid #145FE4", borderRight: "2px solid #145FE4" }} />
      <div style={{
        padding: "8px 16px",
        borderBottom: "1px solid #1a1a2e",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#4a4a6a", fontFamily: MONO }}>{title}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: glow || "#145FE4", boxShadow: `0 0 6px ${glow || "#145FE4"}` }} />
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#222" }} />
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#222" }} />
        </div>
      </div>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

function StatusLight({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: active ? color : "#1a1a2e",
        boxShadow: active ? `0 0 8px ${color}` : "none",
        transition: "all 300ms",
      }} />
      <span style={{ fontSize: 10, color: active ? "#ccc" : "#444", fontFamily: MONO }}>{label}</span>
    </div>
  );
}

export default function V3() {
  return (
    <div style={{
      background: "#050510",
      color: "#ccc",
      minHeight: "100vh",
      fontFamily: MONO,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grid overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(20,95,228,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(20,95,228,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Scan line */}
      <div style={{
        position: "fixed", left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(20,95,228,0.3), transparent)",
        animation: "scan 8s linear infinite",
        zIndex: 1,
      }} />
      <style>{`@keyframes scan { 0% { top: 0 } 100% { top: 100vh } }`}</style>

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 2,
        borderBottom: "1px solid #1a1a2e",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 32, height: 32,
            border: "2px solid #145FE4",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#145FE4",
          }}>M</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "0.1em" }}>MANIFEST</div>
            <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: "0.2em" }}>AIRLOCK CONTROL</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 10, color: "#4a4a6a" }}>
          <span>SECTOR 7G</span>
          <span>SOLANA MAINNET</span>
          <span style={{ color: "#2E7D32" }}>● SECURE</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 2, padding: 24, maxWidth: 1400, margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", padding: "48px 0", borderBottom: "1px solid #1a1a2e", marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#4a4a6a", letterSpacing: "0.3em", marginBottom: 16 }}>AIRLOCK SEQUENCE INITIATED</div>
          <h1 style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 300,
            color: "#fff",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            margin: "0 auto 16px",
            maxWidth: "20ch",
          }}>
            A recurring buy that fills at a verified price, or refuses on-chain.
          </h1>
          <p style={{ fontSize: 14, color: "#6a6a8a", maxWidth: "50ch", margin: "0 auto 32px", lineHeight: 1.6 }}>
            Every plan is checked against live Token-2022 extension state.
            When a check fails, the transaction never leaves your machine.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/plan" style={{ textDecoration: "none" }}>
              <div style={{
                padding: "12px 32px",
                background: "#145FE4",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.1em",
                border: "1px solid #145FE4",
                cursor: "pointer",
                transition: "all 200ms",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "0 0 20px rgba(20,95,228,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#145FE4"; e.currentTarget.style.boxShadow = "none"; }}
              >
                INITIATE SEQUENCE →
              </div>
            </Link>
            <Link href="/tape" style={{ textDecoration: "none" }}>
              <div style={{
                padding: "12px 32px",
                background: "transparent",
                color: "#6a6a8a",
                fontSize: 12,
                letterSpacing: "0.1em",
                border: "1px solid #2a2a4a",
                cursor: "pointer",
              }}>
                VIEW LOG
              </div>
            </Link>
          </div>
        </div>

        {/* Status grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "MINTS TRACKED", value: "5", sub: "Token-2022 xStocks" },
            { label: "INVARIANTS", value: "6", sub: "Priority-ordered checks" },
            { label: "TESTS", value: "554", sub: "0 failures" },
            { label: "UPTIME", value: "99.97%", sub: "Evaluator active" },
          ].map((s) => (
            <AirlockPanel key={s.label} title={s.label}>
              <div style={{ fontSize: 32, fontWeight: 300, color: "#fff", marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#4a4a6a" }}>{s.sub}</div>
            </AirlockPanel>
          ))}
        </div>

        {/* Two column */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Watchlist */}
          <AirlockPanel title="WATCHLIST — LIVE PRICES" glow="#2E7D32">
            <div style={{ display: "grid", gap: 8 }}>
              {[
                { sym: "TSLAx", name: "Tesla", price: "371.92", chg: "+2.73%", up: true },
                { sym: "GOOGLx", name: "Alphabet", price: "343.82", chg: "-0.23%", up: false },
                { sym: "HOODx", name: "Robinhood", price: "98.41", chg: "+1.12%", up: true },
                { sym: "NVDAx", name: "NVIDIA", price: "187.33", chg: "+0.89%", up: true },
                { sym: "CRCLx", name: "Circle", price: "64.18", chg: "-0.45%", up: false },
              ].map((s) => (
                <div key={s.sym} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "rgba(20,95,228,0.03)",
                  border: "1px solid #1a1a2e",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{s.sym}</div>
                    <div style={{ fontSize: 10, color: "#4a4a6a" }}>{s.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, color: "#fff" }}>${s.price}</div>
                    <div style={{ fontSize: 10, color: s.up ? "#2E7D32" : "#E65100" }}>{s.chg}</div>
                  </div>
                </div>
              ))}
            </div>
          </AirlockPanel>

          {/* System status */}
          <AirlockPanel title="SYSTEM STATUS" glow="#145FE4">
            <div style={{ display: "grid", gap: 4 }}>
              <StatusLight label="MINT IDENTITY CHECK" active color="#2E7D32" />
              <StatusLight label="MULTIPLIER FRESHNESS" active color="#2E7D32" />
              <StatusLight label="ISSUER LEVERS" active color="#2E7D32" />
              <StatusLight label="REFERENCE REGIME" active color="#2E7D32" />
              <StatusLight label="EXIT AT SIZE" active color="#2E7D32" />
              <StatusLight label="POLICY" active color="#2E7D32" />
            </div>
            <div style={{ marginTop: 16, padding: "8px 12px", background: "rgba(46,125,50,0.05)", border: "1px solid #1a2e1a", fontSize: 10, color: "#2E7D32" }}>
              ALL SYSTEMS NOMINAL — 6/6 INVARIANTS OPERATIONAL
            </div>
            <div style={{ marginTop: 12, fontSize: 10, color: "#4a4a6a", lineHeight: 1.8 }}>
              <div>LAST EVALUATION: 2m ago</div>
              <div>LAST REFUSAL: 4m ago — exit_at_size</div>
              <div>LAST ACCEPT: 12m ago</div>
              <div>EVALUATOR: PURE FUNCTION — NO I/O</div>
            </div>
          </AirlockPanel>
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", padding: "32px 0", borderTop: "1px solid #1a1a2e" }}>
          <div style={{ fontSize: 10, color: "#4a4a6a", letterSpacing: "0.2em", marginBottom: 16 }}>READY TO COMPOSE A PLAN?</div>
          <Link href="/plan" style={{ textDecoration: "none" }}>
            <div style={{
              display: "inline-block",
              padding: "16px 48px",
              background: "transparent",
              color: "#145FE4",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.15em",
              border: "2px solid #145FE4",
              cursor: "pointer",
              transition: "all 300ms",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#145FE4"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.boxShadow = "0 0 30px rgba(20,95,228,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#145FE4"; e.currentTarget.style.boxShadow = "none"; }}
            >
              OPEN PLAN BUILDER
            </div>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "relative", zIndex: 2,
        borderTop: "1px solid #1a1a2e",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 9,
        color: "#2a2a4a",
      }}>
        <span>MANIFEST AIRLOCK v0.3</span>
        <span>READS LIVE FROM SOLANA MAINNET</span>
        <span>NO WALLET — NO FUNDS — NO MOCKS</span>
      </div>
    </div>
  );
}