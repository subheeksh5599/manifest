import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MANIFEST",
  description:
    "Scheduled tokenized-stock buys on Solana that either fill at a verified price or publicly refuse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="border-b hair">
      <div className="mx-auto max-w-6xl px-6 py-5 flex items-baseline justify-between">
        <a href="/" className="serif text-xl tracking-tight">manifest</a>
        <nav className="text-sm text-[color:var(--color-ink-700)] flex gap-6">
          <a href="/plan">plan</a>
          <a href="/tape">tape</a>
          <a href="/evidence">evidence</a>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t hair mt-16">
      <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-[color:var(--color-ink-500)] flex justify-between">
        <span>reads mainnet at request time. no wallet. no funds.</span>
        <span className="mono">MIT</span>
      </div>
    </footer>
  );
}
