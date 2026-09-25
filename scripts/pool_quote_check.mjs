/**
 * Does the app's own quote agree with the client library's?
 *
 * Both are asked the same question at the same pool state: how much comes out of
 * this pool for this much in. The app's answer comes from app/lib/pool-account.mjs,
 * which does the arithmetic itself on bytes it read over plain JSON-RPC. If the
 * two disagree the app's number is wrong, and the comparison it renders is wrong
 * with it.
 *
 *   node scripts/pool_quote_check.mjs [pool] [inputBaseUnits]
 */
import { Connection, PublicKey } from "@solana/web3.js";
import * as sdk from "@orca-so/whirlpools-sdk";
import { Percentage } from "@orca-so/common-sdk";
import BN from "bn.js";
import { readPoolAccount, quoteBToA, quoteAToB } from "../app/lib/pool-account.mjs";

const RPC = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
const POOL = process.argv[2] || "3UjmfmbJgrw9AJbBuFZn1wZcY7sdXhC8i2bRap751yVi";
const SIZE = BigInt(process.argv[3] || "100000000");

const c = new Connection(RPC, "confirmed");
const info = await c.getAccountInfo(new PublicKey(POOL), "confirmed");
if (!info) throw new Error("no pool at " + POOL);

const pool = readPoolAccount(
  Buffer.from(info.data).toString("base64"),
  sdk.ORCA_WHIRLPOOL_PROGRAM_ID.toBase58(),
  info.owner.toBase58()
);
if (!pool) throw new Error("the bytes are not a pool account");
console.log("pool", POOL);
console.log("  price", pool.sqrtPrice.toString());
console.log("  depth", pool.liquidity.toString());
console.log("  pool fee", (pool.feeRateMicro / 10_000).toFixed(4), "%");

// The issuer token is the pool's B mint in both of our pools; B in, wSOL (A) out.
const mine = quoteBToA({
  sqrtPrice: pool.sqrtPrice,
  liquidity: pool.liquidity,
  feeRateMicro: pool.feeRateMicro,
  amountIn: SIZE,
});

const ctx = sdk.WhirlpoolContext.from(c, {
  publicKey: PublicKey.default,
  signTransaction: async (t) => t,
  signAllTransactions: async (t) => t,
});
const client = sdk.buildWhirlpoolClient(ctx, sdk.ORCA_WHIRLPOOL_PROGRAM_ID);
const whirlpool = await client.getPool(new PublicKey(POOL));
const lib = await sdk.swapQuoteByInputToken(
  whirlpool,
  new PublicKey(pool.tokenMintB),
  new BN(SIZE.toString()),
  Percentage.fromFraction(5, 100),
  sdk.ORCA_WHIRLPOOL_PROGRAM_ID,
  ctx.fetcher
);

const a = mine.amountOut;
const b = BigInt(lib.estimatedAmountOut.toString());
const diff = a > b ? a - b : b - a;
const rel = b === 0n ? 0 : Number((diff * 1_000_000n) / b) / 10_000;

console.log("\nthe same swap, both ways");
console.log("  app   ", a.toString(), "lamports out");
console.log("  library", b.toString(), "lamports out");
console.log("  library fee", lib.estimatedFeeAmount.toString(), "at", lib.estimatedFeeRateMin.toString(), "bps");
console.log("  difference", diff.toString(), `(${rel}%)`);
console.log("  app ticks moved", mine.ticksMoved, "| library", lib.estimatedEndTickIndex - lib.estimatedStartTickIndex);

// The app must be conservative: a quote that is larger than the library's would
// promise the user more than the pool will pay.
const honest = a <= b && diff * 10000n <= b * 10n; // within 0.1%, and never above
console.log(honest
  ? "\nPASS - the app's figure is at or below the library's and within a tenth of a percent"
  : "\nFAIL - the app's figure is not defensible against the library's");
process.exit(honest ? 0 : 1);
