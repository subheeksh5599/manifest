/**
 * The exit engine, proven across the domain.
 *
 * The claim under test: nothing is reported as worth X unless X lands at the
 * exit, at size, today. Every case below is an invariant about that claim.
 *
 *   node --test app/lib/exit-engine.matrix.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { U64_MAX, feeFor } from "./exit-terms.mjs";
import { CHECK_ORDER, REFUSAL_CODES, landingAmount, exitVerdict, routeExit } from "./exit-engine.mjs";

const QUOTED = 1000000000n;

/** A mint whose fee will triple at epoch 1043. */
function terms(over = {}) {
  return {
    mint: "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB",
    symbol: "ANDURIL",
    is_token_2022: true,
    paused: false,
    transfer_hook_program: null,
    epoch: 1042,
    fee_older: { epoch: 1039, bps: 100, maximum_fee: U64_MAX },
    fee_newer: { epoch: 1043, bps: 300, maximum_fee: U64_MAX },
    ...over,
  };
}

const quote = (out = QUOTED, impact = 0) => ({
  venue: "pool",
  available: true,
  out_amount: out.toString(),
  price_impact_bps: impact,
});

/* ------------------------------------------------------------------ */
/* What lands                                                          */
/* ------------------------------------------------------------------ */

const LANDING_BPS = [0, 1, 10, 25, 50, 100, 200, 300, 500, 1000];
const LANDING_QUOTES = [1000000n, 100000000n, 1000000000n, 100000000000n, 1000000000000n];

describe("landing is the quote minus the mint's cut", () => {
  for (const bps of LANDING_BPS) {
    for (const quoted of LANDING_QUOTES) {
      it(`${bps} bps on a quote of ${quoted}`, () => {
        const t = terms({ fee_older: { epoch: 1039, bps, maximum_fee: U64_MAX }, fee_newer: null });
        const l = landingAmount(quoted, t);
        assert.equal(l.quoted_out, quoted);
        assert.equal(l.withheld, feeFor(quoted, { bps, maximum_fee: U64_MAX }));
        assert.equal(l.lands, quoted - l.withheld);
        assert.equal(l.schedule_bps, bps);
        // What lands can never exceed what was quoted.
        assert.ok(l.lands <= l.quoted_out);
      });
    }
  }

  it("a quote with no fee lands in full", () => {
    const l = landingAmount(QUOTED, terms({ fee_older: null, fee_newer: null }));
    assert.equal(l.withheld, 0n);
    assert.equal(l.lands, QUOTED);
    assert.equal(l.schedule_bps, 0);
  });

  it("uses the schedule in force at the epoch it was read at", () => {
    const l = landingAmount(QUOTED, terms());
    assert.equal(l.schedule_bps, 100);
    assert.equal(l.schedule_epoch, 1039n);
    assert.equal(l.withheld, 10000000n);
    assert.equal(l.lands, 990000000n);
  });

  it("reports what the same exit costs once the announcement lands", () => {
    const l = landingAmount(QUOTED, terms());
    assert.equal(l.pending_bps, 300);
    assert.equal(l.pending_epoch, 1043n);
    assert.equal(l.withheld_after_pending, 30000000n);
    assert.ok(l.withheld_after_pending > l.withheld);
  });

  it("reports no pending cost when nothing is scheduled", () => {
    const l = landingAmount(QUOTED, terms({ fee_newer: null }));
    assert.equal(l.pending_bps, null);
    assert.equal(l.withheld_after_pending, null);
  });

  it("a capped schedule withholds only the cap", () => {
    const t = terms({ fee_older: { epoch: 1039, bps: 100, maximum_fee: 12345n }, fee_newer: null });
    const l = landingAmount(QUOTED, t);
    assert.equal(l.withheld, 12345n);
    assert.equal(l.lands, QUOTED - 12345n);
  });

  it("takes an explicit epoch over the one on the record", () => {
    const now = landingAmount(QUOTED, terms(), 1042);
    const later = landingAmount(QUOTED, terms(), 1043);
    assert.equal(now.schedule_bps, 100);
    assert.equal(later.schedule_bps, 300);
    assert.ok(later.lands < now.lands);
  });
});

