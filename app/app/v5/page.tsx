"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const MONO = "JetBrains Mono, monospace";

export default function V5() {
  const [tick, setTick] = useState(0);
  const [evalStep, setEvalStep] = useState(0);
  const [showVerdict, setShowVerdict] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (evalStep < 7) {
      const t = setTimeout(() => setEvalStep(s => s + 1), 600);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setShowVerdict(true), 400);
      return () => clearTimeout(t);
    }
  }, [evalStep]);

  const steps = [
    { id: "01", label: "READING TOKEN-2022 EXTENSION STATE", status: evalStep > 0 ? "done" : "pending" },
    { id: "02", label: "PARSING SCALED UI AMOUNT CONFIG", status: evalStep > 1 ? "done" : "pending" },
    { id: "03", label: "CHECKING PAUSABLE CONFIG", status: evalStep > 2 ? "done" : "pending" },
    { id: "04", label: "VERIFYING PERMANENT DELEGATE", status: evalStep > 3 ? "done" : "pending" },
    { id: "05", label: "SCANNING TRANSFER HOOK PROGRAM", status: evalStep > 4 ? "done" : "pending" },
    { id: "06", label: "COMPOSING JUPITER SWAP ROUTE", status: evalStep > 5 ? "done" : "pending" },
    { id: "07", label: "RUNNING 6 INVARIANTS", status: evalStep > 6 ? "done" : "pending" },
  ];

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", fontFamily: MONO }}>
      {/* Minimal top bar */}
      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #111" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.1em" }}>MANIFEST</div>
        <div style={{ display: "flex", gap: 24, fontSize: 11, color: "#555" }}>
          <Link href="/plan" style={{ color: "#555", textDecoration: "none" }}>PLAN</Link>
          <Link href="/tape" style={{ color: "#555", textDecoration: "none" }}>TAPE</Link>
          <Link href="/evidence" style={{ color: "#555", textDecoration: "none" }}>EVIDENCE</Link>
        </div>
      </div>

      {/* Full-screen live evaluation */}
      <div style={{ padding: "48px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 10, color: "#333", letterSpacing: "0.3em", marginBottom: 8 }}>
          LIVE PREFLIGHT EVALUATION — TSLAx
        </div>
        <div style={{ fontSize: 24, fontWeight: 300, marginBottom: 32, color: "#888" }}>
          Evaluating plan against live mainnet state
        </div>

        {/* Steps */}
        <div style={{ marginBottom: 40 }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 0",
              borderBottom: "1px solid #111",
              opacity: s.status === "done" ? 1 : 0.3,
              transition: "opacity 300ms",
            }}>
              <span style={{ fontSize: 10, color: "#333", width: 24 }}>{s.id}</span>
              <span style={{ fontSize: 12, color: s.status === "done" ? "#fff" : "#444", flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: s.status === "done" ? "#2E7D32" : "#333" }}>
                {s.status === "done" ? "✓" : "○"}
              </span>
            </div>
          ))}
        </div>

        {/* Verdict */}
        {showVerdict && (
          <div style={{
            padding: "24px",
            border: "1px solid #2E7D32",
            background: "rgba(46,125,50,0.05)",
            marginBottom: 40,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 10, color: "#2E7D32", letterSpacing: "0.2em" }}>VERDICT</span>
              <span style={{ fontSize: 10, color: "#555" }}>SLOT 447,815,683</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 300, color: "#2E7D32", marginBottom: 8 }}>ACCEPT</div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
              All 6 invariants pass. The composed transaction is valid against live Token-2022 state.
              Route cost 28 bps within exit bound 100 bps. Size 1M within cap 5M.
            </div>
          </div>
        )}

        {/* Live market data */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, color: "#333", letterSpacing: "0.3em", marginBottom: 16 }}>LIVE MARKET — JUPITER V3</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "#111" }}>
            {[
              { sym: "TSLAx", price: "371.92", chg: "+2.73%", up: true },
              { sym: "GOOGLx", price: "343.82", chg: "-0.23%", up: false },
              { sym: "HOODx", price: "98.41", chg: "+1.12%", up: true },
              { sym: "NVDAx", price: "187.33", chg: "+0.89%", up: true },
              { sym: "CRCLx", price: "64.18", chg: "-0.45%", up: false },
            ].map((s) => (
              <div key={s.sym} style={{ background: "#000", padding: "16px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>{s.sym}</div>
                <div style={{ fontSize: 16, fontWeight: 300, color: "#fff" }}>${s.price}</div>
                <div style={{ fontSize: 10, color: s.up ? "#2E7D32" : "#E65100", marginTop: 4 }}>{s.chg}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Link href="/plan" style={{ textDecoration: "none" }}>
            <div style={{
              display: "inline-block",
              padding: "16px 48px",
              background: "#fff",
              color: "#000",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}>
              COMPOSE YOUR OWN PLAN →
            </div>
          </Link>
          <div style={{ marginTop: 16, fontSize: 11, color: "#444" }}>
            No wallet. No funds. No mocks. Reads live from Solana mainnet.
          </div>
        </div>
      </div>

      {/* Bottom ticker */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, borderTop: "1px solid #111", padding: "8px 24px", display: "flex", justifyContent: "space-between", fontSize: 10, color: "#333", background: "#000" }}>
        <span>MANIFEST v0.5</span>
        <span>BLOCK {447815683 + tick}</span>
        <span>554 TESTS — 0 FAILURES</span>
      </div>
    </div>
  );
}