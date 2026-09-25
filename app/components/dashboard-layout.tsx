import Link from "next/link";
import { ReactNode } from "react";

const nav = [
  { label: "Overview", href: "/", icon: "◆" },
  { label: "Exit Desk", href: "/exit", icon: "⇥" },
  { label: "Issuers", href: "/issuers", icon: "◫" },
  { label: "Tape", href: "/tape", icon: "▤" },
  { label: "Mint Inspector", href: `/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB`, icon: "◎" },
  { label: "Evidence", href: "/evidence", icon: "⚙" },
  { label: "Verification", href: "/verify", icon: "✓" },
];

/** Which nav item a page's `active` value belongs to. */
const ACTIVE_FOR: Record<string, string> = {
  overview: "/",
  exit: "/exit",
  issuers: "/issuers",
  tape: "/tape",
  evidence: "/evidence",
  verify: "/verify",
  mints: "/mint",
};

export default function DashboardLayout({ children, active }: { children: ReactNode; active: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{
        background: "#1a1a1a", display: "flex", flexDirection: "column",
        borderRight: "1px solid #2a2a2a",
      }}>
        <Link href="/" style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "20px 24px", textDecoration: "none", color: "#fff",
          borderBottom: "1px solid #2a2a2a",
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.03em" }}>manifest</span>
        </Link>

        <nav style={{ padding: "12px 0", flex: 1 }}>
          {nav.map((n) => {
            const target = ACTIVE_FOR[active] ?? n.href;
            const isActive = n.href === target || (target !== "/" && n.href.startsWith(target));
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 24px", fontSize: 13, fontWeight: 500,
                  color: isActive ? "#fff" : "#9ca3af",
                  background: isActive ? "rgba(20, 95, 228, 0.12)" : "transparent",
                  borderLeft: isActive ? "2px solid #145FE4" : "2px solid transparent",
                  textDecoration: "none",
                  transition: "all 120ms",
                }}
              >
                <span style={{ fontSize: 13, opacity: 0.5, width: 16, textAlign: "center" }}>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #2a2a2a" }}>
          <div style={{
            fontSize: 10, color: "#6b7280",
            fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
            lineHeight: 1.7,
          }}>
            READS · mainnet + devnet
            <br />
            token-2022 exit terms
          </div>
        </div>
      </aside>

      <div style={{ background: "#fff", padding: "32px 40px", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
