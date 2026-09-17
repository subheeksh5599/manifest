import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manifest — recurring buys that refuse in public when they must",
  description:
    "Recurring buys for tokenized equities on Solana. Fill at a verified price or refuse on-chain. Every refusal is a receipt anyone can re-read from mainnet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="site-header" id="header">
      <div className="hi">
        <Link href="/" className="hl">
          <span style={{ fontWeight: 500 }}>Manifest</span>
        </Link>
        <nav className="hn">
          <Link href="/plan">Plan</Link>
          <Link href="/tape">Tape</Link>
          <a href="https://github.com/subheeksh5599/manifest">Source</a>
          <Link href="/plan" className="btn btn-primary">Get started</Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--color-ash)" }}>
      <div className="wrap" style={{ padding: "48px 24px" }}>
        <div className="g3" style={{ gap: 40 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 500 }}>Manifest</span>
            </div>
            <p style={{ fontSize: 14, color: "var(--color-graphite)", maxWidth: "24ch", lineHeight: 1.6 }}>
              Reads mainnet at request time. Never broadcasts. Refusals are the product.
            </p>
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <div className="label-mono" style={{ marginBottom: 4 }}>Product</div>
            <Link href="/plan" style={{ color: "var(--color-graphite)", textDecoration: "none" }}>Plan builder</Link>
            <Link href="/tape" style={{ color: "var(--color-graphite)", textDecoration: "none" }}>Refusal tape</Link>
            <Link href="/evidence" style={{ color: "var(--color-graphite)", textDecoration: "none" }}>Evidence pack</Link>
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <div className="label-mono" style={{ marginBottom: 4 }}>Reference</div>
            <a href="https://github.com/subheeksh5599/manifest" style={{ color: "var(--color-graphite)", textDecoration: "none" }}>Source</a>
            <a href="https://github.com/subheeksh5599/manifest/blob/main/README.md" style={{ color: "var(--color-graphite)", textDecoration: "none" }}>Readme</a>
          </div>
        </div>
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--color-ash)", display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--color-graphite)" }}>
          <span>No wallet. No funds. No mocks.</span>
          <span>MIT — 2026</span>
        </div>
      </div>
    </footer>
  );
}