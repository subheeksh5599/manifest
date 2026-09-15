"""Build a small equity-mint registry, keyed by mint (never by ticker).

Reads a candidate list of known Backed xStock mints from `data/candidates.txt`,
enumerates the live Token-2022 extension state for each, and writes
`data/registry.json`. Impostor mints (any without a scaled UI amount config or
not owned by Token-2022) are dropped.
"""

from __future__ import annotations

import json
import pathlib
import sys

from mint_truth import truth_card, TOKEN_2022


ROOT = pathlib.Path(__file__).parent.parent
CANDIDATES = ROOT / "data" / "candidates.txt"
REGISTRY = ROOT / "data" / "registry.json"


def load_candidates() -> list[str]:
    if not CANDIDATES.exists():
        raise SystemExit(f"missing {CANDIDATES}; add one mint per line")
    return [l.strip() for l in CANDIDATES.read_text().splitlines() if l.strip() and not l.startswith("#")]


def main() -> int:
    entries = []
    for mint in load_candidates():
        try:
            card = truth_card(mint)
        except SystemExit as e:
            print(f"skip {mint}: {e}", file=sys.stderr)
            continue
        entries.append({
            "mint": card["mint"],
            "symbol": card["symbol"],
            "name": card["name"],
            "decimals": card["decimals"],
            "issuer_program": TOKEN_2022,
            "permanent_delegate": card["permanent_delegate"],
            "transfer_hook_authority": card["transfer_hook_authority"],
            "slot_read": card["slot"],
        })
    payload = {"count": len(entries), "entries": entries}
    REGISTRY.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
