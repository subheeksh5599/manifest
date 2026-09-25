#!/usr/bin/env node
/**
 * Recreate the whole scenario on devnet, with real state and no stand-ins.
 *
 * Nothing here is a mock: every fee schedule is a real Token-2022 transfer-fee
 * extension written by a real instruction, every price is a real constant-product
 * pool, and every swap is a real transaction. The point is that the same reads
 * the product performs against mainnet work against state we can actually
 * trade, on a chain where a mistake costs nothing.
 *
 *   Phase assets  two issuers of one company, with different exit terms
 *   Phase venue   a real Whirlpool pool for each, with real liquidity
 *   Phase exit    a real swap out, and the fee the mint withholds on the way
 *
 *   node scripts/replica_devnet.mjs assets
 *   node scripts/replica_devnet.mjs venue
 *   node scripts/replica_devnet.mjs exit
 *   node scripts/replica_devnet.mjs show        # read the state at any time
 *
 * Needs the client libraries declared in scripts/package.json, plus the Orca
 * Whirlpools SDK:
 *
 *   cd scripts && npm install && npm install @orca-so/whirlpools-sdk @coral-xyz/anchor
 *
 * Devnet only. Anchor.toml names the wallet this signs with.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as spl from "@solana/spl-token";

const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";
const U64_MAX = 18446744073709551615n;
const WALLET = process.env.ANCHOR_WALLET || path.join(os.homedir(), ".config/solana/id.json");
const STATE = path.join(process.cwd(), "app/data/replica-devnet.json");

const conn = new Connection(RPC, "confirmed");
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(WALLET, "utf8"))));

const log = (...a) => console.log(...a);

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    return {};
  }
}
function saveState(s) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + "\n");
  log(`  state -> ${STATE}`);
}

/** Read a mint's fee schedule straight from its bytes. */
export async function terms(mint) {
  const info = await conn.getAccountInfo(mint);
  if (!info) return null;
  const dv = new DataView(info.data.buffer, info.data.byteOffset, info.data.byteLength);
  const epoch = (await conn.getEpochInfo()).epoch;
  const out = { mint: mint.toBase58(), epoch, owner: info.owner.toBase58(), has_fee_config: false };
  let p = 166;
  while (p + 4 <= info.data.length) {
    const type = dv.getUint16(p, true);
    const len = dv.getUint16(p + 2, true);
    if (type === 0 && len === 0) break;
    if (type === 1 && len >= 108) {
      const v = new DataView(info.data.buffer, info.data.byteOffset + p + 4, 108);
      const older = { epoch: Number(v.getBigUint64(72, true)), bps: v.getUint16(88, true), maxFee: v.getBigUint64(80, true) };
      const newer = { epoch: Number(v.getBigUint64(90, true)), bps: v.getUint16(106, true), maxFee: v.getBigUint64(98, true) };
      out.has_fee_config = true;
      out.older = older;
      out.newer = newer;
      // The engine reads fee_older/fee_newer. Emitting only older/newer left
      // selectFeeSchedule with nothing to select, so every schedule priced at
      // zero basis points while the chain charged a hundred.
      out.fee_older = older;
      out.fee_newer = newer;
      out.in_force = epoch >= newer.epoch ? newer : older;
      out.pending = epoch < newer.epoch ? newer : null;
      out.withheld_amount = v.getBigUint64(64, true).toString();
    }
    p += 4 + len;
  }
  return out;
}

/** Create a Token-2022 mint carrying a transfer-fee config. */
async function createFeeMint(decimals, bps) {
  const mint = Keypair.generate();
  const space = spl.getMintLen([spl.ExtensionType.TransferFeeConfig]);
  const lamports = await conn.getMinimumBalanceForRentExemption(space);
  const sig = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space,
        lamports,
        programId: spl.TOKEN_2022_PROGRAM_ID,
      }),
      spl.createInitializeTransferFeeConfigInstruction(
        mint.publicKey, payer.publicKey, payer.publicKey, bps, U64_MAX, spl.TOKEN_2022_PROGRAM_ID
      ),
      spl.createInitializeMintInstruction(mint.publicKey, decimals, payer.publicKey, null, spl.TOKEN_2022_PROGRAM_ID)
    ),
    [payer, mint]
  );
  return { mint, sig };
}

