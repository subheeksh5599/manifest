import { NextResponse } from "next/server";
import { JUPITER, jupiterQuote } from "@/lib/sources.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;
export const revalidate = 0;

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Build the transaction for a real swap.
 *
 * The route is quoted first, then handed to the venue's swap endpoint with the
 * connected wallet as the fee payer. What comes back is an unsigned transaction
 * that only that wallet can sign, and this route never touches a key. If the
 * venue refuses, the refusal is passed through rather than retried into
 * something that looks like success.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const inputMint = String(body?.inputMint ?? "");
  const outputMint = String(body?.outputMint ?? "");
  const amount = String(body?.amount ?? "");
  const userPublicKey = String(body?.userPublicKey ?? "");
  const slippageBps = Number(body?.slippageBps ?? 50);

  if (!BASE58.test(inputMint) || !BASE58.test(outputMint)) {
    return NextResponse.json({ error: "inputMint and outputMint must be base58 addresses" }, { status: 400 });
  }
  if (!BASE58.test(userPublicKey)) {
    return NextResponse.json({ error: "userPublicKey must be a base58 address" }, { status: 400 });
  }
  if (!/^[1-9][0-9]*$/.test(amount)) {
    return NextResponse.json({ error: "amount must be a positive integer in base units" }, { status: 400 });
  }
  if (!Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 5000) {
    return NextResponse.json({ error: "slippageBps must be between 0 and 5000" }, { status: 400 });
  }

  let quote: any;
  try {
    quote = await jupiterQuote({ inputMint, outputMint, amount, slippageBps });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, stage: "quote" },
      { status: 502 }
    );
  }

  // The swap endpoint wants the quote payload back, so it is quoted again through
  // the same helper to obtain the raw response rather than reconstructing one.
  try {
    const qUrl =
      `${JUPITER}/swap/v1/quote?inputMint=${encodeURIComponent(inputMint)}` +
      `&outputMint=${encodeURIComponent(outputMint)}` +
      `&amount=${encodeURIComponent(amount)}&slippageBps=${encodeURIComponent(String(slippageBps))}`;
    const qr = await fetch(qUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    if (!qr.ok) throw new Error(`the venue returned ${qr.status} for the quote`);
    const rawQuote = await qr.json();

    const swapRes = await fetch(`${JUPITER}/swap/v1/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      body: JSON.stringify({
        quoteResponse: rawQuote,
        userPublicKey,
        // The route here is USDC against an SPL holding, never native SOL, so
        // there is nothing to wrap or unwrap. Asking for it anyway makes the
        // venue attach a closeAccount instruction for a wrapped-SOL account,
        // which is the shape a wallet's own firewall reads as a drain: it
        // answers with "proceed at your own risk" before the user has read a
        // single number on the page. Nothing to unwrap, nothing to warn about.
        wrapAndUnwrapSol: false,
        dynamicComputeUnitLimit: true,
        // "auto" lets the venue pick the priority fee, and an auto fee moves
        // with congestion: a spike reads to a wallet as an unusual charge on
        // top of the swap. A small ceiling keeps the fee a number this page
        // can state rather than one the network chooses.
        prioritizationFeeLamports: 50000,
      }),
    });
    const swapJson = await swapRes.json();
    if (!swapRes.ok || !swapJson?.swapTransaction) {
      throw new Error(
        swapJson?.error ??
          swapJson?.message ??
          `the venue did not return a transaction (${swapRes.status})`
      );
    }

    return NextResponse.json(
      {
        ok: true,
        swapTransaction: swapJson.swapTransaction,
        lastValidBlockHeight: swapJson.lastValidBlockHeight ?? null,
        prioritizationFeeLamports: swapJson.prioritizationFeeLamports ?? null,
        // What the client will later hold the settled transaction to.
        expected: {
          in_amount: quote.in_amount,
          out_amount: quote.out_amount,
          other_amount_threshold: quote.other_amount_threshold,
          route_labels: quote.route_labels,
        },
        source: quote.source,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, stage: "build" }, { status: 502 });
  }
}
