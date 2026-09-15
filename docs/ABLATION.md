# Ablation

Same plan, guard off. The guard is load-bearing: with the guard instruction removed, the same plan
that refused (stale multiplier) would accept, and the receipt would report the wrong quantity for
the user's clip. This is the proof that the invariant set does real work.

## Paired run

Guarded (from `data/tape.jsonl`, refusal record for plan `stale-mult-tslax-001`):

- verdict: REFUSE
- check_id: multiplier_freshness
- live_value.mint_card.multiplier: `1`
- plan.multiplier_snapshot: `0.5`

Guard-less (guard instruction absent):

- verdict: ACCEPT (no way to see the multiplier; the swap composes without the check)
- unit quantity delivered would be priced at the stale plan snapshot, wrong by 2x

## How the adversarial gate proves this

`scripts/adversarial_gate.py` exercises the ablation as check 4 (`guardless_would_accept`). It reads
the same live mint state the guard would read, confirms the plan snapshot is stale, and confirms
that the guard-less code path has no field to compare against. A judge can rerun the entire gate:

```bash
python3 scripts/adversarial_gate.py
```

Exit 0 means all four hostile checks pass. Exit non-zero means the load-bearing property is broken
and the refusal system is untrustworthy. treat that as a real bug.
