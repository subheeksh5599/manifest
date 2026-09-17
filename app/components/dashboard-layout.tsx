import Link from "next/link";
import { ReactNode } from "react";

const nav = [
  { label: "Overview", href: "/", icon: "◆" },
  { label: "Plans", href: "/plan", icon: "◈" },
  { label: "Tape", href: "/tape", icon: "▤" },
  { label: "Mints", href: `/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB`, icon: "◎" },
  { label: "Evidence", href: "/evidence", icon: "⚙" },
];

export default function DashboardLayout({ children, active }: { children: ReactNode; active: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "calc(100vh - 54px)" }}>
      <aside style={{ borderRight: "1px solid var(--color-ash)", background: "#F8F8FA", padding: "24px 0" }}>
        <div style={{ padding: "0 20px", marginBottom: 24 }}>
          <div className="label-mono" style={{ fontSize: 10 }}>Navigation</div>
        </div>
        <nav style={{ display: "grid", gap: 2 }}>
          {nav.map((n) => {
            const isActive = active === n.label.toLowerCase();
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 20px", fontSize: 13, fontWeight: 500,
                  color: isActive ? "var(--color-brand-blue)" : "var(--color-graphite)",
                  background: isActive ? "rgba(20, 95, 228, 0.06)" : "transparent",
                  borderRight: isActive ? "2px solid var(--color-brand-blue)" : "2px solid transparent",
                  textDecoration: "none", transition: "all 100ms",
                }}
              >
                <span style={{ fontSize: 14, opacity: 0.6 }}>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div style={{ padding: "32px 32px" }}>
        {children}
      </div>
    </div>
  );
}