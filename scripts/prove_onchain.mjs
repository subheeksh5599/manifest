#!/usr/bin/env node
/**
 * Reproduce the on-chain record from nothing.
 *
 * Creates a Token-2022 mint on devnet carrying a fee schedule, gives it a fee
 * that is announced for a future epoch, records a reading with the program,
 * verifies it, then changes the fee and shows verification refuse.
 *
 * The last step is the point: a published number that stops being true is
 * refused by the chain, not by a database.
 *
 * Needs two client libraries, which the app itself does not use:
 *
 *   cd scripts && npm install @solana/web3.js @solana/spl-token
 *
 * Signs with the wallet in Anchor.toml. Devnet only. Costs devnet SOL, which is
 * free. Nothing here touches mainnet.
 *
 *   node scripts/prove_onchain.mjs
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as spl from "@solana/spl-token";

const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";
const PROGRAM = new PublicKey("pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA");
const U64_MAX = 18446744073709551615n;
const WALLET = process.env.ANCHOR_WALLET || path.join(os.homedir(), ".config/solana/id.json");

const conn = new Connection(RPC, "confirmed");
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(WALLET, "utf8"))));

/** Anchor discriminators: the first eight bytes of sha256("global:<name>"). */
const disc = (name) => crypto.createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
const u64 = (v) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(v));
  return b;
};
const readingPda = (mint, nonce) =>
  PublicKey.findProgramAddressSync([Buffer.from("reading"), mint.toBuffer(), u64(nonce)], PROGRAM)[0];

/** What the mint itself says, walked from the account bytes. */
async function termsOnChain(mint) {
  const info = await conn.getAccountInfo(mint);
  const dv = new DataView(info.data.buffer, info.data.byteOffset, info.data.byteLength);
  const epoch = (await conn.getEpochInfo()).epoch;
  let p = 166;
  while (p + 4 <= info.data.length) {
    const type = dv.getUint16(p, true);
    const len = dv.getUint16(p + 2, true);
    if (type === 0 && len === 0) break;
    if (type === 1 && len >= 108) {
      const v = new DataView(info.data.buffer, info.data.byteOffset + p + 4, 108);
      const older = { epoch: Number(v.getBigUint64(72, true)), bps: v.getUint16(88, true) };
      const newer = { epoch: Number(v.getBigUint64(90, true)), bps: v.getUint16(106, true) };
      return {
        epoch,
        older,
        newer,
        inForce: epoch >= newer.epoch ? newer : older,
        pending: epoch < newer.epoch ? newer : null,
      };
    }
    p += 4 + len;
  }
  throw new Error("the mint carries no transfer-fee extension");
}

function decodeReading(data) {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const at = (o) => dv.getBigUint64(8 + o, true);
  return {
    mint: new PublicKey(data.subarray(40, 72)).toBase58(),
    slot: at(72),
    epoch: at(80),
    size: at(88),
    bps_in_force: dv.getUint16(8 + 97, true),
    epoch_in_force: at(99),
    maximum_fee: at(107),
    bps_pending: dv.getUint16(8 + 115, true),
    epoch_pending: at(117),
    withheld: at(125),
    lands: at(133),
  };
}

