import { truthCard, type MintCard } from "./rpc";
import { loadRegistry } from "./registry";

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

export type Verdict = {
  verdict: "ACCEPT" | "REFUSE";
  check_id: string | null;
  live: { mint_card: MintCard };
  slot: number;
};

export async function evaluate(plan: Plan): Promise<Verdict> {
  const reg = loadRegistry();
  const entry = reg.find((e) => e.mint === plan.mint);
  const card = await truthCard(plan.mint);

  if (!entry || entry.symbol !== plan.expected_symbol) {
    return { verdict: "REFUSE", check_id: "mint_identity", live: { mint_card: card }, slot: card.slot };
  }
  if (card.multiplier !== Number(plan.multiplier_snapshot)) {
    return { verdict: "REFUSE", check_id: "multiplier_freshness", live: { mint_card: card }, slot: card.slot };
  }
  if (card.paused) {
    return { verdict: "REFUSE", check_id: "issuer_levers", live: { mint_card: card }, slot: card.slot };
  }
  if (card.transfer_hook_program) {
    return { verdict: "REFUSE", check_id: "issuer_levers", live: { mint_card: card }, slot: card.slot };
  }
  if (plan.ref_age_secs > plan.max_ref_age_secs) {
    return { verdict: "REFUSE", check_id: "reference_regime", live: { mint_card: card }, slot: card.slot };
  }
  if (plan.route_cost_bps > plan.exit_bound_bps) {
    return { verdict: "REFUSE", check_id: "exit_at_size", live: { mint_card: card }, slot: card.slot };
  }
  if (plan.requested_size > plan.per_trade_cap) {
    return { verdict: "REFUSE", check_id: "policy", live: { mint_card: card }, slot: card.slot };
  }
  return { verdict: "ACCEPT", check_id: null, live: { mint_card: card }, slot: card.slot };
}
