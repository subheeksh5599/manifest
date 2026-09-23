# Manifest

[![Live](https://img.shields.io/badge/demo-live-145FE4?style=flat-square)](https://manifest-mocha-six.vercel.app)
[![Tests](https://img.shields.io/badge/tests-554%20passing-2E7D32?style=flat-square)](https://github.com/subheeksh5599/manifest)
[![License](https://img.shields.io/badge/license-MIT-303136?style=flat-square)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-Token--2022-9945FF?style=flat-square)](https://solana.com)
[![Program](https://img.shields.io/badge/devnet-deployed-14F195?style=flat-square)](https://explorer.solana.com/address/pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA?cluster=devnet)

A recurring buy that fills at a verified price, or refuses on-chain. Manifest schedules purchases of tokenized equities on Solana. Every plan is checked against live Token-2022 extension state at the moment of the trade. When a check fails, the transaction never leaves your machine and the refusal is published as a receipt anyone can re-verify by re-reading the chain.

## What it does

Manifest evaluates preflight plans against real Solana mainnet Token-2022 issuer mints. Seven invariants are checked against live state at request time.

| Surface | Link |
|---|---|
| Plan builder | https://manifest-mocha-six.vercel.app/plan |
| Refusal tape | https://manifest-mocha-six.vercel.app/tape |
| Mint truth cards | https://manifest-mocha-six.vercel.app/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB |
| Evidence pack | https://manifest-mocha-six.vercel.app/evidence |
| Market prices | https://manifest-mocha-six.vercel.app |

## How it works

```
Plan (7 bounds) -> inspect() -> 6 invariant checks -> ACCEPT | REFUSE
```

Checks run in priority order. First failure wins:

| # | Check | Condition |
|---|---|---|
| 1 | mint_identity | Registry entry exists and symbol matches plan |
| 2 | multiplier_freshness | Plan multiplier snapshot == live card multiplier (numeric) |
| 3 | issuer_levers | Mint not paused and no transfer hook program |
| 4 | reference_regime | ref_age_secs <= max_ref_age_secs |
| 5 | exit_at_size | route_cost_bps <= exit_bound_bps |
| 6 | policy | requested_size <= per_trade_cap |

## On-chain program (devnet)

Program ID: `pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA`

The Anchor program enforces preflight invariants on-chain. Four instructions:

| Instruction | What it does |
|---|---|
| `create_plan` | Creates a PDA-bound plan with mint, amount, slippage, multiplier snapshot |
| `preflight` | Reads Token-2022 extension state from the mint, checks pausable/transfer_hook/multiplier, reverts on failure |
| `record_fill` | Records a successful fill against a Ready plan |
| `record_refusal` | Writes a permanent refusal receipt with reason code and the live value that tripped it |

Explorer links:
- [Program](https://explorer.solana.com/address/pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA?cluster=devnet)
- [Plan (filled)](https://explorer.solana.com/address/rDt5XPbutXYPtMgox2AGepKGtDVvBkuhaHiCgU3oxh3?cluster=devnet)
- [Fill receipt](https://explorer.solana.com/address/67t8p3KmxtNnyc21LCwABvpy4kQsroN2JvoCm8f3ESsA?cluster=devnet)
- [Refusal receipt](https://explorer.solana.com/address/7hBCzAdqrsNUmQ4VGEvvHjjSGMurQARVB5emjbYHVmsj?cluster=devnet)

## Quickstart

```bash
git clone https://github.com/subheeksh5599/manifest.git
cd manifest/app
npm install
npm run build
node --test lib/engine.test.mjs lib/engine.test.extra.mjs
```

### Run devnet tests

```bash
cd manifest
source .venv/bin/activate
python3 scripts/devnet_full_test.py
```

## Proof -- 554 tests, 0 failures

```
i tests 554
i pass  554
i fail  0
```

| Suite | Count | Coverage |
|---|---|---|
| engine.test.mjs | 133 | 6 individual invariants, boundary values, priority ordering, card state |
| engine.test.extra.mjs | 421 | 240 property-based, 30 boundary sweeps, 15 priority pairs, 10 slot edges, 6 determinism |

## Honesty table

| Claim | Status | How to verify |
|---|---|---|
| Reads live mainnet state | Done | Visit any mint truth card -- data is from live RPC |
| Preflight evaluation | Done | POST to /api/preflight with a plan body |
| Live prices via Jupiter V3 | Done | Visit landing page market ticker or /api/prices |
| 554 tests, 0 failures | Done | Run `node --test lib/*.test.mjs` |
| Plan builder with spot price | Done | Select a mint in /plan -- price + estimated fill shown |
| Anchor program deployed (devnet) | Done | [Explorer](https://explorer.solana.com/address/pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA?cluster=devnet) |
| create_plan on-chain | Done | PDA created and verified |
| preflight on-chain | Done | Token-2022 extension checks pass/fail on devnet |
| record_fill on-chain | Done | Fill receipt written to chain |
| record_refusal on-chain | Done | Refusal receipt with reason code written to chain |
| Real mainnet transaction broadcast | Not claimed | Preflight evaluates; no mainnet wallet integration |

## Architecture

```
programs/preflight/         Anchor program (Solana devnet)
  src/lib.rs                Program entry: create_plan, preflight, record_fill, record_refusal
  src/state/plan.rs         Plan account struct
  src/state/tape_entry.rs   TapeEntry account struct (fills + refusals)
  src/error.rs              Custom error codes

scripts/                    Python backend
  preflight.py              Off-chain evaluator (7 invariants against mainnet)
  mint_truth.py             Token-2022 extension reader (mainnet)
  rpc.py                    JSON-RPC helper with UA header
  devnet_test.py            Devnet integration test
  devnet_full_test.py       Full flow test (create -> preflight -> fill/refuse)

app/                        Next.js frontend
  app/page.tsx              Landing page with market ticker
  app/plan/                 Plan builder dashboard
  app/tape/                 Refusal tape ledger
  app/evidence/             Verifiable claims
  app/mint/[addr]/          Live Token-2022 state reader
  app/api/prices/           Jupiter V3 price proxy
  app/api/preflight/        Evaluation endpoint
  lib/engine.ts             Pure evaluation function (inspect + allChecks)
  lib/engine.test.mjs       133 unit tests
  lib/engine.test.extra.mjs 421 combinatorial tests
```

## Stack

| Layer | Tool |
|---|---|
| Smart contract | Anchor 0.30.1, Rust |
| Frontend | Next.js 16, React 19 |
| Evaluation | TypeScript pure function + Python evaluator |
| Prices | Jupiter V3 Price API |
| RPC | Public Solana mainnet + devnet |
| Tokens | Token-2022 xStocks (Backed Finance) |
| Tests | Node --test (built-in) |

## License

MIT -- 2026
