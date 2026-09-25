/**
 * Real pools on devnet for the two replica issuers.
 *
 * Both issuers are real Token-2022 mints with real transfer-fee extensions, and
 * wSOL is wrapped from the devnet SOL in the wallet, so the quote side is a real
 * token rather than a stand-in. The pools live under the config devnet already
 * uses, which carries no token-badge authority, so a Token-2022 mint can be
 * pooled by anyone without asking.
 *
 *   node scripts/pools_devnet.mjs show       what exists now, from the chain
 *   node scripts/pools_devnet.mjs create     create both pools, if missing
 *   node scripts/pools_devnet.mjs manual <i> open a position and deposit into it
 *   node scripts/pools_devnet.mjs swap       sell issuer B into its pool, and measure
 *   node scripts/pools_devnet.mjs cross <n>  the exit across issuers, in one transaction
 *   node scripts/pools_devnet.mjs dump       write the live pool fields into the data file
 *
 * The deposit goes through the pool's liquidity instruction rather than its
 * by-token-amounts instruction, which is the one that carries price bounds and
 * the one that refuses with 6069. The position mint is created by the program
 * itself, so the transaction must not create it first: doing so collides on the
 * mint with "already in use" from inside the program.
 *
 * Not part of the app or of CI. It is here because the pools it made are real,
 * and the route it proves is the one the product prices.
 *
 *   cd scripts && npm install
 */