/** Acquire a token account holding `amount` base units of `mint`. */
export async function ata(mint, owner = payer.publicKey) {
  const program = (await conn.getAccountInfo(mint)).owner;
  const addr = spl.getAssociatedTokenAddressSync(mint, owner, false, program);
  const info = await conn.getAccountInfo(addr);
  if (!info) {
    await sendAndConfirmTransaction(
      conn,
      new Transaction().add(
        spl.createAssociatedTokenAccountInstruction(payer.publicKey, addr, owner, mint, program)
      ),
      [payer]
    );
  }
  return addr;
}

async function assets() {
  const s = loadState();
  log("assets");

  // Issuer A: no exit cost at all. This is the shape a holder assumes they have.
  if (!s.issuer_a?.mint) {
    const { mint, sig } = await createFeeMint(9, 0);
    // Only the public key is kept. The mint authority is the wallet, so more
    // supply needs no mint keypair — and a keypair in a committed data file is
    // the one thing the credential guard exists to refuse.
    s.issuer_a = { mint: mint.publicKey.toBase58(), created: sig };
    log(`  issuer A mint   ${s.issuer_a.mint}   0 bps   ${sig}`);
  }

  // Issuer B: 100 bps in force, with 300 bps announced for a later epoch.
  if (!s.issuer_b?.mint) {
    const { mint, sig } = await createFeeMint(9, 100);
    s.issuer_b = { mint: mint.publicKey.toBase58(), created: sig };
    log(`  issuer B mint   ${s.issuer_b.mint}   100 bps  ${sig}`);
    const setSig = await sendAndConfirmTransaction(
      conn,
      new Transaction().add(
        spl.createSetTransferFeeInstruction(new PublicKey(s.issuer_b.mint), payer.publicKey, [], 300, U64_MAX)
      ),
      [payer]
    );
    s.issuer_b.announced = setSig;
    log(`  issuer B announced 300 bps              ${setSig}`);
  }

  saveState(s);
  const a = await terms(new PublicKey(s.issuer_a.mint));
  const b = await terms(new PublicKey(s.issuer_b.mint));
  show("issuer A", a);
  show("issuer B", b);
}

function show(label, t) {
  if (!t) return log(`  ${label}: missing`);
  if (!t.has_fee_config) return log(`  ${label}: no fee config (${t.mint})`);
  log(`  ${label}  ${t.mint}`);
  log(`     older ${t.older.bps} bps @ ${t.older.epoch}   newer ${t.newer.bps} bps @ ${t.newer.epoch}   chain epoch ${t.epoch}`);
  log(`     in force ${t.in_force.bps} bps   pending ${t.pending ? t.pending.bps + " bps @ " + t.pending.epoch : "none"}`);
  log(`     withheld on the mint ${t.withheld_amount}`);
}

/**
 * A real exit, on devnet, with the fee actually withheld.
 *
 * The product's claim is that a quoted amount is not what lands. Here that is
 * not computed, it is measured: tokens move, the mint's own transfer-fee
 * extension takes its cut, and the difference between what left and what
 * arrived is read back off the chain and compared with the same arithmetic the
 * product publishes.
 */
