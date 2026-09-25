import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

const MINT_TO_SYMBOL: Record<string, string> = {
  "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB": "TSLAx",
  "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN": "GOOGLx",
  "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg": "HOODx",
  "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh": "NVDAx",
  "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1": "CRCLx",
};

const ALL_MINTS = Object.keys(MINT_TO_SYMBOL);

export async function GET() {
  try {
    const url = `https://api.jup.ag/price/v3?ids=${ALL_MINTS.join(",")}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `the quote source returned ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    const prices: Record<string, {
      symbol: string;
      usdPrice: number;
      blockId: number;
      liquidity: number;
      change24h: number;
      multiplier: number;
      underlyingPrice: number | null;
    }> = {};

    for (const [mint, info] of Object.entries(data)) {
      const d = info as Record<string, unknown>;
      if (MINT_TO_SYMBOL[mint]) {
        prices[mint] = {
          symbol: MINT_TO_SYMBOL[mint],
          usdPrice: (d.usdPrice as number) || 0,
          blockId: (d.blockId as number) || 0,
          liquidity: (d.liquidity as number) || 0,
          change24h: (d.priceChange24h as number) || 0,
          multiplier: (d.scaledUiConfig as Record<string, unknown>)?.multiplier as number || 1,
          underlyingPrice: (d.stockData as Record<string, unknown>)?.price as number || null,
        };
      }
    }

    return NextResponse.json({ prices, mints: ALL_MINTS });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}