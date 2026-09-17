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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
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

function BrandMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden style={{ display: "block" }}>
      <rect x="1" y="1" width="18" height="18" rx="4" fill="var(--color-ink)" />
      <path d="M5 14 L5 6 L10 11 L15 6 L15 14" stroke="var(--color-paper)" strokeWidth="1.6" fill="none" strokeLinejoin="miter" strokeLinecap="square" />
    </svg>
  );
}

function SiteHeader() {
  return (
    <header className="site-header">
      <div className="hi">
        <Link href="/" className="hl">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden style={{ display: "block" }}>
            <rect x="1" y="1" width="18" height="18" rx="4" fill="var(--color-ink)" />
            <path d="M5 14 L5 6 L10 11 L15 6 L15 14" stroke="var(--color-paper)" strokeWidth="1.6" fill="none" strokeLinejoin="miter" strokeLinecap="square" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em" }}>Manifest</span>
        </Link>
        <nav className="hn">
          <Link href="/plan">Plan</Link>
          <Link href="/tape">Tape</Link>
          <a href="https://github.com/subheeksh5599/manifest">Source</a>
        </nav>
        <Link href="/plan" className="btn-primary" style={{ padding: "7px 16px", fontSize: 13 }}>Try a plan</Link>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer style={{ borderTop: "var(--edge)" }}>
      <div className="mx-auto max-w-[1200px] px-6 py-16 grid gap-10 md:grid-cols-4">
        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="text-[15px] font-medium tracking-[-0.01em]">Manifest</span>
          </div>
          <p className="text-[13px] text-[color:var(--color-text-3)] max-w-[24ch] leading-relaxed">
            Reads mainnet at request time. Never broadcasts. Refusals are the product.
          </p>
        </div>
        <div className="grid gap-3 text-[13px]">
          <div className="kicker">Product</div>
          <Link href="/plan" className="text-[color:var(--color-text-2)] hover:text-[color:var(--color-ink)]">Plan builder</Link>
          <Link href="/tape" className="text-[color:var(--color-text-2)] hover:text-[color:var(--color-ink)]">Refusal tape</Link>
          <Link href="/evidence" className="text-[color:var(--color-text-2)] hover:text-[color:var(--color-ink)]">Evidence pack</Link>
        </div>
        <div className="grid gap-3 text-[13px]">
          <div className="kicker">Reference</div>
          <a href="https://github.com/subheeksh5599/manifest" className="text-[color:var(--color-text-2)] hover:text-[color:var(--color-accent)]">Source</a>
          <a href="https://github.com/subheeksh5599/manifest/blob/main/README.md" className="text-[color:var(--color-text-2)] hover:text-[color:var(--color-accent)]">Live status</a>
          <a href="https://github.com/subheeksh5599/manifest/blob/main/docs" className="text-[color:var(--color-text-2)] hover:text-[color:var(--color-accent)]">Docs</a>
        </div>
        <div className="grid gap-3 text-[13px]">
          <div className="kicker">License</div>
          <span className="text-[color:var(--color-text-2)]">MIT · 2026</span>
          <span className="text-[color:var(--color-text-3)] mono text-[11px]">v0 · sep 2026</span>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-6 py-6 flex items-baseline justify-between text-[11px] text-[color:var(--color-text-3)] mono" style={{ borderTop: "var(--edge)" }}>
        <span>No wallet. No funds. No mocks.</span>
        <span>Solana mainnet · read-only</span>
      </div>
    </footer>
  );
}
