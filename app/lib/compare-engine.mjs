/**
 * The same company, priced at each issuer, at the user's own size.
 *
 * The claim this file exists to make checkable is the product's thesis: one
 * company's token, issued by two different issuers, is quoted by two different
 * markets, and neither market knows about the other. Both of them charge their
 * own mint-level transfer fee on the way out, and the fee is charged on the
 * leg into the pool as well as on any leg back - so a "price" is only real once
 * the fee schedule in force has been applied to the actual size.
 *
 * Everything here is pure arithmetic over values read from the chain by the
 * caller. It holds no RPC, and it does not soften a number it cannot stand
 * behind: an issuer whose terms cannot be read, or whose pool cannot be priced,
 * comes back refused with a named reason rather than with a blank.
 */
import { feeFor } from "./exit-terms.mjs";
import { quoteBToA } from "./pool-account.mjs";

const Q64 = 1n << 64n;

/** Price of one whole base token, in whole quote tokens, from a pool's own state. */
function pricePerWholeToken(sqrtPrice, decimalsBase, decimalsQuote) {
  // raw quote per raw base, from sqrtPrice^2, then moved to whole units
  const raw = (sqrtPrice * sqrtPrice) / Q64;
  const num = raw * 10n ** BigInt(decimalsBase);
  const den = 10n ** BigInt(decimalsQuote) * Q64;
  return { ratio: raw, whole: Number(num) / Number(den) };
}

/**
 * What one issuer gives you for this holding, fee-adjusted.
 *
 * The mint's fee is taken on the way into the pool, so the pool is quoted on
 * what the pool will actually receive - the same thing the chain does, and the
 * same thing that made a real deposit fail with TokenMaxExceeded when the
 * ceiling was set on the gross.
 */
export function priceIssuer({ label, mint, pool, poolState, schedule, pending, epoch, size }) {
  if (!poolState) {
    return { label, mint, pool, refused: "pool_state_unreadable" };
  }
  if (!schedule) {
    return { label, mint, pool, refused: "exit_terms_unreadable" };
  }

  const mintFeeIn = feeFor(size, schedule);
  const netIntoPool = size - mintFeeIn;
  if (netIntoPool <= 0n) {
    return { label, mint, pool, refused: "fee_consumes_the_whole_holding" };
  }

  // the issuer mint is the pool's second token in both pools, so it goes in and
  // the quote asset comes out
  if (poolState.tokenMintB !== mint) {
    return { label, mint, pool, refused: "pool_does_not_trade_this_mint" };
  }

  const quote = quoteBToA({
    sqrtPrice: poolState.sqrtPrice,
    liquidity: poolState.liquidity,
    feeRateMicro: poolState.feeRateMicro,
    amountIn: netIntoPool,
  });
  if (!quote.ok) {
    return { label, mint, pool, refused: quote.reason };
  }

  const price = pricePerWholeToken(poolState.sqrtPrice, 9, 9);
  return {
    label,
    mint,
    pool,
    epoch,
    scheduleInForce: {
      bps: Number(schedule.bps ?? 0),
      sinceEpoch: schedule.epoch === undefined ? null : Number(schedule.epoch),
      maximumFee: (schedule.maximum_fee ?? 0n).toString(),
      pendingBps: pending ? Number(pending.bps ?? 0) : null,
      pendingAtEpoch: pending ? Number(pending.epoch) : null,
    },
    mintFeeBpsInForce: Number(schedule.bps ?? 0),
    mintFeeWithheld: mintFeeIn,
    intoPool: netIntoPool,
    poolFeeMicro: poolState.feeRateMicro,
    poolFeePaid: quote.feePaid,
    rawOutOfPool: quote.amountOut,
    lands: quote.amountOut, // the quote asset is the chain's own, and it charges no fee
    landsAfterEveryFee: quote.amountOut,
    // the pool's own convention: tokenB per tokenA. Both tokens in this replica
    // carry nine decimals, so these two read directly as SOL per share-token.
    pricePerToken: price.whole,
    spotPerToken: price.whole === 0 ? null : 1 / price.whole,
    // and what the holder actually gets per token, after every fee that applies
    landedPerToken: Number(quote.amountOut) / Number(size),
    depth: poolState.liquidity.toString(),
    tick: poolState.tickCurrentIndex,
    priceMovedPct: quote.priceMovedPct,
    ticksMoved: quote.ticksMoved,
  };
}

