import test from "node:test";
import assert from "node:assert/strict";
import { compareIssuers, priceIssuer } from "./compare-engine.mjs";

// A pool at price 1.0 (sqrtPrice = 1.0 in Q64.64), a trillion units of depth, no
// pool fee. With no fee and that depth, a million in comes back as a million less
// a rounding: out = eff/(1 + eff/L), which is 999999 here.
const FLAT_POOL = {
  sqrtPrice: 1n << 64n,
  liquidity: 1_000_000_000_000n,
  feeRateMicro: 0,
  tickCurrentIndex: 0,
  tokenMintA: "So11111111111111111111111111111111111111112",
  tokenMintB: "DjvERvY5tuuZzWziNSqMCdUxNeg7adfVCHVR9eQnSjGb",
};

const MINT_A = FLAT_POOL.tokenMintB;
const MINT_B = "3CeQw3Y4nEBiykxWKEnxPnmKq3GFrwrxYjFRwUTMPVgu";
// the second issuer's pool trades its own mint, which is the whole point: two
// markets for one company's token, and neither of them is the other's
const FLAT_POOL_B = { ...FLAT_POOL, tokenMintB: MINT_B };

const FREE = { epoch: 1000, bps: 0, maximum_fee: 18446744073709551615n };
const ONE_PCT = { epoch: 1000, bps: 100, maximum_fee: 18446744073709551615n };

function issuer(label, mint, schedule, poolState = FLAT_POOL) {
  return { label, mint, pool: "pool-" + label, poolState, schedule, epoch: 1100 };
}

test("the mint fee is taken off the gross, and the pool is quoted on what it receives", () => {
  const out = priceIssuer({ ...issuer("B", MINT_B, ONE_PCT, FLAT_POOL_B), size: 100_000_000n });
  assert.equal(out.mintFeeWithheld, 1000000n, "1% of a hundred million");
  assert.equal(out.intoPool, 99000000n, "the pool is asked about the net, as the chain does");
  assert.equal(out.mintFeeBpsInForce, 100);
  assert.equal(out.scheduleInForce.bps, 100);
});

test("an issuer charging no fee lands exactly what the pool quotes", () => {
  const out = priceIssuer({ ...issuer("A", MINT_A, FREE), size: 1_000_000n });
  assert.equal(out.mintFeeWithheld, 0n);
  assert.equal(out.rawOutOfPool, out.lands, "nothing is withheld between the pool and the holder");
  assert.equal(out.lands, 999999n, "and the arithmetic is the pool's own, at this depth");
});

test("a pool that does not trade this mint is refused by name", () => {
  const out = priceIssuer({ ...issuer("A", "someOtherMint111111111111111111111111111111", FREE), size: 1_000n });
  assert.equal(out.refused, "pool_does_not_trade_this_mint");
  assert.equal(out.lands, undefined, "a refusal carries no figure");
});

test("unreadable terms and unreadable pools are refused, not guessed", () => {
  assert.equal(priceIssuer({ ...issuer("A", MINT_A, null), size: 1_000n }).refused, "exit_terms_unreadable");
  assert.equal(
    priceIssuer({ ...issuer("A", MINT_A, FREE, null), size: 1_000n }).refused,
    "pool_state_unreadable"
  );
});

test("a fee that would consume the whole holding is refused rather than priced at zero", () => {
  const total = { epoch: 1000, bps: 10_000, maximum_fee: 18446744073709551615n };
  const out = priceIssuer({ ...issuer("B", MINT_B, total, FLAT_POOL_B), size: 100_000_000n });
  assert.equal(out.refused, "fee_consumes_the_whole_holding");
});

test("two issuers priced side by side: the better one is named and the spread is in bps", () => {
  const out = compareIssuers({
    size: 1_000_000n,
    issuers: [issuer("A", MINT_A, FREE), issuer("B", MINT_B, ONE_PCT, FLAT_POOL_B)],
    rail: null,
  });
  assert.equal(out.better, "A");
  assert.equal(out.worse, "B");
  assert.equal(out.landsAt.A, "999999");
  assert.ok(BigInt(out.landsAt.B) < BigInt(out.landsAt.A), "the fee-bearing issuer lands less");
  // 1% off the top, then the pool's own price on the remainder
  assert.equal(out.landsAt.B, "989999");
  assert.equal(out.spreadBps, 101);
});

