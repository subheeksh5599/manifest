# Evidence

Every claim in this repository maps to a command a judge can run, with no
credentials and no funds. If a row does not reproduce, that is a real bug in the
repository rather than a rounding difference, and it should be treated that way.

The counts are the counts as they run on a clean clone: **404** node tests, **10**
Rust tests, **17** receipt checks, **5** hostile checks.

| claim | artifact | command |
|---|---|---|
| Exit terms are read from live mints, not from a database | stdout, `app/data/readings.jsonl` | `python3 scripts/verify_receipts.py` |
| Every number quoted in the README and docs re-reads and matches | stdout, 17 checks | `python3 scripts/verify_receipts.py` |
| All registered mints resolve, with the slot each reading was taken at | `app/data/registry.json` | `curl -s localhost:3000/api/registry` |
| A classic mint can never be read as a fee-bearing one | `app/lib/exit-terms.mjs` | `cd app && npm test` |
| Four refusals, four distinct reasons, evaluated on the request | `/api/verify` response | `curl -s localhost:3000/api/verify` |
| The epoch read is load-bearing | `/api/verify` → `ablation` | see `docs/ABLATION.md` |
| The product's arithmetic matches the chain | stdout, two issuers | `node scripts/replica_devnet.mjs exit` |
| The devnet program records a reading and refuses a stale one | signature `bBz4KBZ1…`, then `6003` | `node scripts/prove_onchain.mjs` |
| A published number is refused by the chain, not by a database | two devnet signatures | same command, second half |
| The refusal system survives a hostile run | stdout, 5 checks in separate processes | `python3 scripts/adversarial_gate.py` |
| No credential can be committed, whatever the extension | staged tree, 4 cases | `python3 scripts/check_no_secrets.py` |
| The app builds and serves every surface | `app/` | `cd app && npm ci && npm run build` |
| The exit engine is pure and needs no network to be exercised | `app/lib/exit-engine.mjs` | `cd app && npm test` |
| Each dependency is checked separately and fails loudly | `/api/health` | `curl -s localhost:3000/api/health` |
| CI builds the SBF program and the frontend | `.github/workflows/build.yml` | GitHub Actions run |
| CI re-reads live state in a fork and re-runs the checks | `.github/workflows/fork-e2e.yml` | GitHub Actions run |
| CI runs the node suite on every push | `.github/workflows/app.yml` | GitHub Actions run |
| CI refuses a credential before it lands | `.github/workflows/guards.yml` | GitHub Actions run |

## What these commands do not prove

- They do not prove a swap was executed. A pool executes swaps; this layer tells
  you what will land before you ask one to. The README's honesty table says this
  in the same words.
- They do not prove mainnet execution. The program and the two-issuer replica run
  on devnet; the reads come from mainnet at slots the pages display.
- They do not prove the issuer's redemption path. It is off chain, and the desks
  report it as unreachable rather than pricing it at a guess.

A claim that cannot be reproduced is not in the table above. If you find one that
should be, that is the bug to report.
