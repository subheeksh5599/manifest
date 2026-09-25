/**
 * Exit-engine tests.
 *
 * Run:  node --test app/lib/exit-engine.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import engine from "./exit-engine.mjs";

const { CHECK_ORDER, REFUSAL_CODES, landingAmount, exitVerdict, routeExit } = engine;

const ONE_KEY = "WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc";
const U64_MAX = 18446744073709551615n;

// A mint with 1% in force and 3% announced for epoch 1043 — the verified shape.
const TERMS = {
  mint: "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB",
  slot: 450306499,
  epoch: 1042n,
  is_token_2022: true,
  decimals: 9,
  paused: null,
  transfer_hook_program: null,
  transfer_hook_authority: ONE_KEY,
  permanent_delegate: ONE_KEY,
  freeze_authority: ONE_KEY,
  mint_authority: ONE_KEY,
  fee_older: { epoch: 1039n, bps: 100, maximum_fee: U64_MAX },
  fee_newer: { epoch: 1043n, bps: 300, maximum_fee: U64_MAX },
};

const QUOTE = { venue: "pool", out_amount: 1_000_000_000_000n, price_impact_bps: 12 };

// ---------------------------------------------------------------
// landingAmount — a quote is not a payout
// ---------------------------------------------------------------
describe("landingAmount", () => {
  it("takes the fee off what was quoted", () => {
    const l = landingAmount(1_000_000_000_000n, TERMS);
    assert.equal(l.schedule_bps, 100);
    assert.equal(l.withheld, 10_000_000_000n);
    assert.equal(l.lands, 990_000_000_000n);
  });

  it("is strictly less than the quote", () => {
    const l = landingAmount(1_000_000_000_000n, TERMS);
    assert.ok(l.lands < l.quoted_out, "the quote must not be reported as the payout");
    assert.equal(l.quoted_out - l.lands, l.withheld);
  });

  it("names the schedule it used and its epoch", () => {
    const l = landingAmount(1_000_000_000_000n, TERMS);
    assert.equal(l.schedule_epoch, 1039n);
  });

  it("reports what the same exit costs once the announced schedule lands", () => {
    const l = landingAmount(1_000_000_000_000n, TERMS);
    assert.equal(l.pending_bps, 300);
    assert.equal(l.pending_epoch, 1043n);
    assert.equal(l.withheld_after_pending, 30_000_000_000n);
    assert.ok(l.withheld_after_pending > l.withheld);
  });

  it("uses the announced schedule when evaluated at or past its epoch", () => {
    const l = landingAmount(1_000_000_000_000n, TERMS, 1043);
    assert.equal(l.withheld, 30_000_000_000n);
    assert.equal(l.lands, 970_000_000_000n);
    assert.equal(l.pending_bps, null);
  });

  it("costs nothing on a mint with no fee schedule", () => {
    const l = landingAmount(500n, { fee_older: null, fee_newer: null, epoch: 1n });
    assert.equal(l.withheld, 0n);
    assert.equal(l.lands, 500n);
  });
});

// ---------------------------------------------------------------
// exitVerdict — route it, or refuse with a named reason
// ---------------------------------------------------------------
describe("exitVerdict", () => {
  const notional = 1_000_000_000_000n;

  it("routes a healthy exit and reports it as ROUTE", () => {
    const v = exitVerdict(TERMS, QUOTE, notional);
    assert.equal(v.verdict, "ROUTE");
    assert.equal(v.reason, null);
    assert.equal(v.failed_check, null);
  });

  it("reports the landing amount, not the quote, as the outcome", () => {
    const v = exitVerdict(TERMS, QUOTE, notional);
    assert.equal(v.landing.lands, 990_000_000_000n);
    assert.notEqual(v.landing.lands, v.landing.quoted_out);
  });

  it("runs every check and records each one's outcome", () => {
    const v = exitVerdict(TERMS, QUOTE, notional);
    assert.equal(v.checks.length, CHECK_ORDER.length);
    assert.deepEqual(v.checks.map((c) => c.id), CHECK_ORDER);
    assert.ok(v.checks.every((c) => c.passed));
  });

  it("refuses a paused mint with its own code", () => {
    const v = exitVerdict({ ...TERMS, paused: true }, QUOTE, notional);
    assert.equal(v.verdict, "REFUSE");
    assert.equal(v.reason, "mint_paused");
    assert.equal(v.failed_check, "mint_not_paused");
  });

  it("refuses an installed transfer hook", () => {
    const v = exitVerdict({ ...TERMS, transfer_hook_program: "Hook111" }, QUOTE, notional);
    assert.equal(v.reason, "transfer_hook_installed");
  });

  it("refuses when there is no route at all", () => {
    const v = exitVerdict(TERMS, null, notional);
    assert.equal(v.reason, "no_exit_route");
  });

  it("refuses a non Token-2022 mint, because the premise is absent", () => {
    const v = exitVerdict({ ...TERMS, is_token_2022: false }, QUOTE, notional);
    assert.equal(v.reason, "mint_not_token_2022");
  });

  it("refuses when impact exceeds the bound at this size", () => {
    const v = exitVerdict(TERMS, { ...QUOTE, price_impact_bps: 900 }, notional, { max_impact_bps: 300 });
    assert.equal(v.reason, "impact_over_bound");
    assert.equal(v.failed_check, "impact_within_bound");
  });

  it("allows impact exactly at the bound", () => {
    const v = exitVerdict(TERMS, { ...QUOTE, price_impact_bps: 300 }, notional, { max_impact_bps: 300 });
    assert.equal(v.verdict, "ROUTE");
  });

  it("refuses when the fee consumes the position", () => {
    const brutal = { ...TERMS, fee_older: { epoch: 0n, bps: 9000, maximum_fee: U64_MAX }, fee_newer: null };
    const v = exitVerdict(brutal, QUOTE, notional, { max_total_cost_bps: 1000 });
    assert.equal(v.reason, "fee_consumes_position");
  });

  it("first failure wins, in the declared order", () => {
    const v = exitVerdict({ ...TERMS, paused: true, transfer_hook_program: "Hook111" }, null, notional);
    assert.equal(v.reason, "mint_paused");
    // the later failures are still recorded, they just do not become the verdict
    assert.equal(v.checks.find((c) => c.id === "exit_route_exists").passed, false);
  });

  it("carries the round trip, which is dearer than the exit alone", () => {
    const v = exitVerdict(TERMS, QUOTE, notional);
    assert.ok(v.round_trip.total_cost > 0n);
  });

  it("refuses a zero or negative size outright", () => {
    assert.throws(() => exitVerdict(TERMS, QUOTE, 0n), RangeError);
    assert.throws(() => exitVerdict(TERMS, QUOTE, -5n), RangeError);
  });

  it("refuses a non-finite bound rather than silently accepting everything", () => {
    assert.throws(() => exitVerdict(TERMS, QUOTE, notional, { max_impact_bps: NaN }), RangeError);
  });

  it("accepts a raw parsed schedule through the terms record", () => {
    const raw = { ...TERMS, fee_older: { epoch: 1039, transferFeeBasisPoints: 100, maximumFee: "18446744073709551615" } };
    const v = exitVerdict(raw, QUOTE, notional);
    assert.equal(v.landing.withheld, 10_000_000_000n);
  });
});

// ---------------------------------------------------------------
// The gap, stated as a number
// ---------------------------------------------------------------
describe("the gap between quote and payout", () => {
  it("prices the same exit differently once the announced fee lands", () => {
    const notional = 1_000_000_000_000n;
    const now = exitVerdict(TERMS, QUOTE, notional);
    const later = exitVerdict({ ...TERMS, epoch: 1043n }, QUOTE, notional);

    assert.equal(now.verdict, "ROUTE");
    assert.equal(later.verdict, "ROUTE");
    // Same quote, same size, 20,000,000,000 micro-units less to the holder.
    assert.equal(now.landing.lands - later.landing.lands, 20_000_000_000n);
    assert.ok(later.landing.lands < now.landing.lands);
  });

  it("shows the quote overstating the payout by exactly the withheld fee", () => {
    const v = exitVerdict(TERMS, QUOTE, 1_000_000_000_000n);
    const quoted = v.landing.quoted_out;
    const overstated = quoted - v.landing.lands;
    assert.equal(overstated, 10_000_000_000n);
  });
});

// ---------------------------------------------------------------
// routeExit — the cheapest achievable exit, not the nominal best
// ---------------------------------------------------------------
describe("routeExit", () => {
  const notional = 1_000_000_000_000n;

  it("picks the route that lands the most, not the one that quotes the most", () => {
    const r = routeExit([
      { venue: "pool", available: true, out_amount: 1_000_000_000_000n, terms: TERMS, price_impact_bps: 0 },
      {
        venue: "second_issuer",
        available: true,
        out_amount: 998_000_000_000n,
        // same nominal output but no fee extension, so more actually lands
        terms: { ...TERMS, fee_older: null, fee_newer: null, epoch: 1042n },
        price_impact_bps: 0,
      },
    ]);
    assert.equal(r.best.venue, "second_issuer");
    assert.ok(r.best.effective_out > r.routes[0].effective_out);
  });

  it("marks an unavailable route with its reason instead of a zero", () => {
    const r = routeExit([
      { venue: "pool", available: true, out_amount: 1_000_000_000_000n, terms: TERMS, price_impact_bps: 0 },
      { venue: "issuer_redemption", available: false, unavailable_reason: "off_chain" },
    ]);
    assert.equal(r.achievable_count, 1);
    assert.deepEqual(r.unreachable_reasons, [{ venue: "issuer_redemption", reason: "off_chain" }]);
  });

  it("returns no best when nothing is achievable", () => {
    const r = routeExit([
      { venue: "pool", available: false, unavailable_reason: "no_pool" },
      { venue: "issuer_redemption", available: false, unavailable_reason: "off_chain" },
    ]);
    assert.equal(r.best, null);
    assert.equal(r.achievable_count, 0);
    assert.equal(r.unreachable_reasons.length, 2);
  });

  it("never selects a route whose landing amount is zero", () => {
    const r = routeExit([
      {
        venue: "eaten",
        available: true,
        out_amount: 1_000_000_000_000n,
        terms: { ...TERMS, fee_older: { epoch: 0n, bps: 10000, maximum_fee: U64_MAX }, fee_newer: null },
        price_impact_bps: 0,
      },
    ]);
    assert.equal(r.best, null);
  });

  it("includes the fee in the comparison, so a fee-free route wins on cost", () => {
    const r = routeExit([
      { venue: "fee_bearing", available: true, out_amount: 1_000_000_000_000n, terms: TERMS, price_impact_bps: 0 },
      {
        venue: "fee_free",
        available: true,
        out_amount: 995_000_000_000n,
        terms: { ...TERMS, fee_older: null, fee_newer: null, epoch: 1042n },
        price_impact_bps: 0,
      },
    ]);
    assert.equal(r.best.venue, "fee_free");
    assert.equal(r.best.effective_cost_bps, 0);
  });
});