/* ------------------------------------------------------------------ */
/* The verdict                                                         */
/* ------------------------------------------------------------------ */

function onlyFailing(over) {
  const v = exitVerdict(terms(over.terms), over.quote ?? quote(), QUOTED, over.bounds);
  return v;
}

describe("the verdict refuses with a name", () => {
  it("routes when every check passes", () => {
    const v = exitVerdict(terms(), quote(), QUOTED);
    assert.equal(v.verdict, "ROUTE");
    assert.equal(v.reason, null);
    assert.equal(v.failed_check, null);
    assert.equal(v.checks.length, CHECK_ORDER.length);
  });

  it("runs the checks in a published order", () => {
    const v = exitVerdict(terms(), quote(), QUOTED);
    assert.deepEqual(v.checks.map((c) => c.id), CHECK_ORDER);
  });

  it("refuses a classic-token mint", () => {
    const v = onlyFailing({ terms: { is_token_2022: false } });
    assert.equal(v.verdict, "REFUSE");
    assert.equal(v.failed_check, "mint_is_token_2022");
    assert.equal(v.reason, "mint_not_token_2022");
  });

  it("refuses a paused mint", () => {
    const v = onlyFailing({ terms: { paused: true } });
    assert.equal(v.failed_check, "mint_not_paused");
    assert.equal(v.reason, "mint_paused");
  });

  it("refuses a mint with a transfer hook installed", () => {
    const v = onlyFailing({ terms: { transfer_hook_program: "Hook1111111111111111111111111111111111111" } });
    assert.equal(v.failed_check, "no_transfer_hook_program");
    assert.equal(v.reason, "transfer_hook_installed");
  });

  it("refuses when no route exists at any price", () => {
    const v = exitVerdict(terms(), null, QUOTED);
    assert.equal(v.failed_check, "exit_route_exists");
    assert.equal(v.reason, "no_exit_route");
    assert.equal(v.landing, null);
  });

  it("refuses when the impact exceeds the bound", () => {
    const v = exitVerdict(terms(), quote(QUOTED, 301), QUOTED, { max_impact_bps: 300 });
    assert.equal(v.failed_check, "impact_within_bound");
    assert.equal(v.reason, "impact_over_bound");
  });

  it("refuses when the fee consumes the position", () => {
    const t = terms({ fee_older: { epoch: 1039, bps: 1500, maximum_fee: U64_MAX }, fee_newer: null });
    const v = exitVerdict(t, quote(), QUOTED, { max_total_cost_bps: 1000 });
    assert.equal(v.failed_check, "fee_does_not_consume_position");
    assert.equal(v.reason, "fee_consumes_position");
  });

  it("every refusal code is named, and none is left blank", () => {
    for (const id of CHECK_ORDER) {
      const code = REFUSAL_CODES[id];
      assert.equal(typeof code, "string");
      assert.ok(code.length > 0);
      assert.notEqual(code, id);
    }
  });

  it("a refusal carries the value that tripped it", () => {
    const v = exitVerdict(terms(), quote(QUOTED, 900), QUOTED, { max_impact_bps: 300 });
    const failed = v.checks.find((c) => c.id === "impact_within_bound");
    assert.equal(failed.value, 900);
    assert.equal(failed.detail.max_impact_bps, 300);
  });

  it("a passing check carries no refusal code", () => {
    const v = exitVerdict(terms(), quote(), QUOTED);
    for (const c of v.checks) assert.equal(c.refusal, null);
  });
});

