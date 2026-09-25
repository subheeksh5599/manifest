import { NextResponse } from "next/server";
import replica from "@/data/replica-devnet.json";
import { devnetRpc as rpc } from "@/lib/devnet-rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const WHIRLPOOL_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

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

  const crossSig = replica.cross_issuer.sig;
  const tx = await rpc("getTransaction", [crossSig, { encoding: "json", commitment: "confirmed", maxSupportedTransactionVersion: 0 }]);
  const programs: string[] = (tx?.transaction?.message?.accountKeys ?? [])
    .map((k: any) => (typeof k === "string" ? k : k?.pubkey))
    .filter(Boolean);
  const cross = {
    sig: crossSig,
    from: replica.cross_issuer.from,
    to: replica.cross_issuer.to,
    legs_in_one_transaction: replica.cross_issuer.legs_in_one_transaction,
    confirmed: Boolean(tx) && !tx?.meta?.err,
    slot: tx?.slot ?? null,
    touches_whirlpool: programs.includes(WHIRLPOOL_PROGRAM),
    measured: replica.cross_issuer.measured,
  };

  const bothPoolsReal =
    issuer_a.pool_owner_is_whirlpool && issuer_b.pool_owner_is_whirlpool &&
    issuer_a.vault_issuer.exists && issuer_b.vault_issuer.exists;

  return NextResponse.json(
    {
      network: "devnet",
      slot,
      issuer_a,
      issuer_b,
      cross_issuer: cross,
      both_pools_live: bothPoolsReal,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
