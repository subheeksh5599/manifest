# Refusals

Four reproducible refusals plus one acceptance, all evaluated against live mainnet state, keyless.

| id | plan file | expected verdict | check_id |
|---|---|---|---|
| accept-baseline-tslax-000 | `docs/refusals/accept-baseline.json` | ACCEPT | none |
| dup-tslax-004 | second run of accept-baseline | REFUSE | idempotency |
| stale-mult-tslax-001 | `docs/refusals/stale-multiplier.json` | REFUSE | multiplier_freshness |
| policy-cap-tslax-002 | `docs/refusals/policy-below-route.json` | REFUSE | policy |
| exit-over-bound-tslax-003 | `docs/refusals/exit-over-bound.json` | REFUSE | exit_at_size |

## Reproduce

```bash
source .venv/bin/activate
rm -f data/tape.jsonl
python3 scripts/preflight.py --plan docs/refusals/accept-baseline.json
python3 scripts/preflight.py --plan docs/refusals/accept-baseline.json      # duplicate
python3 scripts/preflight.py --plan docs/refusals/stale-multiplier.json
python3 scripts/preflight.py --plan docs/refusals/policy-below-route.json
python3 scripts/preflight.py --plan docs/refusals/exit-over-bound.json
python3 scripts/verify_tape.py seal
python3 scripts/verify_tape.py
```

## Raw output

Every run emits a record with the live value that decided it: the current on-chain multiplier for
`multiplier_freshness`, the live route cost bps for `exit_at_size`, the requested size vs cap for
`policy`, and the seen plan id for `idempotency`. Records are appended to `data/tape.jsonl` and
sealed with a canonical digest by `scripts/verify_tape.py seal`. Any hand edit to a sealed record
causes `verify_tape.py` to exit non-zero.
