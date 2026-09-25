import { NextResponse } from "next/server";
import { rpc } from "@/lib/rpc";
import { readExitTermsCached } from "@/lib/exit-terms.mjs";
import { equityShelf, jupiterPrice } from "@/lib/sources.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const RPC_USER_AGENT =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function mapLimit<A, B>(items: A[], limit: number, fn: (a: A) => Promise<B>) {
  const out: B[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

/**
 * The assets this product can actually analyse.
 *
 * The list is discovered, not declared: an issuer's live listing supplies the
 * mints, each mint is then read from the chain, and anything that cannot be read
 * or does not carry a settlement schedule is returned marked as such rather than
 * dropped silently or dressed up as supported.
 */
export async function GET() {
  let shelf: any[] = [];
  let shelfError: string | null = null;
  let shelfSource: any = null;
  try {
    const s = await equityShelf();
    shelf = s.shelf;
    shelfSource = s.source;
  } catch (e) {
    shelfError = (e as Error).message;
  }

  const mints = [...new Set(shelf.map((s) => s.mint).filter(Boolean))] as string[];

  let prices: Record<string, any> = {};
  let priceSource: any = null;
  let priceError: string | null = null;
  try {
    const p = await jupiterPrice(mints);
    prices = p.prices as Record<string, any>;
    priceSource = p.source;
  } catch (e) {
    priceError = (e as Error).message;
  }

  const assets = await mapLimit(mints, 3, async (mint) => {
    const listed = shelf.find((s) => s.mint === mint) ?? {};
    try {
      const t = await readExitTermsCached(mint, { rpcUrl: RPC_URL, ua: RPC_USER_AGENT });
      const eff = t.fee_effective ?? t.fee_older ?? null;
      return {
        mint,
        listed_symbol: listed.symbol ?? null,
        listed_name: listed.name ?? null,
        // What the issuer marks the underlying at, against what its token trades
        // at. Both are published, and they differ.
        mark_price: listed.mark_price ?? null,
        token_price: listed.token_price ?? null,
        external_url: listed.external_url ?? null,
        readable: true,
        symbol: t.symbol ?? listed.symbol ?? null,
        name: t.name ?? listed.name ?? null,
        decimals: t.decimals ?? null,
        supply: t.supply ?? null,
        is_token_2022: t.is_token_2022 === true,
        fee_in_force_bps: eff?.bps ?? null,
        fee_effective_epoch: eff?.epoch ?? null,
        fee_pending_bps: t.fee_pending?.bps ?? null,
        fee_pending_epoch: t.fee_pending?.epoch ?? null,
        maximum_fee: eff?.maximum_fee ?? null,
        withheld_amount: t.withheld_amount ?? null,
        paused: t.paused ?? null,
        permanent_delegate: t.permanent_delegate ?? null,
        transfer_hook_program: t.transfer_hook_program ?? null,
        supported: t.is_token_2022 === true && (t.fee_older != null || t.fee_newer != null),
        slot: t.slot ?? null,
        price: prices[mint] ?? null,
      };
    } catch (e) {
      return {
        mint,
        listed_symbol: listed.symbol ?? null,
        listed_name: listed.name ?? null,
        mark_price: listed.mark_price ?? null,
        token_price: listed.token_price ?? null,
        readable: false,
        error: (e as Error).message,
        supported: false,
        price: prices[mint] ?? null,
      };
    }
  });

  const supported = assets.filter((a) => a.supported);

  // The fee schedules carry u64 values as BigInt, and a bare JSON.stringify throws
  // on one. Serialising through a replacer keeps every amount exact and as text.
  return new NextResponse(
    JSON.stringify(
    {
      ok: true,
      count: assets.length,
      supported_count: supported.length,
      assets,
      discovered_from: shelfSource,
      prices_from: priceSource,
      errors: { shelf: shelfError, prices: priceError },
      read_at: new Date().toISOString(),
    },
      (_k, v) => (typeof v === "bigint" ? v.toString() : v)
    ),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
