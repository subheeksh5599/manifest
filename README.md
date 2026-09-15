# MANIFEST

Scheduled tokenized-stock buys on Solana that either fill at a verified price or publicly refuse. Every refusal is a receipt you can verify by re-reading the chain.

## Live status

- What runs: a preflight evaluator that composes a guard instruction plus a keyless Jupiter swap instruction against real Token-2022 issuer mints, then evaluates the composed transaction with `simulateTransaction` over public mainnet RPC.
- Where: the web app is a Next.js 15 App Router deployment. The evaluator is a Python script under `scripts/`. Both read live mainnet state at request time.
- What it reads: Token-2022 extension state (`scaledUiAmountConfig`, `pausableConfig`, `permanentDelegate`, `transferHook`), Jupiter swap-instructions, and the guard's plan registry. No API key. No wallet. No funds.

## Quickstart

```bash
git clone https://github.com/subheeksh5599/manifest.git
cd manifest
cp .env.example .env
# frontend
cd app && npm ci && npm run build
# python evaluator
cd .. && python3 -m venv .venv && source .venv/bin/activate && pip install -r scripts/requirements.txt
python3 scripts/mint_truth.py XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB
python3 scripts/preflight.py --plan docs/refusals/stale-multiplier.json
```

## Invariant

No unit of equity moves unless the trade is provably safe at that instant. When it is not safe, the transaction refuses with a named error and the system publishes why, priced.

## The seven preflight checks

1. Mint identity: plan mint equals canonical issuer mint for that company.
2. Multiplier freshness: plan snapshot equals current on-chain multiplier (Token-2022 Scaled UI Amount).
3. Issuer levers: mint not paused, no active transfer hook, permanent delegate recorded and surfaced.
4. Reference regime: last real print age vs plan tolerance.
5. Exit at size: round-trip cost of the user's own clip vs their bound.
6. Policy: per-user caps for slippage, concentration, per-trade size, daily total.
7. Idempotency: plan id cannot be filled twice.

## Honesty table

| claim | state | evidence |
|---|---|---|
| Event deadline, criteria | REAL | fetched from event page |
| Guard input set readable free from real mints | REAL | `data/mints/TSLAx.json` |
| Guard evaluable with no funds | REAL | `docs/refusals/*.json` |
| Composition against real mints is free | REAL | keyless Jupiter quote + swap-instructions |
| Refusal tape append-only + verifier | REAL | `scripts/verify_tape.py` on `data/tape.jsonl` |
| Real execution on public cluster (mainnet) | DELIBERATELY NOT BUILT | zero-cost constraint; refusals are evaluated against live state and are permanent because they are never broadcast |
| Devnet fill lifecycle | DELIBERATELY NOT BUILT | requires SBF build on runner + funded devnet key; program remains buildable via CI, deploy is one funded key |
| Credit / lending / yield | DELIBERATELY NOT BUILT | one wedge rule; investing only |

## Repo layout

```
program/     native Solana guard program (Rust, host-testable policy)
scripts/     Python truth-layer + preflight evaluator + verifiers
app/         Next.js 15 app (App Router + shadcn/ui)
data/        committed fixtures: mints, registry, tape
docs/        refusals, ablation, evidence, submission
.github/     CI workflows
```

## Verify

```bash
python3 scripts/verify_receipts.py    # re-reads every mint quoted here, non-zero on drift
python3 scripts/verify_tape.py         # non-zero on tape tamper
python3 scripts/adversarial_gate.py    # tampered tape refused, stale mirror detected, dup plan refused, guardless plan accepted
```

## License

MIT.
