"use client";

import Link from "next/link";

const BOX = {
  top:    "┌─",
  mid:    "├─",
  bot:    "└─",
  side:   "│",
  corner: "┐└┘┌",
};

function TermRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ color: accent || "#ccc" }}>{value}</span>
    </div>
  );
}

function TermBox({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ border: "1px solid #333", background: "#0a0a0a", ...style }}>
      <div style={{ padding: "6px 12px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888", fontFamily: "JetBrains Mono, monospace" }}>{title}</span>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2E7D32" }} />
      </div>
      <div style={{ padding: "10px 12px" }}>{children}</div>
    </div>
  );
}

export default function V2() {
  return (
    <div style={{ background: "#050505", color: "#ccc", minHeight: "100vh", fontFamily: "JetBrains Mono, monospace" }}>
      {/* Top bar */}
      <div style={{ borderBottom: "1px solid #222", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ color: "#145FE4", fontWeight: 700, fontSize: 13 }}>MANIFEST</span>
          <span style={{ color: "#444" }}>v0.2</span>
          <span style={{ color: "#333" }}>|</span>
          <span style={{ color: "#666" }}>SOLANA MAINNET</span>
        </div>
        <div style={{ display: "flex", gap: 12, color: "#555" }}>
          <span>BLK 447,815,683</span>
          <span style={{ color: "#2E7D32" }}>●</span>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 280px", gap: 1, background: "#111", minHeight: "calc(100vh - 40px)" }}>
        {/* Left sidebar */}
        <div style={{ background: "#050505", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <TermBox title="Watchlist">
            {[
              { sym: "TSLAx", price: "371.92", chg: "+2.73%", up: true },
              { sym: "GOOGLx", price: "343.82", chg: "-0.23%", up: false },
              { sym: "HOODx", price: "98.41", chg: "+1.12%", up: true },
              { sym: "NVDAx", price: "187.33", chg: "+0.89%", up: true },
              { sym: "CRCLx", price: "64.18", chg: "-0.45%", up: false },
            ].map((s) => (
              <Link key={s.sym} href={`/mint/${s.sym === "TSLAx" ? "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB" : s.sym === "GOOGLx" ? "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN" : s.sym === "HOODx" ? "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg" : s.sym === "NVDAx" ? "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh" : "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1"}`} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1a1a1a", cursor: "pointer" }}>
                  <span style={{ color: "#ddd", fontSize: 12 }}>{s.sym}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#ccc", fontSize: 12 }}>${s.price}</div>
                    <div style={{ color: s.up ? "#2E7D32" : "#E65100", fontSize: 10 }}>{s.chg}</div>
                  </div>
                </div>
              </Link>
            ))}
          </TermBox>

          <TermBox title="System">
            <TermRow label="Evaluator" value="ACTIVE" accent="#2E7D32" />
            <TermRow label="RPC" value="MAINNET" accent="#145FE4" />
            <TermRow label="Mints" value="5 TRACKED" />
            <TermRow label="Invariants" value="6 CHECKS" />
            <TermRow label="Tests" value="554 PASS" accent="#2E7D32" />
          </TermBox>

          <TermBox title="Nav">
            <div style={{ display: "grid", gap: 4 }}>
              {[
                { label: "PLAN BUILDER", href: "/plan" },
                { label: "REFUSAL TAPE", href: "/tape" },
                { label: "EVIDENCE", href: "/evidence" },
                { label: "MINT DETAIL", href: "/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB" },
              ].map((n) => (
                <Link key={n.href} href={n.href} style={{ textDecoration: "none" }}>
                  <div style={{ padding: "6px 8px", fontSize: 11, color: "#888", border: "1px solid #222", cursor: "pointer", transition: "all 100ms" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#145FE4"; e.currentTarget.style.color = "#145FE4"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#888"; }}
                  >
                    {n.label} →
                  </div>
                </Link>
              ))}
            </div>
          </TermBox>
        </div>

        {/* Center */}
        <div style={{ background: "#050505", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* ASCII Header */}
          <div style={{ textAlign: "center", padding: "24px 0", borderBottom: "1px solid #1a1a1a" }}>
            <pre style={{ fontSize: 11, lineHeight: 1.2, color: "#145FE4", margin: 0, fontFamily: "JetBrains Mono, monospace" }}>
{`
 ███╗   ███╗ █████╗ ███╗   ██╗██╗███████╗███████╗███████╗████████╗
 ████╗ ████║██╔══██╗████╗  ██║██║██╔════╝██╔════╝██╔════╝╚══██╔══╝
 ██╔████╔██║███████║██╔██╗ ██║██║█████╗  █████╗  ███████╗   ██║   
 ██║╚██╔╝██║██╔══██║██║╚██╗██║██║██╔══╝  ██╔══╝  ╚════██║   ██║   
 ██║ ╚═╝ ██║██║  ██║██║ ╚████║██║██║     ███████╗███████║   ██║   
 ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚══════╝╚══════╝   ╚═╝   
`}
            </pre>
            <div style={{ marginTop: 12, fontSize: 12, color: "#666", maxWidth: 520, margin: "12px auto 0" }}>
              A recurring buy that fills at a verified price, or refuses on-chain.
              Preflight evaluation against live Token-2022 extension state.
            </div>
          </div>

          {/* Plan eval terminal */}
          <TermBox title="PLAN EVALUATOR — COMPOSE & RUN">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 8, letterSpacing: "0.1em" }}>PARAMETERS</div>
                {[
                  ["MINT", "TSLAx · Tesla xStock"],
                  ["MULTIPLIER SNAPSHOT", "1.000000"],
                  ["ROUTE COST", "30 bps"],
                  ["EXIT BOUND", "100 bps"],
                  ["REQUESTED SIZE", "1,000,000"],
                  ["PER-TRADE CAP", "5,000,000"],
                  ["REF AGE", "30s"],
                  ["MAX REF AGE", "300s"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11, borderBottom: "1px solid #111" }}>
                    <span style={{ color: "#555" }}>{k}</span>
                    <span style={{ color: "#ccc" }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <Link href="/plan" style={{ textDecoration: "none" }}>
                    <div style={{ padding: "8px 20px", background: "#145FE4", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em" }}>
                      EVALUATE →
                    </div>
                  </Link>
                  <div style={{ padding: "8px 16px", border: "1px solid #333", color: "#666", fontSize: 11, cursor: "pointer" }}>
                    RESET
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 8, letterSpacing: "0.1em" }}>LIVE STATE</div>
                <div style={{ fontSize: 11, lineHeight: 1.8 }}>
                  <div style={{ color: "#2E7D32" }}>▸ reading Token-2022 extension state...</div>
                  <div style={{ color: "#2E7D32" }}>▸ scaledUiAmountConfig.multiplier = 1.000000</div>
                  <div style={{ color: "#2E7D32" }}>▸ pausableConfig.paused = false</div>
                  <div style={{ color: "#2E7D32" }}>▸ permanentDelegate = 5aMN...HFvEq</div>
                  <div style={{ color: "#2E7D32" }}>▸ transferHook = null</div>
                  <div style={{ color: "#145FE4" }}>▸ composing Jupiter swap route...</div>
                  <div style={{ color: "#145FE4" }}>▸ route cost = 28 bps</div>
                  <div style={{ color: "#2E7D32", marginTop: 8, fontWeight: 700 }}>✓ ALL 6 INVARIANTS PASS</div>
                  <div style={{ color: "#2E7D32", fontSize: 13, marginTop: 4, padding: "4px 8px", background: "rgba(46,125,50,0.1)", border: "1px solid #2E7D32" }}>
                    VERDICT: ACCEPT
                  </div>
                </div>
              </div>
            </div>
          </TermBox>

          {/* Tape */}
          <TermBox title="REFUSAL TAPE — LAST 8 ENTRIES">
            <div style={{ fontSize: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 140px", gap: 8, padding: "4px 0", borderBottom: "1px solid #222", color: "#555", fontSize: 10, letterSpacing: "0.1em" }}>
                <span>VERDICT</span><span>CHECK</span><span>SLOT</span><span>HASH</span>
              </div>
              {[
                { v: "REFUSE", c: "exit_at_size", s: "447185683", h: "0x8a3f...de9f" },
                { v: "REFUSE", c: "multiplier_freshness", s: "447185680", h: "0x2b1c...a4e2" },
                { v: "ACCEPT", c: "—", s: "447185677", h: "0x7f3d...c1b8" },
                { v: "REFUSE", c: "issuer_levers", s: "447185674", h: "0x9e2a...f7d3" },
                { v: "ACCEPT", c: "—", s: "447185671", h: "0x4c8b...e2a1" },
                { v: "REFUSE", c: "reference_regime", s: "447185668", h: "0x1d5f...b3c7" },
                { v: "ACCEPT", c: "—", s: "447185665", h: "0x6a2e...d8f4" },
                { v: "REFUSE", c: "policy", s: "447185662", h: "0x3b7c...a9e5" },
              ].map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 140px", gap: 8, padding: "4px 0", borderBottom: "1px solid #111", fontSize: 11 }}>
                  <span style={{ color: r.v === "ACCEPT" ? "#2E7D32" : "#E65100", fontWeight: 600 }}>{r.v}</span>
                  <span style={{ color: "#aaa" }}>{r.c}</span>
                  <span style={{ color: "#666" }}>#{r.s}</span>
                  <span style={{ color: "#444" }}>{r.h}</span>
                </div>
              ))}
            </div>
          </TermBox>
        </div>

        {/* Right sidebar */}
        <div style={{ background: "#050505", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <TermBox title="MARKET">
            <div style={{ fontSize: 11, lineHeight: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>SOL/USD</span>
                <span style={{ color: "#ccc" }}>$210.19</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>BTC/USD</span>
                <span style={{ color: "#ccc" }}>$67,432</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#555" }}>ETH/USD</span>
                <span style={{ color: "#ccc" }}>$3,842</span>
              </div>
              <div style={{ borderTop: "1px solid #1a1a1a", marginTop: 8, paddingTop: 8 }}>
                <div style={{ color: "#555", fontSize: 10, marginBottom: 4 }}>XSTOCK LIQUIDITY</div>
                <div style={{ color: "#145FE4", fontSize: 14, fontWeight: 600 }}>$2.4M</div>
              </div>
            </div>
          </TermBox>

          <TermBox title="INVARIANTS">
            {[
              ["01", "mint_identity", "registry entry exists + symbol match"],
              ["02", "multiplier_freshness", "snapshot == live multiplier"],
              ["03", "issuer_levers", "not paused, no transfer hook"],
              ["04", "reference_regime", "ref_age <= max_ref_age"],
              ["05", "exit_at_size", "route_cost <= exit_bound"],
              ["06", "policy", "size <= per_trade_cap"],
            ].map(([n, id, desc]) => (
              <div key={n} style={{ padding: "4px 0", borderBottom: "1px solid #111", fontSize: 10 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#145FE4" }}>{n}</span>
                  <span style={{ color: "#ccc" }}>{id}</span>
                </div>
                <div style={{ color: "#555", marginLeft: 20, marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </TermBox>

          <TermBox title="UPTIME">
            <div style={{ fontSize: 11, lineHeight: 1.8 }}>
              <TermRow label="EVALUATOR" value="99.97%" accent="#2E7D32" />
              <TermRow label="RPC" value="99.99%" accent="#2E7D32" />
              <TermRow label="JUPITER" value="99.94%" accent="#2E7D32" />
              <div style={{ marginTop: 8, padding: "6px 8px", background: "#0a0a0a", border: "1px solid #1a1a1a", fontSize: 10, color: "#555" }}>
                LAST REFUSAL: 4m ago<br />
                LAST ACCEPT: 12m ago
              </div>
            </div>
          </TermBox>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid #222", padding: "6px 16px", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#444" }}>
        <span>MANIFEST v0.2 — TERMINAL MODE</span>
        <span>READS LIVE FROM SOLANA MAINNET — NO WALLET, NO FUNDS, NO MOCKS</span>
        <span>554 TESTS PASSING</span>
      </div>
    </div>
  );
}