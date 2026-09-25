# Evidence

Every claim in this repository maps to a command a judge can run, with no
credentials and no funds. If a row does not reproduce, that is a real bug in the
repository rather than a rounding difference, and it should be treated that way.

The counts are the counts as they run on a clean clone: **423** node tests, **10**
Rust tests, **30** receipt checks, **14** pool checks, **12** live comparison
checks, **13** clone checks, **5** hostile checks.

| claim | artifact | command |
|---|---|---|
| Exit terms are read from live mints, not from a database | stdout, `app/data/readings.jsonl` | `python3 scripts/verify_receipts.py` |
| Every fee figure is re-derived from raw account bytes by a second implementation | stdout, 30 checks | `python3 scripts/verify_receipts.py --check` |
| Every address and signature these documents quote resolves on chain | stdout, `docs address` / `docs signature` rows | `python3 scripts/verify_receipts.py --check` |
| That check is load-bearing: one wrong character in a quoted address fails the run | 30/30 becomes 29/30, exit 1 | change a character of any quoted mint, re-run |
| All registered mints resolve, with the slot each reading was taken at | `app/data/registry.json` | `curl -s localhost:3000/api/registry` |
| A classic mint can never be read as a fee-bearing one | `app/lib/exit-terms.mjs` | `cd app && npm test` |
| Four refusals, four distinct reasons, evaluated on the request | `/api/verify` response | `curl -s localhost:3000/api/verify` |
| The epoch read is load-bearing | `/api/verify` → `ablation` | see `docs/ABLATION.md` |
| The product's arithmetic matches the chain | stdout, two issuers | `node scripts/replica_devnet.mjs exit` |
| Both replica issuers have a real pool on devnet, owned by the pool program | stdout, 14 checks | `python3 scripts/verify_pools.py` |
| An exit leaves issuer B's mint and arrives in issuer A's, in one transaction | 2 `SwapV2` logs in one transaction | `python3 scripts/verify_pools.py` |
| That route is executable from a clean clone, not just recorded | a new devnet signature | `node scripts/pools_devnet.mjs cross 0.01` |
| One company is priced at both issuers, after the fee in force, at the caller's size | `/api/compare` response | `curl '…/api/compare?size=100000000'` |
| That price is the pool library's own quote, to the lamport, on both issuers | stdout, 12 checks | `node scripts/compare_live.mjs` |
| One lamport of tampering with that price is caught | `difference 1`, same command | `node scripts/compare_live.mjs` |
| The pool fields are read from bytes at offsets proved against the library | stdout, ten fields agreeing | `node scripts/pool_layout.mjs` |
| What lands never exceeds the pool's own spot price | `app/lib/compare-engine.test.mjs` | `cd app && npm test` |
| The devnet program records a reading and refuses a stale one | signature `bBz4KBZ1…`, then `6003` | `node scripts/prove_onchain.mjs` |
| A published number is refused by the chain, not by a database | two devnet signatures | same command, second half |
| The refusal system survives a hostile run | stdout, 5 checks in separate processes | `python3 scripts/adversarial_gate.py` |
| No credential can be committed, whatever the extension | staged tree, 4 cases | `python3 scripts/check_no_secrets.py` |
| The app builds and serves every surface | `app/` | `cd app && npm ci && npm run build` |
| The exit engine is pure and needs no network to be exercised | `app/lib/exit-engine.mjs` | `cd app && npm test` |
| Each dependency is checked separately and fails loudly | `/api/health` | `curl -s localhost:3000/api/health` |
| Devnet state is cloned into a validator and held to the original in the same run | run [36134397991](https://github.com/subheeksh5599/manifest/actions/runs/36134397991), 13/13 | `gh workflow run fork-clone.yml` |
| The lifecycle runs against that clone: read, record, refuse | that run's `record_reading` and `verify_reading REFUSED` | same command |
| One byte of a cloned mint's fee schedule fails the job | run [36134639005](https://github.com/subheeksh5599/manifest/actions/runs/36134639005), failure, 12/13 | `gh workflow run fork-clone.yml -f mutate=true` |
| The program is built in CI, not on a machine, and kept as a release asset | run [36133731950](https://github.com/subheeksh5599/manifest/actions/runs/36133731950), job `build`: success | `gh release download program-build -p '*.so'` |
| What CI built is byte-for-byte the program deployed to devnet | `sha256 2b56aad5931dfb05…` | `sha256sum` on the downloaded asset |
| CI builds the SBF program and the frontend | `.github/workflows/build.yml` | GitHub Actions run |
| CI re-reads live state in a fork and re-runs the checks | `.github/workflows/fork-e2e.yml` | GitHub Actions run |
| CI runs the node suite on every push | `.github/workflows/app.yml` | GitHub Actions run |
| CI refuses a credential before it lands | `.github/workflows/guards.yml` | GitHub Actions run |

## What these commands do not prove

- They do not prove a swap was executed on mainnet. One was executed on devnet:
  the route across issuers moved issuer B's mint into issuer A's mint in a single
  transaction, and `scripts/verify_pools.py` counts the two swaps inside it rather
  than taking the file's word for it. The product's own surface reads and prices,
  and does not sign.
- They do not prove mainnet execution. The program and the two-issuer replica run
  on devnet; the reads come from mainnet at slots the pages display.
- They do not prove the issuer's redemption path. It is off chain, and the desks
  report it as unreachable rather than pricing it at a guess.

A claim that cannot be reproduced is not in the table above. If you find one that
should be, that is the bug to report.