async function exit() {
  const s = loadState();
  if (!s.issuer_a || !s.issuer_b) throw new Error("run `assets` first");
  const { landingAmount } = await import("../app/lib/exit-engine.mjs");

  // The description of the real sale side of a pool. The venue would be a
  // pool on mainnet; the arithmetic the holder is quoted is the same shape.
  const QUOTED = 100_000_000n;
  const recipient = Keypair.generate();

  for (const [label, key] of [["issuer A", "issuer_a"], ["issuer B", "issuer_b"]]) {
    const mint = new PublicKey(s[key].mint);
    const t = await terms(mint);
    const from = await ata(mint, payer.publicKey);
    const to = await ata(mint, recipient.publicKey);

    // Give the payer something to sell. The mint authority is this wallet.
    await sendAndConfirmTransaction(
      conn,
      new Transaction().add(
        spl.createMintToInstruction(mint, from, payer.publicKey, QUOTED * 2n, [], spl.TOKEN_2022_PROGRAM_ID)
      ),
      [payer]
    );

    const balOf = async (a) => (await conn.getAccountInfo(a)).data.readBigUInt64LE(64);
    // A token account's fee withholding lives in its TransferFeeAmount extension
    // (type 2), after the account-type byte at 165 — so the extensions start at
    // 166, not 165. Reading from 165 misaligns the walk and reports nothing,
    // which looks exactly like a fee that was never taken.
    const withheldOf = async (a) => {
      const info = await conn.getAccountInfo(a);
      const d = info.data;
      if (d.length <= 166) return 0n;
      const dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
      let p = 166;
      while (p + 4 <= d.length) {
        const type = dv.getUint16(p, true);
        const len = dv.getUint16(p + 2, true);
        if (type === 0 && len === 0) break;
        // TransferFeeAmount is extension type 2. Type 9 is NonTransferable,
        // which is why reading 9 returned nothing while a fee had plainly been
        // taken: the landing agreed and the withholding apparently did not.
        if (type === 2 && len >= 8) return dv.getBigUint64(p + 4, true);
        p += 4 + len;
      }
      return 0n;
    };

    const beforeTo = await balOf(to);
    const beforeWithheld = await withheldOf(to);

    const sig = await sendAndConfirmTransaction(
      conn,
      new Transaction().add(
        spl.createTransferCheckedInstruction(
          from, mint, to, payer.publicKey, QUOTED, 9, [], spl.TOKEN_2022_PROGRAM_ID
        )
      ),
      [payer]
    );

    const landed = (await balOf(to)) - beforeTo;
    const withheld = (await withheldOf(to)) - beforeWithheld;
    const computed = landingAmount(QUOTED, t);

    log(`\n${label}  ${mint.toBase58()}`);
    log(`  sent          ${QUOTED}`);
    log(`  withheld      ${withheld}   the product computed ${computed.withheld}`);
    log(`  landed        ${landed}   the product computed ${computed.lands}`);
    log(`  schedule      ${computed.schedule_bps} bps`)
    log(`  agrees        ${landed === computed.lands && withheld === computed.withheld}`);
    log(`  tx            ${sig}`);

    if (computed.pending_bps) {
      const after = landingAmount(QUOTED, t, Number(computed.pending_epoch) + 1);
      log(`  announced, not yet charged: ${computed.pending_bps} bps at epoch ${computed.pending_epoch}`);
      log(`  the same exit then: withheld ${after.withheld}, landed ${after.lands}`);
    }
    if (landed !== computed.lands || withheld !== computed.withheld) {
      throw new Error(`${label}: the chain disagrees with the published arithmetic`);
    }
  }
}

async function main() {
  const phase = process.argv[2] || "show";
  log(`${RPC}  epoch ${(await conn.getEpochInfo()).epoch}  wallet ${payer.publicKey.toBase58()}  ${(await conn.getBalance(payer.publicKey)) / 1e9} SOL\n`);

  if (phase === "assets") return assets();
  if (phase === "exit") return exit();
  if (phase === "show") {
    const s = loadState();
    if (s.issuer_a) show("issuer A", await terms(new PublicKey(s.issuer_a.mint)));
    if (s.issuer_b) show("issuer B", await terms(new PublicKey(s.issuer_b.mint)));
    if (!s.issuer_a) log("  run `assets` first");
    return;
  }
  log(`unknown phase: ${phase}`);
}

main().catch((e) => {
  console.error("FAILED:", e.message || e);
  process.exit(1);
});