describe("a boundary is inclusive where it should be", () => {
  it("impact exactly at the bound passes", () => {
    const v = exitVerdict(terms(), quote(QUOTED, 300), QUOTED, { max_impact_bps: 300 });
    assert.equal(v.verdict, "ROUTE");
  });

  it("one basis point over the bound fails", () => {
    const v = exitVerdict(terms(), quote(QUOTED, 301), QUOTED, { max_impact_bps: 300 });
    assert.equal(v.verdict, "REFUSE");
  });

  it("total cost exactly at the bound passes", () => {
    const t = terms({ fee_older: { epoch: 1039, bps: 1000, maximum_fee: U64_MAX }, fee_newer: null });
    const v = exitVerdict(t, quote(), QUOTED, { max_total_cost_bps: 1000 });
    assert.equal(v.verdict, "ROUTE");
  });

  it("total cost one basis point over the bound fails", () => {
    const t = terms({ fee_older: { epoch: 1039, bps: 1001, maximum_fee: U64_MAX }, fee_newer: null });
    const v = exitVerdict(t, quote(), QUOTED, { max_total_cost_bps: 1000 });
    assert.equal(v.verdict, "REFUSE");
  });

  it("defaults the bounds when none are given", () => {
    const t = terms({ fee_older: { epoch: 1039, bps: 100, maximum_fee: U64_MAX }, fee_newer: null });
    assert.equal(exitVerdict(t, quote(), QUOTED).verdict, "ROUTE");
    const heavy = terms({ fee_older: { epoch: 1039, bps: 2000, maximum_fee: U64_MAX }, fee_newer: null });
    assert.equal(exitVerdict(heavy, quote(), QUOTED).verdict, "REFUSE");
  });

  it("rejects a notional of zero rather than dividing by it", () => {
    assert.throws(() => exitVerdict(terms(), quote(), 0n), /positive/);
  });

  it("rejects a negative bound rather than treating it as lenient", () => {
    assert.throws(() => exitVerdict(terms(), quote(), QUOTED, { max_impact_bps: -1 }), /negative/);
  });

  it("rejects a non-finite bound", () => {
    assert.throws(() => exitVerdict(terms(), quote(), QUOTED, { max_impact_bps: NaN }), /finite/);
    assert.throws(() => exitVerdict(terms(), quote(), QUOTED, { max_total_cost_bps: Infinity }), /finite/);
  });

  it("is deterministic for the same inputs", () => {
    const a = exitVerdict(terms(), quote(), QUOTED);
    const b = exitVerdict(terms(), quote(), QUOTED);
    assert.deepEqual(
      JSON.parse(JSON.stringify(a, (k, v) => (typeof v === "bigint" ? v.toString() : v))),
      JSON.parse(JSON.stringify(b, (k, v) => (typeof v === "bigint" ? v.toString() : v)))
    );
  });
});

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

const pool = (out = QUOTED, impact = 0) => ({ venue: "pool", available: true, out_amount: out.toString(), price_impact_bps: impact });
const secondIssuer = { venue: "second_issuer", available: false, unavailable_reason: "no_second_issuer_observed" };
const redemption = { venue: "issuer_redemption", available: false, unavailable_reason: "off_chain_redemption_not_executable" };

