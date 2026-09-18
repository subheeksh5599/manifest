import Link from "next/link";

const MONO = "JetBrains Mono, monospace";

function BlueprintBox({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.02)",
      position: "relative",
      ...style,
    }}>
      {/* Measurement marks */}
      <div style={{ position: "absolute", top: -6, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.1)" }} />
      <div style={{ position: "absolute", top: -6, left: 0, width: 1, height: 6, background: "rgba(255,255,255,0.3)" }} />
      <div style={{ position: "absolute", top: -6, right: 0, width: 1, height: 6, background: "rgba(255,255,255,0.3)" }} />
      <div style={{
        padding: "6px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: MONO }}>{title}</span>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: MONO }}>FIG.{Math.floor(Math.random() * 90 + 10)}</span>
      </div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

function Dimension({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11, fontFamily: MONO }}>
      <span style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      <span style={{ color: "#fff" }}>{value}{unit && <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{unit}</span>}</span>
    </div>
  );
}

export default function V4() {
  return (
    <div style={{
      background: "#0a1628",
      color: "#fff",
      minHeight: "100vh",
      fontFamily: MONO,
      position: "relative",
    }}>
      {/* Blueprint grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      {/* Major grid lines */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "300px 300px",
      }} />

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 2,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 40, height: 40,
            border: "2px solid rgba(255,255,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 300, color: "#fff",
          }}>M</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 300, color: "#fff", letterSpacing: "0.15em" }}>MANIFEST</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3em" }}>TECHNICAL SPECIFICATION</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 32, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
          <span>DOC NO. MFST-2026-001</span>
          <span>REV A</span>
          <span>SHEET 1 OF 1</span>
        </div>
      </div>

      {/* Main */}
      <div style={{ position: "relative", zIndex: 2, padding: 32, maxWidth: 1400, margin: "0 auto" }}>
        {/* Title block */}
        <div style={{ textAlign: "center", padding: "40px 0", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.4em", marginBottom: 20 }}>PREFLIGHT EVALUATION SYSTEM</div>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 300,
            color: "#fff",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            margin: "0 auto 20px",
            maxWidth: "18ch",
          }}>
            A recurring buy that fills at a verified price, or refuses on-chain.
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", maxWidth: "55ch", margin: "0 auto 32px", lineHeight: 1.7 }}>
            Every plan is checked against live Token-2022 extension state at the moment of the trade.
            When a check fails, the transaction never leaves your machine and the refusal is published
            as a receipt anyone can re-verify by re-reading the chain.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Link href="/plan" style={{ textDecoration: "none" }}>
              <div style={{
                padding: "14px 36px",
                background: "#fff",
                color: "#0a1628",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.1em",
                cursor: "pointer",
                transition: "all 200ms",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.9)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              >
                COMPOSE PLAN →
              </div>
            </Link>
            <Link href="/tape" style={{ textDecoration: "none" }}>
              <div style={{
                padding: "14px 36px",
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                letterSpacing: "0.1em",
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: "pointer",
              }}>
                VIEW TAPE
              </div>
            </Link>
          </div>
        </div>

        {/* Spec grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
          <BlueprintBox title="SYSTEM PARAMETERS">
            <Dimension label="MINTS TRACKED" value="5" />
            <Dimension label="INVARIANTS" value="6" />
            <Dimension label="TESTS" value="554" />
            <Dimension label="FAILURES" value="0" />
            <Dimension label="EVALUATOR" value="PURE FN" />
            <Dimension label="I/O" value="NONE" />
          </BlueprintBox>

          <BlueprintBox title="INVARIANT SEQUENCE">
            {[
              ["01", "mint_identity", "registry + symbol match"],
              ["02", "multiplier_freshness", "snapshot == live"],
              ["03", "issuer_levers", "not paused, no hook"],
              ["04", "reference_regime", "age <= max"],
              ["05", "exit_at_size", "cost <= bound"],
              ["06", "policy", "size <= cap"],
            ].map(([n, id, desc]) => (
              <div key={n} style={{ padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 10 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>{n}</span>
                  <span style={{ color: "#fff" }}>{id}</span>
                </div>
                <div style={{ color: "rgba(255,255,255,0.35)", marginLeft: 24, marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </BlueprintBox>

          <BlueprintBox title="LIVE READINGS">
            <Dimension label="SOL/USD" value="$210.19" />
            <Dimension label="BLOCK" value="447,815,683" />
            <Dimension label="EPOCH" value="742" />
            <Dimension label="SLOT TIME" value="400ms" />
            <div style={{ marginTop: 12, padding: "8px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
              LAST EVAL: 2m ago<br />
              LAST REFUSE: 4m ago<br />
              LAST ACCEPT: 12m ago
            </div>
          </BlueprintBox>
        </div>

        {/* Watchlist */}
        <BlueprintBox title="WATCHLIST — LIVE PRICES VIA JUPITER V3" style={{ marginBottom: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            {[
              { sym: "TSLAx", name: "Tesla", price: "371.92", chg: "+2.73%", up: true },
              { sym: "GOOGLx", name: "Alphabet", price: "343.82", chg: "-0.23%", up: false },
              { sym: "HOODx", name: "Robinhood", price: "98.41", chg: "+1.12%", up: true },
              { sym: "NVDAx", name: "NVIDIA", price: "187.33", chg: "+0.89%", up: true },
              { sym: "CRCLx", name: "Circle", price: "64.18", chg: "-0.45%", up: false },
            ].map((s) => (
              <div key={s.sym} style={{
                padding: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.02)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 18, fontWeight: 300, color: "#fff", marginBottom: 4 }}>{s.sym}</div>
                <div style={{ fontSize: 14, color: "#fff" }}>${s.price}</div>
                <div style={{ fontSize: 10, color: s.up ? "#4CAF50" : "#FF5722", marginTop: 4 }}>{s.chg}</div>
              </div>
            ))}
          </div>
        </BlueprintBox>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", padding: "32px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3em", marginBottom: 20 }}>END OF SPECIFICATION</div>
          <Link href="/plan" style={{ textDecoration: "none" }}>
            <div style={{
              display: "inline-block",
              padding: "18px 56px",
              background: "transparent",
              color: "#fff",
              fontSize: 13,
              fontWeight: 300,
              letterSpacing: "0.2em",
              border: "2px solid rgba(255,255,255,0.3)",
              cursor: "pointer",
              transition: "all 300ms",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#0a1628"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#fff"; }}
            >
              OPEN PLAN BUILDER
            </div>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "relative", zIndex: 2,
        borderTop: "1px solid rgba(255,255,255,0.1)",
        padding: "12px 32px",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 9,
        color: "rgba(255,255,255,0.2)",
      }}>
        <span>MANIFEST TECHNICAL SPECIFICATION — REV A</span>
        <span>DRAWN TO SCALE — NOT TO SCALE</span>
        <span>554 TESTS — 0 FAILURES</span>
      </div>
    </div>
  );
}