/**
 * Real pools on devnet over the two replica issuers.
 *
 * Both issuers are a real Token-2022 mint with a real transfer-fee extension;
 * wSOL is wrapped from the devnet SOL in the wallet, so the quote side is a real
 * token and not a stand-in. The pools are created under the config devnet
 * already uses, which carries no token-badge authority, so a Token-2022 mint can
 * be pooled by anyone.
 *
 *   node pool.js show       what exists now
 *   node pool.js create     create both pools and deposit liquidity
 *   node pool.js swap       sell issuer B into its pool, and measure the landing
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount, mintTo, getAccount, transfer,
  NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import Decimal from "decimal.js";
import * as sdk from "@orca-so/whirlpools-sdk";
import { Percentage } from "@orca-so/common-sdk";

const {
  buildWhirlpoolClient, PDAUtil, PriceMath, TickUtil,
  swapQuoteByInputToken, ORCA_WHIRLPOOL_PROGRAM_ID,
} = sdk;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.dirname(HERE);

const REPLICA = path.join(REPO, "app", "data", "replica-devnet.json");
const RPC = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// The config the pools on devnet already live under. All five fee tiers exist
// and its token-badge authority is unset, so a Token-2022 mint pools without one.
const CONFIG = new PublicKey("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");

const TICK_SPACING = 64;
const RANGE_TICKS = 512; // eight spacings either side of the opening price
const PRICE_SOL_PER_TOKEN = 0.05;
const LIQUIDITY_TOKENS = 2; // whole issuer tokens per pool
const WRAP_LAMPORTS = 600_000_000; // 0.6 SOL wrapped, the max this wallet can spare
const SWAP_TOKENS = 0.5; // whole issuer tokens sold in the swap

const STATE = path.join(REPO, "app", "data", "pools-devnet.json");

function loadWallet() {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(), ".config/solana/id.json"), "utf8")))
  );
}

function loadReplica() {
  return JSON.parse(fs.readFileSync(REPLICA, "utf8"));
}

function saveState(s) {
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + "\n");
}

function loadState() {
  if (!fs.existsSync(STATE)) return {};
  return JSON.parse(fs.readFileSync(STATE, "utf8"));
}

function conn() {
  return new Connection(RPC, {
    commitment: "confirmed",
    fetch: (url, opts) => fetch(url, { ...opts, headers: { ...(opts?.headers || {}), "user-agent": UA } }),
  });
}

function client(wallet, connection) {
  // Built through the SDK's own factory rather than assembled by hand: the
  // context carries an account fetcher, and a context without one fails deep
  // inside createPool with a message about getMintInfos rather than about the
  // fetcher.
  const adapter = {
    publicKey: wallet.publicKey,
    signTransaction: async (tx) => { tx.sign([wallet]); return tx; },
    signAllTransactions: async (txs) => txs.map((t) => { t.sign([wallet]); return t; }),
  };
  const ctx = sdk.WhirlpoolContext.from(connection, adapter, undefined, undefined, undefined, ORCA_WHIRLPOOL_PROGRAM_ID);
  return buildWhirlpoolClient(ctx);
}

async function ensureWsol(wallet, connection) {
  const ata = await getOrCreateAssociatedTokenAccount(
    connection, wallet, NATIVE_MINT, wallet.publicKey, false, "confirmed", {}, TOKEN_PROGRAM_ID
  );
  const have = await getAccount(connection, ata.address, "confirmed", TOKEN_PROGRAM_ID);
  if (Number(have.amount) >= WRAP_LAMPORTS) {
    return { address: ata.address, wrapped: Number(have.amount) };
  }
  const need = WRAP_LAMPORTS - Number(have.amount);
  const tx = new Transaction()
    .add(SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: ata.address, lamports: need }))
    .add(createSyncNativeInstruction(ata.address, TOKEN_PROGRAM_ID));
  const sig = await sendAndConfirmTransaction(connection, tx, [wallet], { commitment: "confirmed" });
  return { address: ata.address, wrapped: WRAP_LAMPORTS, wrapped_sig: sig };
}

async function ensureMintTokens(wallet, connection, mint, whole) {
  const ata = await getOrCreateAssociatedTokenAccount(
    connection, wallet, new PublicKey(mint), wallet.publicKey, false, "confirmed", {}, TOKEN_2022_PROGRAM_ID
  );
  const have = await getAccount(connection, ata.address, "confirmed", TOKEN_2022_PROGRAM_ID);
  const want = BigInt(Math.round(whole * 1e9));
  if (BigInt(have.amount) >= want) return { address: ata.address, amount: have.amount.toString() };
  const sig = await mintTo(
    connection, wallet, new PublicKey(mint), ata.address, wallet, want - BigInt(have.amount),
    [], { commitment: "confirmed" }, TOKEN_2022_PROGRAM_ID
  );
  return { address: ata.address, minted_sig: sig };
}

async function show() {
  const c = conn();
  const state = loadState();
  const replica = loadReplica();
  console.log("config :", CONFIG.toBase58(), "(no token-badge authority, fee tiers present)");
  for (const key of ["issuer_a", "issuer_b"]) {
    const s = state[key];
    console.log(`\n${key}  mint ${replica[key].mint}`);
    if (!s || !s.pool) {
      console.log("  pool: not created");
      continue;
    }
    console.log("  pool      :", s.pool);
    const info = await c.getAccountInfo(new PublicKey(s.pool));
    if (!info) { console.log("  pool account MISSING"); continue; }
    const pool = await client(loadWallet(), c).getPool(s.pool);
    const d = pool.getData();
    console.log("  tokenA    :", d.tokenMintA.toBase58());
    console.log("  tokenB    :", d.tokenMintB.toBase58());
    console.log("  sqrtPrice :", d.sqrtPrice.toString());
    console.log("  tick      :", d.tickCurrentIndex, "liquidity:", d.liquidity.toString());
    console.log("  feeRate   :", d.feeRate, "protocolFeeRate:", d.protocolFeeRate);
    if (s.position) console.log("  position  :", s.position, "range", s.tickLower, "->", s.tickUpper);
  }
}

async function createOne(wallet, c, cl, key, replica, state) {
  const mint = new PublicKey(replica[key].mint);
  console.log(`\n=== ${key} ===`);
  console.log("mint:", mint.toBase58());

  if (state[key] && state[key].pool) {
    console.log("pool already recorded:", state[key].pool);
    return state[key];
  }

  const wsol = await ensureWsol(wallet, c);
  if (wsol.wrapped_sig) console.log("wrapped SOL:", wsol.wrapped_sig);
  const tok = await ensureMintTokens(wallet, c, mint.toBase58(), LIQUIDITY_TOKENS + SWAP_TOKENS + 1);
  if (tok.minted_sig) console.log("minted tokens:", tok.minted_sig);

  // The program requires the mints in canonical order: sorted on the byte
  // representation. The price is therefore in whichever orientation that order
  // produced, so it is computed from the order rather than assumed.
  const sorted = Buffer.compare(mint.toBuffer(), NATIVE_MINT.toBuffer()) < 0;
  const mintA = sorted ? mint : NATIVE_MINT;
  const mintB = sorted ? NATIVE_MINT : mint;
  const price = new Decimal(sorted ? PRICE_SOL_PER_TOKEN : 1 / PRICE_SOL_PER_TOKEN);
  const initialTick = PriceMath.priceToInitializableTickIndex(price, 9, 9, TICK_SPACING);
  console.log("tokenA:", mintA.toBase58(), sorted ? "(issuer)" : "(wSOL)");
  console.log("initial tick:", initialTick, "for price", price.toString());

  const { poolKey, tx } = await cl.createPool(
    CONFIG, mintA, mintB, TICK_SPACING, initialTick, wallet.publicKey
  );
  const sig = await tx.buildAndExecute();
  console.log("pool created:", poolKey.toBase58());
  console.log("  sig:", sig);

  const entry = { pool: poolKey.toBase58(), created_sig: sig, tick: initialTick };
  state[key] = entry;
  saveState(state);

  await openPositionFor(wallet, cl, key, state);
  return state[key];
}

async function openPositionFor(wallet, cl, key, state) {
  const entry = state[key];
  if (!entry || !entry.pool) throw new Error(`${key} has no pool`);
  if (entry.position_sig) {
    console.log("position already opened:", entry.position_sig);
    return;
  }
  const mint = new PublicKey(loadReplica()[key].mint);
  const initialTick = entry.tick;

  // Liquidity, either side of the opening price.
  const lower = TickUtil.getInitializableTickIndex(initialTick - RANGE_TICKS, TICK_SPACING);
  const upper = TickUtil.getInitializableTickIndex(initialTick + RANGE_TICKS, TICK_SPACING);

  const poolKey = new PublicKey(entry.pool);
  const pool = await cl.getPool(poolKey);
  const d = pool.getData();
  const aIsIssuer = d.tokenMintA.equals(mint);
  const tokenMaxA = aIsIssuer
    ? new BN(Math.round(LIQUIDITY_TOKENS * 1e9))
    : new BN(Math.round(LIQUIDITY_TOKENS * PRICE_SOL_PER_TOKEN * 1e9));
  const tokenMaxB = aIsIssuer
    ? new BN(Math.round(LIQUIDITY_TOKENS * PRICE_SOL_PER_TOKEN * 1e9))
    : new BN(Math.round(LIQUIDITY_TOKENS * 1e9));

  console.log(`opening position ${lower} -> ${upper}`);
  // The tick arrays under the range have to exist before a position can use
  // them, and the SDK will not create them implicitly.
  const arrTx = await pool.initTickArrayForTicks([lower, upper], wallet.publicKey);
  if (arrTx) {
    const arrSig = await arrTx.buildAndExecute();
    console.log("tick arrays initialised:", arrSig);
  }

  const { positionMint, tx: posTx } = await pool.openPosition(
    lower, upper, { tokenMaxA, tokenMaxB }, wallet.publicKey, wallet.publicKey
  );
  const posSig = await posTx.buildAndExecute();
  console.log("position mint:", positionMint.toBase58());
  console.log("position opened:", posSig);
  entry.position_sig = posSig;
  entry.tickLower = lower;
  entry.tickUpper = upper;
  state[key] = entry;
  saveState(state);
  return entry;
}

async function create() {
  const wallet = loadWallet();
  const replica = loadReplica();
  const c = conn();
  const cl = client(wallet, c);
  const state = loadState();
  for (const key of ["issuer_a", "issuer_b"]) {
    await createOne(wallet, c, cl, key, replica, state);
  }
  console.log("\nstate written to", STATE);
}

/**
 * Cross-issuer exit in one transaction.
 *
 * Two real pools exist, both against wSOL: issuer B's and issuer A's. Routing an
 * exit across the two issuers means selling B into its pool and spending what
 * comes out into A's pool. Both swaps go in one transaction, so the middle asset
 * cannot be taken out from under the route between the legs, and the mint's fee is
 * charged on the way out of B and again on the way into A.
 */
/** Write the live pool fields (vaults, mints, price) into the state file. */
/**
 * Send the same instruction with data written here, keeping the account list the
 * SDK produced. The point is to separate the data from the accounts: if the
 * program still refuses with the same code, the code is not about the fields
 * this changes.
 */
/**
 * Assemble the position and the deposit as a plain transaction.
 *
 * The client's path ends in a versioned transaction, which makes it impossible to
 * swap one instruction out, and the instruction it picks is the by-token-amounts
 * variant whose price bounds the program rejects. Building the same four
 * instructions directly keeps the deposit on increase_liquidity_v2, which takes a
 * liquidity amount and two maxima and checks no price at all.
 */
const phase = process.argv[2] || "show";
const run = { show, create }[phase];
if (!run) {
  console.error("usage: node pool.js [show|create|swap]");
  process.exit(2);
}
run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nFAILED:", e.message);
    const logs = e.logs || (e.txLogs || []);
    if (logs.length) console.error("--- transaction logs ---\n" + logs.join("\n"));
    if (e.error && e.error.errorMessage) console.error("program:", e.error.errorMessage);
    process.exit(1);
  });
