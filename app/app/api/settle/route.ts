import { NextResponse } from "next/server";
import { readExitTermsCached } from "@/lib/exit-terms.mjs";
import { landingAmount } from "@/lib/exit-engine.mjs";
import { jupiterQuote } from "@/lib/sources.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const RPC_USER_AGENT =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const j = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));

/**
 * One settlement, priced from live sources.
 *
 * The venue is asked what it would send. The mint is asked what it will withhold
 * from that transfer. The difference is what lands. Every one of those three
 * numbers carries the URL it came from so the page can show its work.
 *
 * `direction=buy` takes USDC in and the holding out; `direction=sell` reverses it.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mint = url.searchParams.get("mint") ?? "";
  const amount = url.searchParams.get("amount") ?? "";
  const direction = url.searchParams.get("direction") === "sell" ? "sell" : "buy";
  const inputParam = url.searchParams.get("input") ?? USDC;
  const slippageBps = url.searchParams.get("slippageBps") ?? "50";

  if (!BASE58.test(mint)) {
    return NextResponse.json({ error: "mint must be a base58 address" }, { status: 400 });
  }
  if (!BASE58.test(inputParam)) {
    return NextResponse.json({ error: "input must be a base58 address" }, { status: 400 });
  }
  if (!/^[1-9][0-9]*$/.test(amount)) {
    return NextResponse.json({ error: "amount must be a positive integer in base units" }, { status: 400 });
  }
  if (!/^[0-9]+$/.test(slippageBps)) {
    return NextResponse.json({ error: "slippageBps must be an integer" }, { status: 400 });
  }

  const input_mint = direction === "buy" ? inputParam : mint;
  const output_mint = direction === "buy" ? mint : inputParam;

  // The mint's own state. A failure here is reported, never guessed at.
  let terms: any;
  try {
    terms = await readExitTermsCached(mint, { rpcUrl: RPC_URL, ua: RPC_USER_AGENT });
  } catch (e) {
    return NextResponse.json(
      { error: `mint state unreadable: ${(e as Error).message}`, stage: "mint_read" },
      { status: 502 }
    );
  }

  if (!terms?.is_token_2022) {
    return NextResponse.json(
      {
        error: "unsupported: this mint is not a Token-2022 mint, so it cannot carry a transfer-fee configuration",
        stage: "mint_read",
        terms,
      },
      { status: 422 }
    );
  }

  // The venue's answer. A failure here is also reported, never substituted.
  let quote: any;
  try {
    quote = await jupiterQuote({
      inputMint: input_mint,
      outputMint: output_mint,
      amount,
      slippageBps: Number(slippageBps),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: (e as Error).message,
        stage: "quote",
        terms,
        mint,
        direction,
        input_mint,
        output_mint,
        amount,
      },
      { status: 502 }
    );
  }

  // The arithmetic, from the engine that already prices every exit this system
  // reports. The venue's output in, the mint's schedule applied, the remainder out.
  const settlement = landingAmount(quote.out_amount, terms, terms.epoch ?? null);

  return new NextResponse(
    j({
      ok: true,
      mint,
      direction,
      input_mint,
      output_mint,
      amount,
      slot: terms.slot,
      epoch: terms.epoch,
      quote,
      terms,
      settlement,
      units: {
        input_decimals: direction === "buy" ? 6 : terms.decimals,
        output_decimals: direction === "buy" ? terms.decimals : 6,
      },
      sources: {
        quote: quote.source,
        mint: {
          url: RPC_URL,
          host: new URL(RPC_URL).host,
          at: new Date().toISOString(),
          method: "getAccountInfo + getEpochInfo",
          slot: terms.slot ?? null,
        },
      },
    }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
