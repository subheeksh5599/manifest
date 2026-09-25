import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manifest — what a tokenized equity actually pays out",
  description:
    "Reads the exit terms out of the mint itself, then reports what lands rather than what was quoted. Token-2022 on Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
