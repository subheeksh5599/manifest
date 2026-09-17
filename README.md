# Manifest

[![Live](https://img.shields.io/badge/demo-live-145FE4?style=flat-square)](https://manifest-mocha-six.vercel.app)
[![Tests](https://img.shields.io/badge/tests-554%20passing-2E7D32?style=flat-square)](https://github.com/subheeksh5599/manifest)
[![License](https://img.shields.io/badge/license-MIT-303136?style=flat-square)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-Token--2022-9945FF?style=flat-square)](https://solana.com)

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
Plan (7 bounds) → inspect() → 6 invariant checks → ACCEPT | REFUSE
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

## Quickstart

```bash
git clone https://github.com/subheeksh5599/manifest.git
cd manifest/app
npm install
npm run build
node --test lib/engine.test.mjs lib/engine.test.extra.mjs
```

## Proof — 554 tests, 0 failures

```
ℹ tests 554
ℹ pass  554
ℹ fail  0
```

| Suite | Count | Coverage |
|---|---|---|
| engine.test.mjs | 133 | 6 individual invariants, boundary values, priority ordering, card state |
| engine.test.extra.mjs | 421 | 240 property-based, 30 boundary sweeps, 15 priority pairs, 10 slot edges, 6 determinism |

## Honesty table

| Claim | Status | How to verify |
|---|---|---|
| Reads live mainnet state | ✓ | Visit any mint truth card — data is from live RPC |
| Preflight evaluation | ✓ | POST to /api/preflight with a plan body |
| Live prices via Jupiter V3 | ✓ | Visit landing page market ticker or /api/prices |
| 554 tests, 0 failures | ✓ | Run `node --test lib/*.test.mjs` |
| Plan builder with spot price | ✓ | Select a mint in /plan — price + estimated fill shown |
| Real transaction broadcast | ✗ Not claimed | Preflight only; no wallet integration |
| Anchor program deployed | ✗ Not claimed | CI builds the program; deployment needs devnet SOL |

## Architecture

```
app/
  app/page.tsx       Landing page with market ticker + product showcase
  app/plan/          Plan builder dashboard (sidebar layout)
  app/tape/          Refusal tape ledger
  app/evidence/      Verifiable claims
  app/mint/[addr]/   Live Token-2022 state reader
  app/api/prices/    Jupiter V3 price proxy
  app/api/preflight/ Evaluation endpoint
  lib/
    engine.ts        Pure evaluation function (inspect + allChecks)
    engine.mjs       ESM mirror for Node --test
    engine.test.mjs         133 unit tests
    engine.test.extra.mjs   421 combinatorial tests
    preflight.ts     Production evaluate() calling inspect()
    registry.ts      Mint registry loader
    rpc.ts           Solana RPC reader
```

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 16, React 19 |
| Evaluation | TypeScript pure function |
| Prices | Jupiter V3 Price API |
| RPC | Public Solana mainnet |
| Tokens | Token-2022 xStocks (Backed Finance) |
| Tests | Node --test (built-in) |

## License

MIT — 2026