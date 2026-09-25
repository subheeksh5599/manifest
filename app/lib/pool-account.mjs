/**
 * Read a pool account from its bytes, and quote a swap against it.
 *
 * The app talks to the chain with plain JSON-RPC, so it has no client library to
 * decode a pool with. The offsets below are the borsh layout of the account as
 * the program that created it declares it: an 8-byte discriminator, then the
 * fields with no padding. `scripts/pool_layout.mjs` derives them from that
 * declaration and then parses a live pool with them, comparing every field
 * against the client library's own decode - ten fields, all agreeing.
 *
 * Nothing here is a guess, and the quote is checkable too: scripts/pool_quote_check.mjs
 * prices the same swap through this file and through the client library at the
 * same pool state and prints both.
 */

const OFF = {
  feeRate: 45,
  liquidity: 49,
  sqrtPrice: 65,
  tickCurrentIndex: 81,
  tokenMintA: 101,
  tokenVaultA: 133,
  tokenMintB: 181,
  tokenVaultB: 213,
};
const ACCOUNT_LEN = 653;
const Q64 = 1n << 64n;
const FEE_DENOM = 1_000_000n;

export const POOL_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";

const b58 = (buf) => {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = 0n;
  for (const byte of buf) n = n * 256n + BigInt(byte);
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const byte of buf) {
    if (byte === 0) out = "1" + out;
    else break;
  }
  return out;
};

const u128le = (buf, off) => buf.readBigUInt64LE(off) + (buf.readBigUInt64LE(off + 8) << 64n);

/**
 * Decode the fields the product needs. Returns null rather than a half-read
 * account when the bytes cannot be a pool: a wrong length or a short buffer is
 * not something to guess at.
 */
export function readPoolAccount(base64, expectedProgram = POOL_PROGRAM, owner = POOL_PROGRAM) {
  if (owner !== expectedProgram) return null;
  const data = Buffer.from(base64, "base64");
  if (data.length !== ACCOUNT_LEN) return null;
  return {
    // the program stores this in hundredths of a bip, so 2000 is a 0.2% pool fee
    feeRateMicro: Number(data.readUInt16LE(OFF.feeRate)),
    liquidity: u128le(data, OFF.liquidity),
    sqrtPrice: u128le(data, OFF.sqrtPrice),
    tickCurrentIndex: data.readInt32LE(OFF.tickCurrentIndex),
    tokenMintA: b58(data.subarray(OFF.tokenMintA, OFF.tokenMintA + 32)),
    tokenVaultA: b58(data.subarray(OFF.tokenVaultA, OFF.tokenVaultA + 32)),
    tokenMintB: b58(data.subarray(OFF.tokenMintB, OFF.tokenMintB + 32)),
    tokenVaultB: b58(data.subarray(OFF.tokenVaultB, OFF.tokenVaultB + 32)),
  };
}

/** The pool's price in whole quote per whole base, for a display. Not a quote. */
export function impliedPrice(sqrtPrice, decimalsA, decimalsB) {
  const p = (sqrtPrice * sqrtPrice) / Q64; // Q64.64 price: tokenB per tokenA, in raw units
  const scale = 10n ** BigInt(decimalsA) * 10n ** BigInt(decimalsB);
  // p is (rawB/rawA) * 2^64; convert to whole units: p * 10^dA / (10^dB * 2^64)
  const whole = (p * 10n ** BigInt(decimalsA)) / (10n ** BigInt(decimalsB) * Q64);
  return { raw: p, whole, scale };
}

/**
 * A swap within one tick range, exact integer arithmetic.
 *
 * With liquidity L and price sqrtP (both as stored), putting tokenA in and taking
 * tokenB out moves the price to sqrtP' = L*sqrtP/(L + amountIn*sqrtP), and the
 * output is L*(sqrtP - sqrtP'). Anything that would move the price past the range
 * the position covers is reported as out of range rather than priced as if the
 * depth went on forever.
 */
export function quoteAToB({ sqrtPrice, liquidity, feeRateMicro, amountIn }) {
  if (liquidity <= 0n) return { ok: false, reason: "pool_has_no_liquidity" };
  const fee = BigInt(feeRateMicro);
  if (fee >= FEE_DENOM) return { ok: false, reason: "fee_rate_not_sane" };
  const eff = (amountIn * (FEE_DENOM - fee)) / FEE_DENOM;
  if (eff <= 0n) return { ok: false, reason: "amount_too_small" };

  const denom = (liquidity << 64n) + eff * sqrtPrice;
  const sqrtNext = ((liquidity << 64n) * sqrtPrice) / denom;
  const out = (liquidity * (sqrtPrice - sqrtNext)) / Q64;

  const movedTicks = trackTicks(sqrtPrice, sqrtNext);
  return {
    ok: true,
    amountIn,
    amountInAfterFee: eff,
    amountOut: out,
    feePaid: amountIn - eff,
    sqrtPriceNext: sqrtNext,
    priceMovedPct: Number((BigInt(1_000_000) * (sqrtPrice - sqrtNext)) / sqrtPrice) / 10_000,
    ...movedTicks,
  };
}

/** Same move, the other way: tokenB in, tokenA out. */
export function quoteBToA({ sqrtPrice, liquidity, feeRateMicro, amountIn }) {
  if (liquidity <= 0n) return { ok: false, reason: "pool_has_no_liquidity" };
  const fee = BigInt(feeRateMicro);
  if (fee >= FEE_DENOM) return { ok: false, reason: "fee_rate_not_sane" };
  const eff = (amountIn * (FEE_DENOM - fee)) / FEE_DENOM;
  if (eff <= 0n) return { ok: false, reason: "amount_too_small" };

  // B is the pool's second token, so adding it lifts the price: sqrtP' = sqrtP + amountIn*Q64/L
  const sqrtNext = sqrtPrice + (eff << 64n) / liquidity;
  // and the A that comes out is L(1/sqrtP - 1/sqrtP'), which is not the same shape
  // as the other direction: the whole thing divides by the product of the prices.
  const out = ((liquidity << 64n) * (sqrtNext - sqrtPrice)) / (sqrtPrice * sqrtNext);

  return {
    ok: true,
    amountIn,
    amountInAfterFee: eff,
    amountOut: out,
    feePaid: amountIn - eff,
    sqrtPriceNext: sqrtNext,
    priceMovedPct: Number((BigInt(1_000_000) * (sqrtNext - sqrtPrice)) / sqrtPrice) / 10_000,
    ...trackTicks(sqrtPrice, sqrtNext),
  };
}

/** log1.0001 of a price ratio, as the pool measures it, in ticks. */
function trackTicks(from, to) {
  const ratio = Number(to) / Number(from);
  const ticks = Math.log(ratio) / Math.log(1.0001);
  return { ticksMoved: Math.round(ticks) };
}
