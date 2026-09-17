// ES module mirror of engine.ts for testing
// Run with: node --test app/lib/engine.test.mjs

// RegistryEntry shape
export function makeEntry(overrides = {}) {
  return {
    mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
    symbol: "TSLAx",
    name: "Tesla xStock",
    decimals: 8,
    slot_read: 447185375,
    permanent_delegate: "5aMNNLQJwAEeoemTEMkv5NVjqKwvvefRYCQ5Z67HFvEq",
    transfer_hook_authority: "5aMNNLQJwAEeoemTEMkv5NVjqKwvvefRYCQ5Z67HFvEq",
    issuer_program: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    ...overrides,
  };
}

export function makeCard(overrides = {}) {
  return {
    symbol: "TSLAx",
    multiplier: 1.0,
    paused: false,
    transfer_hook_program: null,
    slot: 447000000,
    permanent_delegate: "5aMNNLQJwAEeoemTEMkv5NVjqKwvvefRYCQ5Z67HFvEq",
    decimals: 8,
    supply: "100000000",
    ...overrides,
  };
}

export function makePlan(overrides = {}) {
  return {
    plan_id: "test-plan",
    mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
    expected_symbol: "TSLAx",
    multiplier_snapshot: "1.000000",
    ref_age_secs: 30,
    max_ref_age_secs: 300,
    route_cost_bps: 30,
    exit_bound_bps: 100,
    requested_size: 1_000_000,
    per_trade_cap: 5_000_000,
    ...overrides,
  };
}

export const CHECK_ORDER = [
  "mint_identity",
  "multiplier_freshness",
  "issuer_levers",
  "reference_regime",
  "exit_at_size",
  "policy",
];

function assertValidPlan(p) {
  for (const key of ["ref_age_secs", "max_ref_age_secs", "route_cost_bps", "exit_bound_bps", "requested_size", "per_trade_cap"]) {
    const v = p[key];
    if (!Number.isFinite(v) || v < 0) throw new RangeError(`invalid ${key}: ${v}`);
  }
}

export function inspect(plan, entry, card) {
  assertValidPlan(plan);

  /* 1 - mint_identity */
  if (!entry || entry.symbol !== plan.expected_symbol) {
    return { verdict: "REFUSE", check_id: "mint_identity", slot: card.slot };
  }

  /* 2 - multiplier_freshness */
  if (Number(card.multiplier ?? 0) !== Number(plan.multiplier_snapshot)) {
    return { verdict: "REFUSE", check_id: "multiplier_freshness", slot: card.slot };
  }

  /* 3 - issuer_levers */
  if (card.paused) {
    return { verdict: "REFUSE", check_id: "issuer_levers", slot: card.slot };
  }
  if (card.transfer_hook_program) {
    return { verdict: "REFUSE", check_id: "issuer_levers", slot: card.slot };
  }

  /* 4 - reference_regime */
  if (plan.ref_age_secs > plan.max_ref_age_secs) {
    return { verdict: "REFUSE", check_id: "reference_regime", slot: card.slot };
  }

  /* 5 - exit_at_size */
  if (plan.route_cost_bps > plan.exit_bound_bps) {
    return { verdict: "REFUSE", check_id: "exit_at_size", slot: card.slot };
  }

  /* 6 - policy */
  if (plan.requested_size > plan.per_trade_cap) {
    return { verdict: "REFUSE", check_id: "policy", slot: card.slot };
  }

  return { verdict: "ACCEPT", check_id: null, slot: card.slot };
}

export function allChecks(plan, entry, card) {
  const failed = [];
  if (!entry || entry.symbol !== plan.expected_symbol) failed.push("mint_identity");
  if (Number(card.multiplier ?? 0) !== Number(plan.multiplier_snapshot)) failed.push("multiplier_freshness");
  if (card.paused) failed.push("issuer_levers");
  if (card.transfer_hook_program) failed.push("issuer_levers");
  if (plan.ref_age_secs > plan.max_ref_age_secs) failed.push("reference_regime");
  if (plan.route_cost_bps > plan.exit_bound_bps) failed.push("exit_at_size");
  if (plan.requested_size > plan.per_trade_cap) failed.push("policy");
  return failed;
}

export default { inspect, allChecks, makePlan, makeCard, makeEntry, CHECK_ORDER };