describe("routing compares what lands, not what is quoted", () => {
  it("prices the mint's fee even when the route does not carry the terms", () => {
    // Regression: the terms live on the mint, not on the route. A caller that
    // omitted them made the best route report a full payout while the verdict
    // on the same page reported a withheld fee.
    const t = terms();
    const r = routeExit([pool()], { terms: t, epoch: t.epoch });
    assert.equal(r.routes[0].landing.schedule_bps, 100);
    assert.equal(r.routes[0].landing.withheld, 10000000n);
    assert.equal(r.routes[0].landing.lands, 990000000n);
    assert.notEqual(r.routes[0].landing.lands, r.routes[0].landing.quoted_out);
  });

  it("agrees with the verdict about what lands", () => {
    const t = terms();
    const q = quote();
    const verdict = exitVerdict(t, q, QUOTED);
    const routed = routeExit([q], { terms: t, epoch: t.epoch });
    assert.equal(routed.best.landing.lands, verdict.landing.lands);
    assert.equal(routed.routes[0].landing.lands, verdict.landing.lands);
  });

  it("lets a route override the shared terms when it carries its own", () => {
    const t = terms();
    const free = { ...pool(), terms: { fee_older: null, fee_newer: null }, epoch: t.epoch };
    const r = routeExit([free], { terms: t, epoch: t.epoch });
    assert.equal(r.routes[0].landing.schedule_bps, 0);
    assert.equal(r.routes[0].landing.lands, QUOTED);
  });

  it("prices an announced increase into the route too", () => {
    const t = terms();
    const r = routeExit([pool()], { terms: t, epoch: 1043 });
    assert.equal(r.routes[0].landing.schedule_bps, 300);
    assert.equal(r.routes[0].achievable_now, true);
  });

  it("marks an unavailable route as not achievable, with a reason", () => {
    const r = routeExit([pool(), secondIssuer, redemption], { terms: terms(), epoch: 1042 });
    const off = r.routes.filter((x) => !x.achievable_now);
    assert.equal(off.length, 2);
    for (const x of off) {
      assert.equal(x.lands, null);
      assert.ok(x.unavailable_reason.length > 0);
    }
  });

  it("names every unreachable route rather than dropping it", () => {
    const r = routeExit([pool(), secondIssuer, redemption], { terms: terms(), epoch: 1042 });
    const venues = r.unreachable_reasons.map((x) => x.venue).sort();
    assert.deepEqual(venues, ["issuer_redemption", "second_issuer"]);
  });

  it("never counts an unachievable route as achievable", () => {
    const r = routeExit([pool(), secondIssuer, redemption], { terms: terms(), epoch: 1042 });
    assert.equal(r.achievable_count, 1);
  });

  it("picks the best achievable route by what lands", () => {
    const t = terms();
    const worse = { ...pool(900000000n), venue: "pool" };
    const better = { venue: "second_issuer", available: true, out_amount: "1200000000", price_impact_bps: 0 };
    const r = routeExit([worse, better], { terms: t, epoch: t.epoch });
    assert.equal(r.best.venue, "second_issuer");
    assert.equal(r.achievable_count, 2);
  });

  it("does not let a high quote with a punishing fee win", () => {
    // The larger quote is charged the fee, the smaller one is free. What lands
    // is what decides.
    const t = terms({ fee_older: { epoch: 1039, bps: 5000, maximum_fee: U64_MAX }, fee_newer: null });
    const taxed = { venue: "pool", available: true, out_amount: "1100000000", price_impact_bps: 0 };
    const free = { venue: "second_issuer", available: true, out_amount: "1000000000", price_impact_bps: 0, terms: { fee_older: null, fee_newer: null } };
    const r = routeExit([taxed, free], { terms: t, epoch: t.epoch });
    assert.equal(r.best.venue, "second_issuer");
    assert.ok(r.best.landing.lands > r.routes[0].landing.lands);
  });

  it("is independent of the order routes are given in", () => {
    const t = terms();
    const a = { venue: "pool", available: true, out_amount: "1000000000", price_impact_bps: 0 };
    const b = { venue: "second_issuer", available: true, out_amount: "1200000000", price_impact_bps: 0 };
    const forward = routeExit([a, b], { terms: t, epoch: t.epoch });
    const backward = routeExit([b, a], { terms: t, epoch: t.epoch });
    assert.equal(forward.best.venue, backward.best.venue);
    assert.equal(forward.best.effective_out, backward.best.effective_out);
  });

  it("reports no best route when nothing is achievable", () => {
    const r = routeExit([secondIssuer, redemption], { terms: terms(), epoch: 1042 });
    assert.equal(r.best, null);
    assert.equal(r.achievable_count, 0);
    assert.equal(r.unreachable_reasons.length, 2);
  });

  it("counts the impact into the effective cost", () => {
    const r = routeExit([pool(QUOTED, 250)], { terms: terms({ fee_older: null, fee_newer: null }), epoch: 1042 });
    assert.equal(r.routes[0].effective_cost_bps, 250);
  });

  it("adds the fee and the impact into one comparable number", () => {
    const t = terms();
    const r = routeExit([pool(QUOTED, 0)], { terms: t, epoch: t.epoch });
    // 100 bps withheld, 0 bps impact.
    assert.equal(r.routes[0].effective_cost_bps, 100);
    assert.equal(r.routes[0].effective_out, 990000000n);
  });

  it("handles an empty route list without inventing one", () => {
    const r = routeExit([], { terms: terms(), epoch: 1042 });
    assert.equal(r.best, null);
    assert.equal(r.routes.length, 0);
    assert.equal(r.achievable_count, 0);
  });

  it("still prices a route when no context and no terms are supplied", () => {
    // Documented degradation: no terms means no fee to apply, not a crash.
    const r = routeExit([pool()], {});
    assert.equal(r.routes[0].landing.schedule_bps, 0);
    assert.equal(r.routes[0].landing.lands, QUOTED);
  });
});
