import { NextResponse } from "next/server";
import { rpc } from "@/lib/rpc";
import { jupiterPrice } from "@/lib/sources.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/**
 * Whether each integration is actually answering, right now.
 *
 * A number on screen is only as good as the source behind it, so the shell shows
 * the same thing this route measures. A source that is down is reported as down
 * rather than being quietly replaced with a stale figure.
 */
export async function GET() {
  const started = Date.now();

  const out: Record<string, any> = {
    at: new Date().toISOString(),
    rpc: { ok: false, ms: null, slot: null, epoch: null, error: null },
    venue: { ok: false, ms: null, price: null, error: null },
  };

  const t0 = Date.now();
  try {
    const ei = await rpc<any>("getEpochInfo", [{ commitment: "confirmed" }]);
    out.rpc.ok = true;
    out.rpc.slot = ei?.result?.absoluteSlot ?? null;
    out.rpc.epoch = ei?.result?.epoch ?? null;
  } catch (e) {
    out.rpc.error = (e as Error).message;
  }
  out.rpc.ms = Date.now() - t0;

  const t1 = Date.now();
  try {
    const { prices } = await jupiterPrice([USDC]);
    out.venue.ok = true;
    out.venue.price = (prices as Record<string, any>)?.[USDC]?.usd_price ?? null;
  } catch (e) {
    out.venue.error = (e as Error).message;
  }
  out.venue.ms = Date.now() - t1;

  out.ok = out.rpc.ok && out.venue.ok;
  out.ms = Date.now() - started;

  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
