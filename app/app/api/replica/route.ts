import { NextResponse } from "next/server";
import replica from "@/data/replica-devnet.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEVNET_RPC = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
const WHIRLPOOL_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
const USER_AGENT =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let id = 0;

/**
 * One call to the devnet RPC.
 *
 * The route holds no state and no cache: every number below is read from the
 * chain on the request, so the page cannot keep showing something that stopped
 * being true.
 */
async function rpc(method: string, params: unknown[]): Promise<any> {
  const r = await fetch(DEVNET_RPC, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": USER_AGENT },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${method} returned ${r.status}`);
  const body = await r.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

async function vaultBalance(address: string): Promise<{ lamports_or_units: string; exists: boolean }> {
  try {
    const v = await rpc("getTokenAccountBalance", [address, { commitment: "confirmed" }]);
    return { lamports_or_units: String(v?.value?.amount ?? "0"), exists: true };
  } catch {
    return { lamports_or_units: "0", exists: false };
  }
}

async function poolState(issuer: any) {
  const info = await rpc("getAccountInfo", [issuer.pool.address, { encoding: "base64", commitment: "confirmed" }]);
  const owner = info?.value?.owner ?? null;
  const [quoteVault, issuerVault] = await Promise.all([
    vaultBalance(issuer.pool.vault_quote),
    vaultBalance(issuer.pool.vault_issuer),
  ]);
  const deposit = await rpc("getSignatureStatuses", [[issuer.pool.deposit_sig], { searchTransactionHistory: true }]);
  const depositStatus = deposit?.value?.[0] ?? null;
  return {
    mint: issuer.mint,
    fee_bps: issuer.fee_bps ?? null,
    announced_fee_bps: issuer.announced_fee_bps ?? null,
    pool: issuer.pool.address,
    pool_exists: Boolean(info?.value),
    pool_owner: owner,
    pool_owner_is_whirlpool: owner === WHIRLPOOL_PROGRAM,
    tick_spacing: issuer.pool.tick_spacing,
    vault_quote: { address: issuer.pool.vault_quote, ...quoteVault },
    vault_issuer: { address: issuer.pool.vault_issuer, ...issuerVault },
    deposit_sig: issuer.pool.deposit_sig,
    deposit_confirmed: depositStatus?.confirmationStatus === "confirmed" ||
      depositStatus?.confirmationStatus === "finalized",
  };
}

export async function GET() {
  const slot = await rpc("getSlot", [{ commitment: "confirmed" }]);

  const issuer_a = await poolState(replica.issuer_a);
  const issuer_b = await poolState(replica.issuer_b);

  const bothPoolsReal =
    issuer_a.pool_owner_is_whirlpool && issuer_b.pool_owner_is_whirlpool &&
    issuer_a.vault_issuer.exists && issuer_b.vault_issuer.exists;

  return NextResponse.json(
    {
      network: "devnet",
      slot,
      issuer_a,
      issuer_b,
      both_pools_live: bothPoolsReal,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
