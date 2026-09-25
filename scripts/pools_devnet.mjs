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

async function swap() {
  const wallet = loadWallet();
  const replica = loadReplica();
  const c = conn();
  const cl = client(wallet, c);
  const state = loadState();

  const key = "issuer_b";
  const s = state[key];
  if (!s || !s.pool) throw new Error(`${key} has no pool; run create first`);

  const mint = new PublicKey(replica[key].mint);
  const pool = await cl.getPool(s.pool);
  const wsol = await getOrCreateAssociatedTokenAccount(
    c, wallet, NATIVE_MINT, wallet.publicKey, false, "confirmed", {}, TOKEN_PROGRAM_ID
  );
  const tok = await ensureMintTokens(wallet, c, mint.toBase58(), 2);

  const amount = new BN(Math.round(SWAP_TOKENS * 1e9));
  const slippage = Percentage.fromFraction(1, 100); // 1%

  const poolKey = new PublicKey(s.pool);
  const quote = await swapQuoteByInputToken(
    pool, mint, amount, slippage, ORCA_WHIRLPOOL_PROGRAM_ID, cl.getFetcher()
  );
  console.log("quote");
  console.log("  in      ", amount.toString(), "of the issuer mint");
  console.log("  out     ", quote.estimatedAmountOut.toString(), "lamports of wSOL");
  console.log("  pool fee", quote.estimatedFeeAmount.toString(), "at", quote.estimatedFeeRateMin.toString(), "bps");

  const before = await c.getTokenAccountBalance(wsol.address);
  const beforeTok = await c.getTokenAccountBalance(tok.address);

  // Assembled here rather than through the client. The same client chose the
  // by-token-amounts deposit path, and the quote it hands back is the raw one, so
  // the instruction is built from the quote's own fields.
  const dq = pool.getData();
  const mintOwnerA = (await c.getAccountInfo(dq.tokenMintA)).owner;
  const mintOwnerB = (await c.getAccountInfo(dq.tokenMintB)).owner;
  const swapIx = sdk.WhirlpoolIx.swapV2Ix(cl.getContext().program, {
    whirlpool: poolKey,
    tokenMintA: dq.tokenMintA,
    tokenMintB: dq.tokenMintB,
    tokenOwnerAccountA: wsol.address,
    tokenOwnerAccountB: tok.address,
    tokenVaultA: dq.tokenVaultA,
    tokenVaultB: dq.tokenVaultB,
    tokenProgramA: mintOwnerA,
    tokenProgramB: mintOwnerB,
    oracle: PDAUtil.getOracle(ORCA_WHIRLPOOL_PROGRAM_ID, poolKey).publicKey,
    tokenAuthority: wallet.publicKey,
    amount: quote.amount,
    otherAmountThreshold: quote.otherAmountThreshold,
    sqrtPriceLimit: quote.sqrtPriceLimit,
    amountSpecifiedIsInput: quote.amountSpecifiedIsInput,
    aToB: quote.aToB,
    tickArray0: quote.tickArray0,
    tickArray1: quote.tickArray1,
    tickArray2: quote.tickArray2,
  });

  const tx = new Transaction().add(swapIx);
  tx.feePayer = wallet.publicKey;
  const bh = await c.getLatestBlockhash("confirmed");
  tx.recentBlockhash = bh.blockhash;
  tx.sign(wallet);
  const sig = await c.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await c.confirmTransaction(sig, "confirmed");
  console.log("\nswapped:", sig);

  const after = await c.getTokenAccountBalance(wsol.address);
  const afterTok = await c.getTokenAccountBalance(tok.address);
  const landed = BigInt(after.value.amount) - BigInt(before.value.amount);
  const spent = BigInt(beforeTok.value.amount) - BigInt(afterTok.value.amount);
  const quoted = BigInt(quote.estimatedAmountOut.toString());
  console.log("  spent          ", spent.toString(), "of the issuer mint");

  // What the mint withheld on the leg into the pool. The fee is credited to the
  // vault's own transfer-fee extension, so it is read where it actually lands.
  const vaults = [
    ["tokenVaultA (wSOL)", pool.getData().tokenVaultA],
    ["tokenVaultB (issuer)", pool.getData().tokenVaultB],
  ];
  let withheld = null;
  let vault = null;
  for (const [name, addr] of vaults) {
    const acct = await c.getAccountInfo(addr, "confirmed");
    let found = null;
    if (acct && acct.data.length > 166) {
      let p = 166;
      while (p + 4 <= acct.data.length) {
        const type = acct.data.readUInt16LE(p);
        const len = acct.data.readUInt16LE(p + 2);
        if (type === 2 && len >= 8) { found = acct.data.readBigUInt64LE(p + 4); break; }
        p += 4 + len;
      }
    }
    console.log(`  ${name}: ${addr.toBase58()} withheld=${found === null ? "none" : found.toString()}`);
    if (found !== null) { withheld = found; vault = addr; }
  }

  console.log("\nmeasured");
  console.log("  quoted out        ", quoted.toString());
  console.log("  landed            ", landed.toString());
  console.log("  shortfall         ", (quoted - landed).toString());
  console.log("  withheld into vault", withheld === null ? "not found" : withheld.toString());
  console.log("  agrees            ", quoted === landed);

  s.swap_sig = sig;
  s.swap_tokens = amount.toString();
  s.quoted_out = quoted.toString();
  s.landed = landed.toString();
  saveState(state);
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
async function cross() {
  const wallet = loadWallet();
  const c = conn();
  const cl = client(wallet, c);
  const program = cl.getContext().program;
  const replica = loadReplica();
  const state = loadState();

  const amount = new BN(Math.round((Number(process.argv[3]) || 0.1) * 1e9));
  const slippage = Percentage.fromFraction(1, 100);

  // The token program for each side is the program that owns that mint, which is
  // also what the instruction is handed as token_program_a / token_program_b.
  const mk = async (addr) => {
    const pool = await cl.getPool(addr);
    const d = pool.getData();
    const progA = (await c.getAccountInfo(d.tokenMintA)).owner;
    const progB = (await c.getAccountInfo(d.tokenMintB)).owner;
    return {
      pool, d, progA, progB,
      ataA: getAssociatedTokenAddressSync(d.tokenMintA, wallet.publicKey, false, progA),
      ataB: getAssociatedTokenAddressSync(d.tokenMintB, wallet.publicKey, false, progB),
    };
  };

  const B = await mk(new PublicKey(state.issuer_b.pool));
  const A = await mk(new PublicKey(state.issuer_a.pool));

  // Leg 1: the issuer's own mint into its pool, out as wSOL.
  const mintB = new PublicKey(replica.issuer_b.mint);
  const q1 = await swapQuoteByInputToken(B.pool, mintB, amount, slippage, ORCA_WHIRLPOOL_PROGRAM_ID, cl.getFetcher());
  console.log("leg 1  in ", amount.toString(), "of issuer B");
  console.log("       out", q1.estimatedAmountOut.toString(), "lamports of wSOL, pool fee", q1.estimatedFeeAmount.toString());

  // Leg 2: that wSOL into issuer A's pool, out as issuer A's mint. Held back a
  // little, because the second leg has to be funded by what the first leg lands.
  const mid = new BN(q1.estimatedAmountOut.toString()).muln(995).divn(1000);
  const mintA = new PublicKey(replica.issuer_a.mint);
  const q2 = await swapQuoteByInputToken(A.pool, NATIVE_MINT, mid, slippage, ORCA_WHIRLPOOL_PROGRAM_ID, cl.getFetcher());
  console.log("leg 2  in ", mid.toString(), "lamports of wSOL");
  console.log("       out", q2.estimatedAmountOut.toString(), "of issuer A, pool fee", q2.estimatedFeeAmount.toString());

  const beforeTokB = await c.getTokenAccountBalance(B.ataB).catch(() => null);
  const beforeTokA = await c.getTokenAccountBalance(A.ataB).catch(() => null);
  const beforeWs = await c.getTokenAccountBalance(B.ataA);

  const leg1 = sdk.WhirlpoolIx.swapV2Ix(program, {
    whirlpool: B.pool.getAddress(), tokenMintA: B.d.tokenMintA, tokenMintB: B.d.tokenMintB,
    tokenOwnerAccountA: B.ataA, tokenOwnerAccountB: B.ataB,
    tokenVaultA: B.d.tokenVaultA, tokenVaultB: B.d.tokenVaultB,
    tokenProgramA: B.progA, tokenProgramB: B.progB,
    oracle: PDAUtil.getOracle(ORCA_WHIRLPOOL_PROGRAM_ID, B.pool.getAddress()).publicKey,
    tokenAuthority: wallet.publicKey,
    amount: q1.amount, otherAmountThreshold: q1.otherAmountThreshold, sqrtPriceLimit: q1.sqrtPriceLimit,
    amountSpecifiedIsInput: q1.amountSpecifiedIsInput, aToB: q1.aToB,
    tickArray0: q1.tickArray0, tickArray1: q1.tickArray1, tickArray2: q1.tickArray2,
  });
  const leg2 = sdk.WhirlpoolIx.swapV2Ix(program, {
    whirlpool: A.pool.getAddress(), tokenMintA: A.d.tokenMintA, tokenMintB: A.d.tokenMintB,
    tokenOwnerAccountA: A.ataA, tokenOwnerAccountB: A.ataB,
    tokenVaultA: A.d.tokenVaultA, tokenVaultB: A.d.tokenVaultB,
    tokenProgramA: A.progA, tokenProgramB: A.progB,
    oracle: PDAUtil.getOracle(ORCA_WHIRLPOOL_PROGRAM_ID, A.pool.getAddress()).publicKey,
    tokenAuthority: wallet.publicKey,
    amount: q2.amount, otherAmountThreshold: q2.otherAmountThreshold, sqrtPriceLimit: q2.sqrtPriceLimit,
    amountSpecifiedIsInput: q2.amountSpecifiedIsInput, aToB: q2.aToB,
    tickArray0: q2.tickArray0, tickArray1: q2.tickArray1, tickArray2: q2.tickArray2,
  });

  const tx = new Transaction().add(leg1, leg2);
  tx.feePayer = wallet.publicKey;
  const bh = await c.getLatestBlockhash("confirmed");
  tx.recentBlockhash = bh.blockhash;
  tx.sign(wallet);

  const sig = await c.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await c.confirmTransaction(sig, "confirmed");
  console.log("\ncross-issuer exit in one transaction:", sig);

  const afterTokB = await c.getTokenAccountBalance(B.ataB);
  const afterTokA = await c.getTokenAccountBalance(A.ataB);
  const afterWs = await c.getTokenAccountBalance(B.ataA);
  console.log("\nmeasured");
  console.log("  issuer B spent     ", (BigInt(beforeTokB.value.amount) - BigInt(afterTokB.value.amount)).toString());
  console.log("  issuer A received  ", (BigInt(afterTokA.value.amount) - BigInt(beforeTokA.value.amount)).toString());
  console.log("  wSOL net           ", (BigInt(afterWs.value.amount) - BigInt(beforeWs.value.amount)).toString(), "(the middle asset, left behind)");
  console.log("  legs in the tx     ", "2 (atomic)");

  state.cross = {
    sig,
    amount_in_b: amount.toString(),
    issuer_b_spent: (BigInt(beforeTokB.value.amount) - BigInt(afterTokB.value.amount)).toString(),
    issuer_a_received: (BigInt(afterTokA.value.amount) - BigInt(beforeTokA.value.amount)).toString(),
    wsol_net: (BigInt(afterWs.value.amount) - BigInt(beforeWs.value.amount)).toString(),
  };
  saveState(state);
}

/** Write the live pool fields (vaults, mints, price) into the state file. */
async function dump() {
  const wallet = loadWallet();
  const c = conn();
  const cl = client(wallet, c);
  const state = loadState();
  for (const key of ["issuer_a", "issuer_b"]) {
    const pool = await cl.getPool(state[key].pool);
    const d = pool.getData();
    Object.assign(state[key], {
      tokenMintA: d.tokenMintA.toBase58(),
      tokenMintB: d.tokenMintB.toBase58(),
      tokenVaultA: d.tokenVaultA.toBase58(),
      tokenVaultB: d.tokenVaultB.toBase58(),
      liquidity: d.liquidity.toString(),
      sqrtPrice: d.sqrtPrice.toString(),
      tickCurrentIndex: d.tickCurrentIndex,
      feeRate: d.feeRate,
      tickSpacing: d.tickSpacing,
    });
    console.log(key, "vaults", d.tokenVaultA.toBase58(), d.tokenVaultB.toBase58(),
                "liquidity", d.liquidity.toString(), "tick", d.tickCurrentIndex);
  }
  saveState(state);
}

async function inspect() {
  const wallet = loadWallet();
  const c = conn();
  const cl = client(wallet, c);
  const state = loadState();
  const key = process.argv[3] || "issuer_a";
  const entry = state[key];
  const mint = new PublicKey(loadReplica()[key].mint);
  const pool = await cl.getPool(entry.pool);
  const d = pool.getData();
  const initialTick = entry.tick;
  const lower = TickUtil.getInitializableTickIndex(initialTick - RANGE_TICKS, TICK_SPACING);
  const upper = TickUtil.getInitializableTickIndex(initialTick + RANGE_TICKS, TICK_SPACING);
  const aIsIssuer = d.tokenMintA.equals(mint);
  const tokenMaxA = aIsIssuer ? new BN(Math.round(LIQUIDITY_TOKENS * 1e9)) : new BN(Math.round(LIQUIDITY_TOKENS * PRICE_SOL_PER_TOKEN * 1e9));
  const tokenMaxB = aIsIssuer ? new BN(Math.round(LIQUIDITY_TOKENS * PRICE_SOL_PER_TOKEN * 1e9)) : new BN(Math.round(LIQUIDITY_TOKENS * 1e9));
  const { lowerBound, upperBound } = PriceMath.getSlippageBoundForSqrtPrice(d.sqrtPrice, Percentage.fromFraction(1, 100));

  console.log("pool tokenA:", d.tokenMintA.toBase58(), "tokenB:", d.tokenMintB.toBase58());
  console.log("tokenMaxA  :", tokenMaxA.toString(), " tokenMaxB:", tokenMaxB.toString());
  console.log("range      :", lower, "->", upper, " current tick:", d.tickCurrentIndex);
  console.log("current price (B per A):", PriceMath.sqrtPriceX64ToPrice(d.sqrtPrice, 9, 9).toString());

  const { tx } = await pool.openPosition(
    lower, upper,
    { tokenMaxA, tokenMaxB, minSqrtPrice: lowerBound[0], maxSqrtPrice: upperBound[0] },
    wallet.publicKey, wallet.publicKey
  );
  const built = await tx.build();
  const t = built.transaction ? built.transaction : built;
  const ixs = t.instructions || t.message.compiledInstructions;
  console.log("\ninstructions in the tx:", ixs.length);
  const PROGS = {
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "WHIRLPOOL",
    "11111111111111111111111111111111": "system",
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "token",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": "token-2022",
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL": "ATA",
  };
  ixs.forEach((ix, i) => {
    const pid = (ix.programId || t.message.staticAccountKeys[ix.programIdIndex]).toBase58();
    const data = Buffer.from(ix.data || []);
    console.log(`  [${i}] ${(PROGS[pid] || pid).padEnd(11)} data ${data.subarray(0, 8).toString("hex")} len ${data.length}`);
    if (i === 3) console.log("      full hex:", data.toString("hex"));
  });
}

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
async function manual() {

  const wallet = loadWallet();
  const c = conn();
  const cl = client(wallet, c);
  const program = cl.getContext().program;
  const state = loadState();
  const key = process.argv[3] || "issuer_a";
  const entry = state[key];
  const poolKey = new PublicKey(entry.pool);
  const pool = await cl.getPool(poolKey);
  const d = pool.getData();
  const mint = new PublicKey(loadReplica()[key].mint);

  const lower = TickUtil.getInitializableTickIndex(entry.tick - RANGE_TICKS, TICK_SPACING);
  const upper = TickUtil.getInitializableTickIndex(entry.tick + RANGE_TICKS, TICK_SPACING);
  const aIsIssuer = d.tokenMintA.equals(mint);
  const tokenMaxA = new BN(Math.round((aIsIssuer ? LIQUIDITY_TOKENS : LIQUIDITY_TOKENS * PRICE_SOL_PER_TOKEN) * 1e9));
  const tokenMaxB = new BN(Math.round((aIsIssuer ? LIQUIDITY_TOKENS * PRICE_SOL_PER_TOKEN : LIQUIDITY_TOKENS) * 1e9));

  const mintOwnerA = (await c.getAccountInfo(d.tokenMintA)).owner;
  const mintOwnerB = (await c.getAccountInfo(d.tokenMintB)).owner;
  const ataA = getAssociatedTokenAddressSync(d.tokenMintA, wallet.publicKey, false, mintOwnerA);
  const ataB = getAssociatedTokenAddressSync(d.tokenMintB, wallet.publicKey, false, mintOwnerB);

  const balA = await c.getTokenAccountBalance(ataA).catch(() => null);
  const balB = await c.getTokenAccountBalance(ataB).catch(() => null);
  console.log("owner ATA A:", ataA.toBase58(), balA ? balA.value.uiAmountString : "missing", "tokenA");
  console.log("owner ATA B:", ataB.toBase58(), balB ? balB.value.uiAmountString : "missing", "tokenB");
  console.log("tick range :", lower, "->", upper, " current:", d.tickCurrentIndex);
  console.log("vaults     :", d.tokenVaultA.toBase58(), d.tokenVaultB.toBase58());

  const taLower = PDAUtil.getTickArrayFromTickIndex(lower, TICK_SPACING, poolKey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey;
  const taUpper = PDAUtil.getTickArrayFromTickIndex(upper, TICK_SPACING, poolKey, ORCA_WHIRLPOOL_PROGRAM_ID).publicKey;
  for (const [nm, pk] of [["lower", taLower], ["upper", taUpper]]) {
    const info = await c.getAccountInfo(pk);
    console.log(`tick array ${nm}:`, pk.toBase58(), info ? "exists" : "ABSENT");
  }

  const liquidityAmount = sdk.PoolUtil.estimateLiquidityFromTokenAmounts(
    d.tickCurrentIndex, lower, upper, { tokenA: tokenMaxA, tokenB: tokenMaxB }
  );
  // The deposit debits the gross amount, and a mint carrying a transfer fee debits
  // more than the position is worth, so the ceilings have to sit above the size or
  // the program refuses with TokenMaxExceeded. The size still comes from the estimate.
  const maxA = tokenMaxA.muln(105).divn(100);
  const maxB = tokenMaxB.muln(105).divn(100);
  console.log("liquidity to mint:", liquidityAmount.toString());
  if (liquidityAmount.isZero()) throw new Error("liquidity estimate is zero; amounts too small for the range");

  const positionMint = Keypair.generate();
  const positionPda = PDAUtil.getPosition(ORCA_WHIRLPOOL_PROGRAM_ID, positionMint.publicKey);
  const positionTokenAccount = getAssociatedTokenAddressSync(
    positionMint.publicKey, wallet.publicKey, false, TOKEN_PROGRAM_ID
  );

  console.log("position mint  :", positionMint.publicKey.toBase58());
  console.log("position pda   :", positionPda.publicKey.toBase58());
  console.log("position ATA   :", positionTokenAccount.toBase58(), "(owner=wallet, classic token program)");
  console.log("metadata pda   :", PDAUtil.getPositionMetadata(positionMint.publicKey).publicKey.toBase58());
  const rentForMint = await c.getMinimumBalanceForRentExemption(82);
  console.log("mint rent (the program pays this from the wallet):", rentForMint);

  const mintRent = await c.getMinimumBalanceForRentExemption(82);
  // The program creates the position mint itself (it takes the mint as a signer and
  // funds it from the payer), so no create-account or initialize-mint here.
  const ixs = [
    sdk.WhirlpoolIx.openPositionIx(program, {
      funder: wallet.publicKey,
      owner: wallet.publicKey,
      positionPda,
      positionMintAddress: positionMint.publicKey,
      metadataPda: PDAUtil.getPositionMetadata(positionMint.publicKey).publicKey,
      positionTokenAccount,
      whirlpool: poolKey,
      tickLowerIndex: lower,
      tickUpperIndex: upper,
    }),
    sdk.WhirlpoolIx.increaseLiquidityV2Ix(program, {
      whirlpool: poolKey,
      position: positionPda.publicKey,
      positionTokenAccount,
      positionAuthority: wallet.publicKey,
      tokenMintA: d.tokenMintA,
      tokenMintB: d.tokenMintB,
      tokenOwnerAccountA: ataA,
      tokenOwnerAccountB: ataB,
      tokenVaultA: d.tokenVaultA,
      tokenVaultB: d.tokenVaultB,
      tokenProgramA: mintOwnerA,
      tokenProgramB: mintOwnerB,
      tickArrayLower: taLower,
      tickArrayUpper: taUpper,
      liquidityAmount,
      tokenMaxA: maxA,
      tokenMaxB: maxB,
    }),
  ];

  const tx = new Transaction().add(...ixs);
  tx.feePayer = wallet.publicKey;
  const { blockhash } = await c.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.sign(wallet, positionMint);

  const sig = await c.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await c.confirmTransaction(sig, "confirmed");
  console.log("\nposition + liquidity:", sig);

  entry.position_sig = sig;
  entry.position_mint = positionMint.publicKey.toBase58();
  entry.tickLower = lower;
  entry.tickUpper = upper;
  saveState(state);
}

const phase = process.argv[2] || "show";
const run = { show, create, manual, swap, cross, dump, inspect }[phase];
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
