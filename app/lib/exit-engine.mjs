/**
 * The exit engine.
 *
 * The claim this file enforces: no holding is reported as worth X unless X is
 * achievable at the exit, at size, today.
 *
 * The gap it exists to expose: a swap quote is not a payout. The quote is the
 * pool's arithmetic. The mint's transfer-fee extension then takes its cut on
 * the transfer, so what actually lands is less than what was quoted. Every
 * surface in the field shows the quote.
 *
 * Pure functions only. No network, no I/O, no mocks.
 *
 *   node --test app/lib/exit-engine.test.mjs
 */

import { roundTripCost, feeFor, selectFeeSchedule, normalizeSchedule } from "./exit-terms.mjs";

/** First failure wins. The id is what gets published, so it must be precise. */
export const CHECK_ORDER = [
  "mint_is_token_2022",
  "mint_not_paused",
  "no_transfer_hook_program",
  "exit_route_exists",
  "impact_within_bound",
  "fee_does_not_consume_position",
];

export const REFUSAL_CODES = {
  mint_is_token_2022: "mint_not_token_2022",
  mint_not_paused: "mint_paused",
  no_transfer_hook_program: "transfer_hook_installed",
  exit_route_exists: "no_exit_route",
  impact_within_bound: "impact_over_bound",
  fee_does_not_consume_position: "fee_consumes_position",
};

function assertFiniteNumber(v, name) {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new RangeError(`${name} must be a finite number, got ${JSON.stringify(v)}`);
  }
  if (v < 0) throw new RangeError(`${name} must not be negative, got ${v}`);
  return v;
}

/**
 * Turn a swap quote into what actually lands, given the mint's fee schedule.
 *
 * quoted_out  the pool will send this
 * withheld    the mint's transfer fee takes this off the transfer
 * lands       the holder receives this
 */
export function landingAmount(quotedOut, terms, epoch = null) {
  const e = epoch === null ? terms.epoch : epoch;
  const sel = selectFeeSchedule(terms.fee_older, terms.fee_newer, e);
  const withheld = feeFor(quotedOut, sel.effective);
  return {
    quoted_out: quotedOut,
    schedule_bps: sel.effective ? sel.effective.bps : 0,
    schedule_epoch: sel.effective ? sel.effective.epoch : null,
    withheld,
    lands: quotedOut - withheld,
    pending_bps: sel.pending ? sel.pending.bps : null,
    pending_epoch: sel.pending ? sel.pending.epoch : null,
    // what the same exit would cost once the announced schedule takes effect
    withheld_after_pending: sel.pending ? feeFor(quotedOut, sel.pending) : null,
  };
}

/**
 * Evaluate one exit.
 *
 * terms       an exit-terms record (from exit-terms.mjs)
 * quote       { out_amount, price_impact_bps, venue } or null when no route exists
 * notional    the raw amount being exited
 * bounds      { max_impact_bps, max_total_cost_bps }
 */
export function exitVerdict(terms, quote, notional, bounds = {}) {
  const max_impact_bps = assertFiniteNumber(bounds.max_impact_bps ?? 300, "max_impact_bps");
  const max_total_cost_bps = assertFiniteNumber(bounds.max_total_cost_bps ?? 1000, "max_total_cost_bps");
  const n = BigInt(notional);
  if (n <= 0n) throw new RangeError("notional must be positive");

  const checks = [];
  const add = (id, passed, value, detail = null) =>
    checks.push({ id, passed, value, detail, refusal: passed ? null : REFUSAL_CODES[id] });

  // 1. The fee extension only exists on Token-2022. On the classic program there
  //    is no scheduled exit cost at all, so the premise of this product is absent.
  add("mint_is_token_2022", terms.is_token_2022 !== false, terms.is_token_2022 ?? null);

  // 2. A paused mint cannot be transferred out of, by anyone.
  add("mint_not_paused", terms.paused !== true, terms.paused ?? null);

  // 3. An installed hook program puts arbitrary code on every transfer.
  add("no_transfer_hook_program", !terms.transfer_hook_program, terms.transfer_hook_program ?? null);

  // 4. No route means no exit at any price.
  add("exit_route_exists", Boolean(quote && quote.out_amount), quote?.venue ?? null);

  // 5. Price impact at the size actually being exited.
  const impact = quote?.price_impact_bps ?? null;
  add("impact_within_bound", impact !== null && impact <= max_impact_bps, impact, { max_impact_bps });

  // 6. The fee must not eat the position.
  const landing = quote && quote.out_amount ? landingAmount(BigInt(quote.out_amount), terms) : null;
  const total_cost_bps = landing ? costBps(n, landing) : null;
  add(
    "fee_does_not_consume_position",
    landing !== null && landing.lands > 0n && total_cost_bps <= max_total_cost_bps,
    total_cost_bps,
    { max_total_cost_bps, lands: landing ? landing.lands.toString() : null }
  );

  const firstFailure = checks.find((c) => !c.passed);
  const verdict = firstFailure ? "REFUSE" : "ROUTE";

  return {
    verdict,
    reason: firstFailure ? firstFailure.refusal : null,
    failed_check: firstFailure ? firstFailure.id : null,
    checks,
    landing,
    // In/out both cost a fee, so a round trip is dearer than the exit alone.
    round_trip: roundTripCost(n, selectFeeSchedule(terms.fee_older, terms.fee_newer, terms.epoch).effective),
    current_epoch: terms.epoch ?? null,
  };
}

function costBps(notional, landing) {
  if (notional === 0n) return 0;
  const quoted = landing.quoted_out;
  const lost = quoted - landing.lands;
  return Number((lost * 10000n) / quoted) / 1;
}

/**
 * Compare every available exit route and pick the cheapest that is achievable.
 *
 * Routes are not alternatives in the abstract: a pool is executable now, an
 * issuer's redemption window is a promise made off-chain, and a second issuer
 * only exists when one is actually observed on chain.
 */
export function routeExit(routes, context = {}) {
  const scored = [];
  for (const r of routes) {
    if (!r.available) {
      scored.push({ ...r, achievable_now: false, lands: null });
      continue;
    }
    // The fee comes from the mint, not from the route. Reading it off the route
    // let a caller that forgot to attach terms price a fee of zero, which made
    // the best route disagree with the verdict on the same page.
    const terms = r.terms ?? context.terms ?? {};
    const epoch = r.epoch ?? context.epoch ?? null;
    const landing = landingAmount(BigInt(r.out_amount), terms, epoch);
    const impact = r.price_impact_bps ?? 0;
    scored.push({
      ...r,
      achievable_now: true,
      landing,
      // the honest comparison: what lands after the fee, then what impact costs
      effective_out: landing.lands,
      effective_cost_bps: impact + costBps(BigInt(r.out_amount), landing),
    });
  }

  const achievable = scored.filter((r) => r.achievable_now && r.landing.lands > 0n);
  achievable.sort((a, b) => (b.effective_out > a.effective_out ? 1 : b.effective_out < a.effective_out ? -1 : 0));

  return {
    routes: scored,
    best: achievable[0] ?? null,
    achievable_count: achievable.length,
    // When nothing is achievable, the product's answer is a named reason, not a zero.
    unreachable_reasons: scored.filter((r) => !r.achievable_now).map((r) => ({ venue: r.venue, reason: r.unavailable_reason })),
  };
}

export default { CHECK_ORDER, REFUSAL_CODES, landingAmount, exitVerdict, routeExit };
