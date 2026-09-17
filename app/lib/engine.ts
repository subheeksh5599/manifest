import type { RegistryEntry } from "./registry";

export type Plan = {
  plan_id: string;
  mint: string;
  expected_symbol: string;
  multiplier_snapshot: string;
  ref_age_secs: number;
  max_ref_age_secs: number;
  route_cost_bps: number;
  exit_bound_bps: number;
  requested_size: number;
  per_trade_cap: number;
};

export type MintCardFrozen = {
  symbol: string;
  multiplier: number;
  paused: boolean;
  transfer_hook_program: string | null;
  slot: number;
  permanent_delegate: string;
  decimals: number;
  supply: string;
};

export type Verdict = {
  verdict: "ACCEPT" | "REFUSE";
  check_id: string | null;
  slot: number;
};

/**
 * Pure evaluation of a plan against known registry state and a mint snapshot.
 * No I/O, no network, no mocks needed — pure function.
 *
 * Returns the verdict and which check_id tripped (null = ACCEPT).
 *
 * Order of checks (first-to-trip wins):
 *   1. mint_identity       — registry entry not found or symbol mismatch
 *   2. multiplier_freshness — snapshot value != live multiplier
 *   3. issuer_levers        — paused or transfer_hook_program is set
 *   4. reference_regime     — ref_age > max_ref_age
 *   5. exit_at_size         — route cost > exit bound
 *   6. policy               — requested size > per-trade cap
 */
export function inspect(
  plan: Plan,
  entry: RegistryEntry | undefined,
  card: MintCardFrozen,
): Verdict {
  assertValidPlan(plan);

  /* 1 — mint_identity */
  if (!entry || entry.symbol !== plan.expected_symbol) {
    return { verdict: "REFUSE", check_id: "mint_identity", slot: card.slot };
  }

  /* 2 — multiplier_freshness */
  if (Number(card.multiplier ?? 0) !== Number(plan.multiplier_snapshot)) {
    return { verdict: "REFUSE", check_id: "multiplier_freshness", slot: card.slot };
  }

  /* 3 — issuer_levers */
  if (card.paused) {
    return { verdict: "REFUSE", check_id: "issuer_levers", slot: card.slot };
  }
  if (card.transfer_hook_program) {
    return { verdict: "REFUSE", check_id: "issuer_levers", slot: card.slot };
  }

  /* 4 — reference_regime */
  if (plan.ref_age_secs > plan.max_ref_age_secs) {
    return { verdict: "REFUSE", check_id: "reference_regime", slot: card.slot };
  }

  /* 5 — exit_at_size */
  if (plan.route_cost_bps > plan.exit_bound_bps) {
    return { verdict: "REFUSE", check_id: "exit_at_size", slot: card.slot };
  }

  /* 6 — policy */
  if (plan.requested_size > plan.per_trade_cap) {
    return { verdict: "REFUSE", check_id: "policy", slot: card.slot };
  }

  return { verdict: "ACCEPT", check_id: null, slot: card.slot };
}

/**
 * Check names in order of priority.
 */
export const CHECK_ORDER = [
  "mint_identity",
  "multiplier_freshness",
  "issuer_levers",
  "reference_regime",
  "exit_at_size",
  "policy",
] as const;
export type CheckId = (typeof CHECK_ORDER)[number];

/**
 * Return every check that would trip for the given inputs (0-length = ACCEPT).
 */
export function allChecks(
  plan: Plan,
  entry: RegistryEntry | undefined,
  card: MintCardFrozen,
): CheckId[] {
  const failed: CheckId[] = [];

  if (!entry || entry.symbol !== plan.expected_symbol) failed.push("mint_identity");
  if (String(card.multiplier) !== String(plan.multiplier_snapshot)) failed.push("multiplier_freshness");
  if (card.paused) failed.push("issuer_levers");
  if (card.transfer_hook_program) failed.push("issuer_levers");
  if (plan.ref_age_secs > plan.max_ref_age_secs) failed.push("reference_regime");
  if (plan.route_cost_bps > plan.exit_bound_bps) failed.push("exit_at_size");
  if (plan.requested_size > plan.per_trade_cap) failed.push("policy");

  return failed;
}

/* ── helpers ── */

function assertValidPlan(p: Plan): void {
  if (!Number.isFinite(p.ref_age_secs) || p.ref_age_secs < 0) throw new RangeError("invalid ref_age_secs");
  if (!Number.isFinite(p.max_ref_age_secs) || p.max_ref_age_secs < 0) throw new RangeError("invalid max_ref_age_secs");
  if (!Number.isFinite(p.route_cost_bps) || p.route_cost_bps < 0) throw new RangeError("invalid route_cost_bps");
  if (!Number.isFinite(p.exit_bound_bps) || p.exit_bound_bps < 0) throw new RangeError("invalid exit_bound_bps");
  if (!Number.isFinite(p.requested_size) || p.requested_size < 0) throw new RangeError("invalid requested_size");
  if (!Number.isFinite(p.per_trade_cap) || p.per_trade_cap < 0) throw new RangeError("invalid per_trade_cap");
}

/* ── Factory for quick test objects ── */

export function makePlan(overrides: Partial<Plan> = {}): Plan {
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

export function makeEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
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

export function makeCard(overrides: Partial<MintCardFrozen> = {}): MintCardFrozen {
  return {
    symbol: "TSLAx",
    multiplier: 1.0,
    paused: false,
    transfer_hook_program: null,
    slot: 447185683,
    permanent_delegate: "5aMNNLQJwAEeoemTEMkv5NVjqKwvvefRYCQ5Z67HFvEq",
    decimals: 8,
    supply: "50000000",
    ...overrides,
  };
}