async function main() {
  const startEpoch = (await conn.getEpochInfo()).epoch;
  console.log(`${RPC}  epoch ${startEpoch}`);
  console.log(`wallet ${payer.publicKey.toBase58()}  ${(await conn.getBalance(payer.publicKey)) / 1e9} SOL\n`);

  // 1. a mint that carries a fee config.
  const mint = Keypair.generate();
  const space = spl.getMintLen([spl.ExtensionType.TransferFeeConfig]);
  const lamports = await conn.getMinimumBalanceForRentExemption(space);
  const createSig = await sendAndConfirmTransaction(
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
        mint.publicKey,
        payer.publicKey,
        payer.publicKey,
        100,
        U64_MAX,
        spl.TOKEN_2022_PROGRAM_ID
      ),
      spl.createInitializeMintInstruction(mint.publicKey, 9, payer.publicKey, null, spl.TOKEN_2022_PROGRAM_ID)
    ),
    [payer, mint]
  );
  console.log(`mint created      ${mint.publicKey.toBase58()}`);
  console.log(`  tx              ${createSig}`);

  // 2. announce a higher fee. This is written ahead of the epoch it applies in,
  //    which is the whole reason the product exists.
  const setSig = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(
      spl.createSetTransferFeeInstruction(mint.publicKey, payer.publicKey, [], 300, U64_MAX)
    ),
    [payer]
  );
  const before = await termsOnChain(mint.publicKey);
  console.log(`fee announced     ${setSig}`);
  console.log(`  older           ${before.older.bps} bps @ epoch ${before.older.epoch}`);
  console.log(`  newer           ${before.newer.bps} bps @ epoch ${before.newer.epoch}`);
  console.log(`  => in force     ${before.inForce.bps} bps`);
  console.log(`  => pending      ${before.pending ? `${before.pending.bps} bps @ epoch ${before.pending.epoch}` : "none"}\n`);

  // 3. the program reads the mint and writes the reading down.
  const SIZE = 1_000_000_000n;
  const nonce = BigInt(Date.now());
  const pda = readingPda(mint.publicKey, nonce);
  const recordSig = await sendAndConfirmTransaction(
    conn,
    new Transaction().add(
      new TransactionInstruction({
        programId: PROGRAM,
        keys: [
          { pubkey: pda, isSigner: false, isWritable: true },
          { pubkey: mint.publicKey, isSigner: false, isWritable: false },
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([disc("record_reading"), u64(SIZE), u64(nonce)]),
      })
    ),
    [payer]
  );
  const stored = decodeReading((await conn.getAccountInfo(pda)).data);
  const expected = (SIZE * BigInt(before.inForce.bps)) / 10000n;
  console.log(`record_reading    ok   ${recordSig}`);
  console.log(`  reading pda     ${pda.toBase58()}`);
  console.log(`  bps in force    ${stored.bps_in_force}  (chain says ${before.inForce.bps})`);
  console.log(`  bps pending     ${stored.bps_pending}  (chain says ${before.pending ? before.pending.bps : 0})`);
  console.log(`  maximum fee     ${stored.maximum_fee}  exact 2^64-1: ${stored.maximum_fee === U64_MAX}`);
  console.log(`  withheld        ${stored.withheld}  computed: ${expected}`);
  console.log(`  lands           ${stored.lands}  = size - withheld: ${stored.size - stored.withheld}`);
  console.log(
    `  matches the mint: ${
      stored.bps_in_force === before.inForce.bps &&
      stored.withheld === expected &&
      stored.lands === stored.size - stored.withheld
    }\n`
  );

  // 4. verification reproduces it.
  const verifyIx = new TransactionInstruction({
    programId: PROGRAM,
    keys: [
      { pubkey: pda, isSigner: false, isWritable: false },
      { pubkey: mint.publicKey, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([disc("verify_reading"), u64(nonce)]),
  });
  const verifySig = await sendAndConfirmTransaction(conn, new Transaction().add(verifyIx), [payer]);
  console.log(`verify_reading    PASS ${verifySig}`);

  // 5. move the fee, and the reading stops reproducing.
  await sendAndConfirmTransaction(
    conn,
    new Transaction().add(
      spl.createSetTransferFeeInstruction(mint.publicKey, payer.publicKey, [], 500, U64_MAX)
    ),
    [payer]
  );
  const after = await termsOnChain(mint.publicKey);
  console.log(`\nfee moved to      ${after.newer.bps} bps @ epoch ${after.newer.epoch}`);

  let refused = null;
  try {
    await sendAndConfirmTransaction(conn, new Transaction().add(verifyIx), [payer]);
  } catch (e) {
    const logs = e.transactionLogs || [];
    refused = logs.find((l) => l.includes("Error Code") || l.includes("failed")) || String(e.message).slice(0, 160);
  }
  console.log(`verify_reading    ${refused ? "REFUSED" : "!! UNEXPECTEDLY PASSED"}`);
  if (refused) console.log(`  ${refused.trim()}`);

  console.log(`\nmint     ${mint.publicKey.toBase58()}`);
  console.log(`program  ${PROGRAM.toBase58()}`);
  if (!refused) process.exit(1);
}

main().catch((e) => {
  console.error("FAILED:", e.message || e);
  process.exit(1);
});