/**
 * Both issuers, the spread between them, and what the rail between them costs.
 *
 * The rail is the route this product built: sell into one issuer's pool, spend
 * the result into the other issuer's pool, both in one transaction. It is quoted
 * here the same way the exits are, so the comparison and the route agree.
 */
export function compareIssuers({ size, issuers, rail }) {
  const priced = issuers.map((i) => priceIssuer({ ...i, size }));
  const live = priced.filter((p) => !p.refused);

  if (live.length < 2) {
    return {
      size: size.toString(),
      issuers: priced.map(publicIssuer),
      // the one issuer that could be priced is still reported, and there is no
      // spread to draw: a comparison against a single figure is not a comparison
      better: live[0] ? live[0].label : null,
      landsAt: Object.fromEntries(live.map((p) => [p.label, p.lands.toString()])),
      refused: "fewer_than_two_issuers_could_be_priced",
      spreadBps: null,
      rail: null,
    };
  }

  const ranked = [...live].sort((a, b) => (b.lands > a.lands ? 1 : b.lands < a.lands ? -1 : 0));
  const [best, worst] = ranked;
  const spreadBps = Number(((best.lands - worst.lands) * 10_000n) / worst.lands);

  return {
    size: size.toString(),
    issuers: priced.map(publicIssuer),
    better: best.label,
    worse: worst.label,
    spreadBps,
    // what the same holding fetches at each issuer, side by side
    landsAt: Object.fromEntries(live.map((p) => [p.label, p.lands.toString()])),
    rail: rail ? railQuote({ best, worst, rail }) : null,
  };
}

/**
 * The rail, quoted rather than described: sell the worse-priced holding into its
 * own pool, then spend that into the better-priced issuer's pool. Two swaps, one
 * transaction, and the cost of both legs named.
 */
function railQuote({ best, worst, rail }) {
  const stateA = rail[worst.label];
  const stateB = rail[best.label];
  if (!stateA || !stateB) return { available: false, reason: "one_of_the_pools_is_unreadable" };

  const leg1 = quoteBToA({
    sqrtPrice: stateA.sqrtPrice,
    liquidity: stateA.liquidity,
    feeRateMicro: stateA.feeRateMicro,
    amountIn: worst.intoPool,
  });
  if (!leg1.ok) return { available: false, reason: `first_leg_${leg1.reason}` };

  const leg2 = quoteBToA({
    sqrtPrice: stateB.sqrtPrice,
    liquidity: stateB.liquidity,
    feeRateMicro: stateB.feeRateMicro,
    amountIn: leg1.amountOut,
  });
  if (!leg2.ok) return { available: false, reason: `second_leg_${leg2.reason}` };

  // both legs in one transaction is the point: nothing can move the price between them
  return {
    available: true,
    from: worst.label,
    to: best.label,
    legs: 2,
    inOneTransaction: true,
    leg1: { out: leg1.amountOut.toString(), fee: leg1.feePaid.toString() },
    leg2: { out: leg2.amountOut.toString(), fee: leg2.feePaid.toString() },
    endsHolding: best.label,
    costOfTheRail: (leg1.feePaid + leg2.feePaid).toString(),
  };
}

function publicIssuer(p) {
  const { intoPool, rawOutOfPool, lands, landsAfterEveryFee, mintFeeWithheld, poolFeePaid, ...rest } = p;
  return {
    ...rest,
    intoPool: intoPool?.toString(),
    rawOutOfPool: rawOutOfPool?.toString(),
    lands: lands?.toString(),
    mintFeeWithheld: mintFeeWithheld?.toString(),
    poolFeePaid: poolFeePaid?.toString(),
  };
}
