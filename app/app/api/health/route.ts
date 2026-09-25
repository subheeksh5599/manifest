import { NextResponse } from "next/server";
import registry from "@/data/registry.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAINNET = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
const DEVNET = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM = process.env.EXIT_TERMS_PROGRAM || "pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA";
const RPC_UA =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Report what is reachable, one dependency at a time.
 *
 * A health route that returns ok while a dependency is down is worse than no
 * health route: it turns a diagnosable failure into a blank page. Each check
 * reports its own verdict, and the whole thing fails loudly when one is down.
 */
async function reach(rpcUrl: string, method: string, params: unknown[]) {
  const started = Date.now();
  try {
    const r = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": RPC_UA },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
    });
    const body = await r.json();
    return {
      ok: Boolean(body?.result) && !body?.error,
      ms: Date.now() - started,
      error: body?.error?.message ?? (r.ok ? null : `HTTP ${r.status}`),
      result: body?.result,
    };
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: (e as Error).message, result: null };
  }
}

export async function GET() {
  const entries: any[] = (registry as any).entries ?? [];

  const [epoch, program, firstMint] = await Promise.all([
    reach(MAINNET, "getEpochInfo", []),
    reach(DEVNET, "getAccountInfo", [PROGRAM, { encoding: "base64" }]),
    entries.length ? reach(MAINNET, "getAccountInfo", [entries[0].mint, { encoding: "base64" }]) : Promise.resolve(null),
  ]);

  const programInfo: any = (program as any).result?.value;
  const mintInfo: any = (firstMint as any)?.result?.value;

  const checks = {
    mainnet_rpc: { ...epoch, slot: (epoch as any).result?.slot ?? null, epoch: (epoch as any).result?.epoch ?? null },
    devnet_program: {
      program: PROGRAM,
      ok: Boolean(programInfo?.executable),
      error: (program as any).error,
      ms: (program as any).ms,
      owner: programInfo?.owner ?? null,
    },
    registry: {
      ok: entries.length > 0,
      mints: entries.length,
      issuers: [...new Set(entries.map((e) => e.issuer))].length,
      first_mint_readable: Boolean(mintInfo),
    },
    config: {
      rpc_url_set: Boolean(process.env.RPC_URL),
      devnet_rpc_url_set: Boolean(process.env.DEVNET_RPC_URL),
      jupiter_quote_url: process.env.JUPITER_QUOTE_URL || "https://lite-api.jup.ag/swap/v1/quote",
      user_agent_set: Boolean(process.env.RPC_USER_AGENT),
    },
  };

  const ok = checks.mainnet_rpc.ok && checks.devnet_program.ok && checks.registry.ok;
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