test("with fewer than two issuers priced the answer is a refusal, not a one-sided win", () => {
  const out = compareIssuers({
    size: 1_000_000n,
    issuers: [issuer("A", MINT_A, FREE), issuer("B", MINT_B, null, FLAT_POOL_B)],
    rail: null,
  });
  assert.equal(out.refused, "fewer_than_two_issuers_could_be_priced");
  assert.equal(out.spreadBps, null);
  assert.equal(out.better, "A", "but the one issuer that could be priced is still named");
});

test("the rail is quoted in both legs and its cost is the sum of the two fees", () => {
  const out = compareIssuers({
    size: 1_000_000n,
    issuers: [issuer("A", MINT_A, FREE), issuer("B", MINT_B, ONE_PCT, FLAT_POOL_B)],
    rail: { A: FLAT_POOL, B: FLAT_POOL_B },
  });
  assert.equal(out.rail.available, true);
  assert.equal(out.rail.legs, 2);
  assert.equal(out.rail.inOneTransaction, true, "the point of the route is that the legs cannot be separated");
  assert.equal(out.rail.from, "B");
  assert.equal(out.rail.to, "A");
  assert.equal(
    out.rail.costOfTheRail,
    (BigInt(out.rail.leg1.fee) + BigInt(out.rail.leg2.fee)).toString()
  );
});

test("the rail is refused when a pool it would cross is unreadable", () => {
  const out = compareIssuers({
    size: 1_000_000n,
    issuers: [issuer("A", MINT_A, FREE), issuer("B", MINT_B, ONE_PCT, FLAT_POOL_B)],
    rail: { A: FLAT_POOL },
  });
  assert.equal(out.rail.available, false);
  assert.equal(out.rail.reason, "one_of_the_pools_is_unreadable");
});

test("the answer survives being sent as JSON", () => {
  // /api/compare returns this straight through NextResponse.json. A BigInt
  // anywhere in here is a 500 at runtime, which is how this test came to exist.
  const out = compareIssuers({
    size: 1_000_000n,
    issuers: [issuer("A", MINT_A, FREE), issuer("B", MINT_B, ONE_PCT, FLAT_POOL_B)],
    rail: { A: FLAT_POOL, B: FLAT_POOL_B },
  });
  assert.doesNotThrow(() => JSON.stringify(out));
  const round = JSON.parse(JSON.stringify(out));
  assert.equal(round.landsAt.A, out.landsAt.A);
  assert.equal(round.issuers.length, 2);
});

test("what lands is never more than the pool's own spot price", () => {
  // The one invariant the comparison screen rests on: whatever the depth and the
  // fees do, the figure a holder is shown must not exceed the pool's own price.
  for (const schedule of [FREE, ONE_PCT]) {
    const out = compareIssuers({
      size: 1_000_000n,
      issuers: [issuer("A", MINT_A, schedule)],
      rail: null,
    });
    const x = out.issuers[0];
    assert.ok(x.spotPerToken > 0);
    assert.ok(
      x.landedPerToken <= x.spotPerToken,
      `landed ${x.landedPerToken} must not exceed spot ${x.spotPerToken}`
    );
  }
});

test("a bigger holding moves the pool further, and the price it gets is worse", () => {
  const small = compareIssuers({ size: 1_000_000n, issuers: [issuer("A", MINT_A, FREE)], rail: null });
  const large = compareIssuers({ size: 100_000_000n, issuers: [issuer("A", MINT_A, FREE)], rail: null });
  const smallPerUnit = (BigInt(small.landsAt.A) * 1_000_000n) / 1_000_000n;
  const largePerUnit = (BigInt(large.landsAt.A) * 1_000_000n) / 100_000_000n;
  assert.ok(largePerUnit < smallPerUnit, "depth is finite, so size costs something");
  assert.ok(large.issuers[0].priceMovedPct > small.issuers[0].priceMovedPct);
});
