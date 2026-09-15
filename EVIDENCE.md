# Evidence

Every claim in this repo maps to a command a judge can run with no credentials. If a row fails to reproduce, that is a real bug.

| claim | artifact | command |
|---|---|---|
| Guard reads Token-2022 extensions live from real mints | `data/mints/TSLAx.json`, `data/registry.json` | `python3 scripts/mint_truth.py XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB` |
| Registry has multiple issuer mints, all owned by Token-2022 | `data/registry.json` | `python3 scripts/build_registry.py` |
| Live re-read of every registry entry matches on symbol and decimals | stdout | `python3 scripts/verify_receipts.py` |
| Refusal tape is sealed and tamper-evident | `data/tape.jsonl` | `python3 scripts/verify_tape.py` |
| Four reproducible refusals plus one accept | `docs/REFUSALS.md`, `docs/refusals/*.json` | see `docs/REFUSALS.md` |
| Guard is load-bearing (ablation) | `docs/ABLATION.md` | `python3 scripts/adversarial_gate.py` |
| Tampered tape refused, dup plan refused, stale mirror detected, guardless accepts | stdout | `python3 scripts/adversarial_gate.py` |
| Every RPC call sends a browser User-Agent | `scripts/rpc.py`, `scripts/test_ua_header.py` | `python3 scripts/test_ua_header.py` |
| Guard policy passes host tests | `program/src/policy.rs` | `cd program && cargo test --lib` |
| App builds and serves live truth cards, tape, evidence | `app/` | `cd app && npm ci && npm run build` |
| CI builds the SBF binary and uploads it as an artifact | `.github/workflows/build-program.yml` | GitHub Actions run |
| Fork-CI job re-reads mainnet and re-runs the tape verifier + adversarial gate | `.github/workflows/fork-e2e.yml` | GitHub Actions run |
