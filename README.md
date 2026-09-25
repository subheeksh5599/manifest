<div align="center">

# Manifest

**Exit terms for tokenized equities on Solana, read from the mint itself.**

[![Live](https://img.shields.io/badge/demo-live-145FE4?style=flat-square)](https://manifest-mocha-six.vercel.app)
[![Tests](https://img.shields.io/badge/tests-79%20passing-2E7D32?style=flat-square)](#proof)
[![Verifier](https://img.shields.io/badge/independent%20verifier-17%20checks-2E7D32?style=flat-square)](#proof)
[![License](https://img.shields.io/badge/license-MIT-303136?style=flat-square)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-Token--2022-9945FF?style=flat-square)](https://solana.com)

</div>

A tokenized equity can be trading at 100 basis points on the way out while the
mint already carries a 300 basis point schedule scheduled to take effect at a
named epoch. Both values are public, both are in the account bytes, and almost
nothing shows either of them.

Manifest reads the exit terms out of the mint and reports three numbers in
order: **what the pool quoted**, **what the mint withholds**, and **what lands**.
A quote is not a payout, and the difference is the product.

## See it in one command

```bash
curl -s 'https://manifest-mocha-six.vercel.app/api/exit?mint=PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB&size=1000000000'
```

Real output, unedited, one request to mainnet:

```json
{
  "mint": "PresTj4Y…", "size": "1000000000", "slot": 450311310, "epoch": "1042",
  "quote": { "venue": "pool", "out_amount": "162733915", "price_impact_bps": 0 },
  "verdict": {
    "verdict": "ROUTE",
    "landing": {
      "quoted_out":   "162733915",
      "schedule_bps": 100,
      "withheld":     "1627339",
      "lands":        "161106576",
      "pending_bps":  300,
      "pending_epoch": "1043",
      "withheld_after_pending": "4882017"
    }
  }
}
```

At slot 450311310 the pool quoted 162,733,915. The mint withheld 1,627,339.
What landed was 161,106,576. Once the announced schedule takes effect at epoch
1043, the same exit withholds 4,882,017 — three times as much.

Both numbers move with the pool, so run the command for the current ones. The
schedule numbers do not: they change only when the issuer signs a new one.

## The one fact that matters

```
$ node --test app/lib/exit-terms.test.mjs
  LIVE PresTj4Y…  slot=450306499 epoch=1042
  older=100bps@1039  newer=300bps@1043
  IN FORCE NOW: 100bps   PENDING: 300bps at epoch 1043
  authorities: 8 levers, 1 distinct key(s)
```

Token-2022's `TransferFeeConfig` carries **two** schedules. The one in force at
epoch *E* is the newer schedule when *E* is at or past `newer.epoch`, and the
older one otherwise. That single rule is why an announced increase is readable
today, before it is charged.

## Surfaces

| Surface | What it answers | Link |
|---|---|---|
| Exit Desk | Three numbers, six checks, every route | [/exit](https://manifest-mocha-six.vercel.app/exit) |
| Issuer Board | Every registry mint, read live, grouped by issuer | [/issuers](https://manifest-mocha-six.vercel.app/issuers) |
| Mint Inspector | Both fee schedules and the key behind each authority | [/mint/XsDoVfqe…](https://manifest-mocha-six.vercel.app/mint/XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB) |
| Tape | Append-only ledger of readings, with the slot each was taken at | [/tape](https://manifest-mocha-six.vercel.app/tape) |
| Evidence | Every claim mapped to the command that reproduces it | [/evidence](https://manifest-mocha-six.vercel.app/evidence) |

## Why bytes, not parsed JSON

`getAccountInfo` with `jsonParsed` returns u64 fields as JSON numbers. A u64
maximum fee can be `2^64-1`, which a double cannot hold. The parsed read returns
`18446744073709551616` — one more than the chain stores.

The fee fields are therefore lifted from the account bytes. The
`TransferFeeConfig` extension is 108 bytes at TLV offset 166:

```
[  0: 32] transfer_fee_config_authority
[ 32: 64] withdraw_withheld_authority
[ 64: 72] withheld_amount        u64
[ 72: 90] older  epoch u64, maximum_fee u64, basis points u16
[ 90:108] newer  epoch u64, maximum_fee u64, basis points u16
```

## Exit checks

Run in this order. The first failure becomes the verdict; the rest are still
recorded, because knowing which other conditions also fail is useful.

| # | Check | Refusal code |
|---|---|---|
| 1 | `mint_is_token_2022` | `mint_not_token_2022` |
| 2 | `mint_not_paused` | `mint_paused` |
| 3 | `no_transfer_hook_program` | `transfer_hook_installed` |
| 4 | `exit_route_exists` | `no_exit_route` |
| 5 | `impact_within_bound` | `impact_over_bound` |
| 6 | `fee_does_not_consume_position` | `fee_consumes_position` |

A refusal is a different statement from a zero, and it carries a name.

## Proof

```bash
git clone https://github.com/subheeksh5599/manifest.git
cd manifest/app && npm install && npm run build
node --test lib/exit-terms.test.mjs lib/exit-engine.test.mjs
```

```
ℹ tests 79
ℹ pass  79
ℹ fail  0
```

Reading six mints at once tripped the public endpoint's rate limit, which showed
as a comparison board with holes in it. Reads now take a second endpoint when the
first refuses, run with a ceiling on how many are in flight, and repeat a recent
result for 90 seconds instead of re-reading the chain. Every surface still prints
the slot the reading came from, so a cached number is never presented as a fresh
one.

```
$ python3 scripts/verify_receipts.py
  PASS  ANDURIL: maximum fee is exactly 2^64-1                  18446744073709551615
  PASS  ANDURIL: the same value through a float is wrong        18446744073709551616
  PASS  ANDURIL: the two schedules are ordered                  1039 -> 1043
  PASS  ANDURIL: schedule in force at epoch 1042                100 bps @ epoch 1039

  mints read            6
  charged at the exit   1
  a change scheduled    1
  checks                17/17 passed
```

`scripts/verify_receipts.py` is a deliberately **independent** implementation.
It walks the Token-2022 TLV region in Python and re-derives both schedules from
raw account bytes. It does not import the TypeScript module, so a bug there
cannot hide behind itself. If the two disagree, the site is wrong.

```
$ python3 scripts/adversarial_gate.py
  PASS  ablation_understates_the_exit  —  300bps vs 100bps -> overstates the exit by 40,000,000,000 micro-units
  PASS  read_follows_the_bytes         —  100 -> 65535 bps from the bytes alone
  PASS  zero_cap_charges_nothing       —  a zero maximum fee charges nothing, and the bytes say so
  PASS  absent_fee_is_not_a_schedule   —  reads as absent, so nothing is scheduled rather than zero
  PASS  missing_mint_is_not_zero       —  sGCjibff… holds nothing, so no reading is invented

  5/5 hostile checks passed
```

The first check is the ablation: ignore the not-yet-in-force schedule and the
same position is priced wrong by 40,000,000,000 micro-units. That is what makes
the epoch read load-bearing rather than decorative.

## Honesty table

| Claim | Status | How to check |
|---|---|---|
| Exit terms read from mainnet mints | Done | `curl https://manifest-mocha-six.vercel.app/api/issuers` |
| Fee schedule selected by epoch | Done | `node --test app/lib/exit-terms.test.mjs` |
| u64 fee fields read from account bytes | Done | `python3 scripts/verify_receipts.py --check` |
| Quote priced down to what lands | Done | `curl '…/api/exit?mint=…&size=…'` |
| Two issuers read and compared live | Done | `curl https://manifest-mocha-six.vercel.app/api/issuers` |
| Readings recorded with their slot | Done | `tail -3 app/data/readings.jsonl` |
| Independent Python verifier agrees | Done | `python3 scripts/verify_receipts.py` |
| **Executing a swap on mainnet** | **Not claimed** | The site reads and prices. It does not sign. |
| **An issuer redemption window** | **Not claimed** | That path is off chain, so it is never shown as achievable. |
| **A second issuer for the same company** | **Not claimed** | Reported as not observed until one is read on chain. |
| **An on-chain program for routing** | **Not claimed** | An Anchor program exists in the repo from an earlier design. It is not wired to this product and no page claims it. |
| **Underwriting, insurance, or payout** | **Not claimed** | This is a read-and-price layer. |

## Architecture

```
app/lib/exit-terms.mjs        read the mint; epoch-selected fee; exact TLV read
app/lib/exit-engine.mjs       quote -> landing; six checks; route comparison
app/lib/*.test.mjs            79 tests, including a live read
app/app/exit/                 the desk
app/app/issuers/              the cross-issuer board
app/app/tape/                 the reading ledger
app/app/evidence/             claim -> artifact -> command
app/app/mint/[addr]/          one mint, in full
app/data/registry.json        identity only, so nothing measured can go stale
app/data/readings.jsonl       appended by the verifier, never hand-written

scripts/verify_receipts.py    independent Python re-derivation of the fee fields
scripts/adversarial_gate.py   five hostile checks, including the ablation
```

## Stack

| Layer | Tool |
|---|---|
| Read | Solana mainnet RPC, `getAccountInfo` base64 + jsonParsed |
| Pricing | Jupiter quote API at the requested size |
| App | Next.js 16, React 19, TypeScript strict |
| Tests | `node --test` (72) plus a Python verifier (17 checks) |
| Assets | Token-2022 mints from two issuers |

## License

MIT — 2026
