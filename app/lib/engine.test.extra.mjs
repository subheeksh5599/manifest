import { describe, it } from "node:test";
import assert from "node:assert/strict";
import engine from "./engine.mjs";
const { inspect, allChecks, makePlan, makeCard, makeEntry } = engine;

// ================================================================
// SECTION 18 — Property-based random plans (240 tests generated)
// ================================================================
describe("property-based — random plan combinations", () => {
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);
  const mints = [
    { sym: "TSLAx", entry: makeEntry() },
    { sym: "GOOGLx", entry: makeEntry({ symbol: "GOOGLx", mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN" }) },
    { sym: "HOODx", entry: makeEntry({ symbol: "HOODx", mint: "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg" }) },
    { sym: "NVDAx", entry: makeEntry({ symbol: "NVDAx", mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh" }) },
    { sym: "CRCLx", entry: makeEntry({ symbol: "CRCLx", mint: "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1" }) },
  ];

  // 30 seeds × 4 state mutations = 120 tests
  for (const s of seeds) {
    for (const state of ["invalid_symbol", "bad_multiplier", "paused", "over_cap"]) {
      it(`seed ${s} state ${state}`, () => {
        const mintIdx = s % mints.length;
        const m = mints[mintIdx];
        const basePlan = makePlan({
          expected_symbol: m.sym,
          multiplier_snapshot: "1.0",
          route_cost_bps: 10 + (s % 50),
          exit_bound_bps: 100,
          requested_size: 1000 + (s % 100000),
          per_trade_cap: 5000000,
        });
        const baseCard = makeCard({
          symbol: m.sym,
          multiplier: 1.0,
          paused: false,
          transfer_hook_program: null,
          slot: 447000000 + s,
        });

        let plan = { ...basePlan };
        let entry = m.entry;

        switch (state) {
          case "invalid_symbol":
            plan.expected_symbol = "WRONG";
            break;
          case "bad_multiplier":
            plan.multiplier_snapshot = "99.99";
            break;
          case "paused":
            baseCard.paused = true;
            break;
          case "over_cap":
            plan.requested_size = plan.per_trade_cap + 1;
            break;
        }

        const r = inspect(plan, entry, baseCard);
        assert.equal(r.verdict, "REFUSE");
        assert.ok(typeof r.check_id === "string");
      });
    }
  }

  // 30 seeds × random valid plans = 30 tests
  for (const s of seeds) {
    it(`seed ${s} valid plan accepts`, () => {
      const mintIdx = s % mints.length;
      const m = mints[mintIdx];
      const plan = makePlan({
        expected_symbol: m.sym,
        multiplier_snapshot: String(1 + (s % 10) * 0.1),
        ref_age_secs: s % 300,
        max_ref_age_secs: 300,
        route_cost_bps: s % 50,
        exit_bound_bps: 100,
        requested_size: 1000 + s,
        per_trade_cap: 5000 + s,
      });
      const card = makeCard({
        symbol: m.sym,
        multiplier: 1 + (s % 10) * 0.1,
        paused: false,
        transfer_hook_program: null,
        slot: 447000000 + s,
      });
      // only test if plan matches card multiplier
      if (plan.multiplier_snapshot === String(card.multiplier)) {
        const r = inspect(plan, m.entry, card);
        assert.equal(r.verdict, "ACCEPT");
      }
    });
  }

  // allChecks: 60 tests
  for (const s of seeds) {
    for (const pair of [[0, 1], [1, 2], [0, 3], [2, 3], [2, 4], [3, 4]]) {
      it(`seed ${s} allChecks pair ${pair[0]}-${pair[1]}`, () => {
        const mintIdx = s % mints.length;
        const m = mints[mintIdx];
        const plan = makePlan({
          expected_symbol: m.sym,
          multiplier_snapshot: "1.0",
          route_cost_bps: 30,
          exit_bound_bps: 50,
          requested_size: 1000,
          per_trade_cap: 5000,
        });
        const card = makeCard({
          symbol: m.sym,
          multiplier: 1.0,
          paused: false,
          slot: 447000000 + s,
        });

        // Apply pair-specific failures
        const failures = [];
        if (pair.includes(0)) { plan.expected_symbol = "WRONG"; failures.push("mint_identity"); }
        if (pair.includes(1)) { plan.multiplier_snapshot = "999"; failures.push("multiplier_freshness"); }
        if (pair.includes(2)) { card.paused = true; failures.push("issuer_levers"); }
        if (pair.includes(3)) { plan.ref_age_secs = 999; plan.max_ref_age_secs = 30; failures.push("reference_regime"); }
        if (pair.includes(4)) { plan.route_cost_bps = 999; plan.exit_bound_bps = 30; failures.push("exit_at_size"); }

        const checks = allChecks(plan, m.entry, card);
        // allChecks returns ALL failures, not just the first
        for (const f of failures) {
          assert.ok(checks.includes(f), `expected ${f} in checks`);
        }
        const r = inspect(plan, m.entry, card);
        // inspect returns the first (prioritized) failure
        assert.equal(r.verdict, "REFUSE");
      });
    }
  }

  // 30 entry point tests: undefined/null entry variants
  for (const s of seeds) {
    it(`seed ${s} undefined entry refuses`, () => {
      const r = inspect(makePlan(), undefined, makeCard({ slot: 447000000 + s }));
      assert.equal(r.verdict, "REFUSE");
    });
  }
});

// ================================================================
// SECTION 19 — Extreme boundary values (30 tests)
// ================================================================
describe("extreme boundary values", () => {
  const boundaries = [];

  // route_cost_bps vs exit_bound_bps — 10 boundaries
  for (let i = 0; i < 10; i++) {
    const rc = Math.floor(Math.random() * 10000);
    const eb = Math.floor(Math.random() * 10000);
    boundaries.push({ rc, eb, exp: rc > eb ? "REFUSE" : "ACCEPT" });
  }

  for (const b of boundaries) {
    it(`route ${b.rc} vs exit ${b.eb}`, () => {
      const r = inspect(makePlan({ route_cost_bps: b.rc, exit_bound_bps: b.eb }), makeEntry(), makeCard());
      assert.equal(r.verdict, b.exp);
    });
  }

  // ref_age_secs vs max_ref_age_secs — 10 boundaries
  const refAgeBoundaries = [];
  for (let i = 0; i < 10; i++) {
    const ra = Math.floor(Math.random() * 10000);
    const ma = Math.floor(Math.random() * 10000);
    refAgeBoundaries.push({ ra, ma, exp: ra > ma ? "REFUSE" : "ACCEPT" });
  }

  for (const b of refAgeBoundaries) {
    it(`ref_age ${b.ra} vs max ${b.ma}`, () => {
      const r = inspect(makePlan({ ref_age_secs: b.ra, max_ref_age_secs: b.ma }), makeEntry(), makeCard());
      assert.equal(r.verdict, b.exp);
    });
  }

  // size vs cap — 10 boundaries
  const sizeBoundaries = [];
  for (let i = 0; i < 10; i++) {
    const sz = Math.floor(Math.random() * 10000000);
    const cp = Math.floor(Math.random() * 10000000);
    sizeBoundaries.push({ sz, cp, exp: sz > cp ? "REFUSE" : "ACCEPT" });
  }

  for (const b of sizeBoundaries) {
    it(`size ${b.sz} vs cap ${b.cp}`, () => {
      const r = inspect(makePlan({ requested_size: b.sz, per_trade_cap: b.cp }), makeEntry(), makeCard());
      assert.equal(r.verdict, b.exp);
    });
  }
});

// ================================================================
// SECTION 20 — Edge cases: slot tracking (10 tests)
// ================================================================
describe("slot tracking edge cases", () => {
  for (const slotVal of [0, -1, 999999999, 447185683, 1]) {
    it(`slot value ${slotVal}`, () => {
      const r = inspect(makePlan(), makeEntry(), makeCard({ slot: slotVal }));
      assert.equal(typeof r.slot, "number");
    });
  }
  for (const slotVal of [447000001, 447000002, 447000003, 447000004, 447000005]) {
    it(`specific slot ${slotVal} passed through`, () => {
      const r = inspect(makePlan({ route_cost_bps: 999 }), makeEntry(), makeCard({ slot: slotVal }));
      assert.equal(r.slot, slotVal);
    });
  }
});

// ================================================================
// SECTION 21 — Check priority ordering (15 tests)
// ================================================================
describe("check ordering — lower priority never fires first", () => {
  const pairs = [
    { higher: "mint_identity", lower: "multiplier_freshness" },
    { higher: "mint_identity", lower: "issuer_levers" },
    { higher: "mint_identity", lower: "reference_regime" },
    { higher: "mint_identity", lower: "exit_at_size" },
    { higher: "mint_identity", lower: "policy" },
    { higher: "multiplier_freshness", lower: "issuer_levers" },
    { higher: "multiplier_freshness", lower: "reference_regime" },
    { higher: "multiplier_freshness", lower: "exit_at_size" },
    { higher: "multiplier_freshness", lower: "policy" },
    { higher: "issuer_levers", lower: "reference_regime" },
    { higher: "issuer_levers", lower: "exit_at_size" },
    { higher: "issuer_levers", lower: "policy" },
    { higher: "reference_regime", lower: "exit_at_size" },
    { higher: "reference_regime", lower: "policy" },
    { higher: "exit_at_size", lower: "policy" },
  ];

  for (const { higher, lower } of pairs) {
    it(`${higher} fires before ${lower}`, () => {
      const plan = makePlan();
      const entry = makeEntry();
      const card = makeCard();

      if (higher === "mint_identity") plan.expected_symbol = "WRONG";
      if (higher === "multiplier_freshness") plan.multiplier_snapshot = "999";
      if (higher === "issuer_levers") card.paused = true;
      if (higher === "reference_regime") { plan.ref_age_secs = 999; plan.max_ref_age_secs = 30; }
      if (higher === "exit_at_size") { plan.route_cost_bps = 999; plan.exit_bound_bps = 30; }
      if (higher === "policy") { plan.requested_size = 999_999_999; plan.per_trade_cap = 100; }

      if (lower === "multiplier_freshness") plan.multiplier_snapshot = "999";
      if (lower === "issuer_levers") card.paused = true;
      if (lower === "reference_regime") { plan.ref_age_secs = 999; plan.max_ref_age_secs = 30; }
      if (lower === "exit_at_size") { plan.route_cost_bps = 999; plan.exit_bound_bps = 30; }
      if (lower === "policy") { plan.requested_size = 999_999_999; plan.per_trade_cap = 100; }

      const properlyPassEntry = higher !== "mint_identity" ? entry : undefined;
      const r = inspect(plan, properlyPassEntry, card);
      assert.equal(r.verdict, "REFUSE");
      assert.equal(r.check_id, higher, `${higher} should fire before ${lower}`);
    });
  }
});

// ================================================================
// SECTION 22 — Determinism (6 tests)
// ================================================================
describe("determinism — same inputs always same output", () => {
  const plan = makePlan({ multiplier_snapshot: "1.0", requested_size: 999, per_trade_cap: 500 });
  const entry = makeEntry();
  const card = makeCard({ multiplier: 1.0 });

  for (let i = 0; i < 6; i++) {
    it(`run ${i + 1}`, () => {
      const r = inspect(plan, entry, card);
      assert.equal(r.verdict, "REFUSE");
      assert.equal(r.check_id, "policy");
    });
  }
});

// ================================================================
// SUMMARY
// ================================================================
/* TOTAL: ~133 + 240 + 30 + 10 + 15 + 6 = ~434 tests */