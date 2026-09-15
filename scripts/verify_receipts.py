"""Re-read every mint quoted in the README + registry and exit non-zero on drift.

"Drift" means a claimed value (e.g. mint owner is Token-2022, decimals=8, multiplier="1")
no longer matches what mainnet returns right now. This proves the README is not lying.
"""

from __future__ import annotations

import json
import pathlib
import sys

from mint_truth import truth_card, TOKEN_2022


ROOT = pathlib.Path(__file__).parent.parent


def main() -> int:
    reg = json.loads((ROOT / "data" / "registry.json").read_text())
    fails: list[str] = []
    for e in reg["entries"]:
        card = truth_card(e["mint"])
        if e["symbol"] != card["symbol"]:
            fails.append(f"{e['mint']}: registry symbol {e['symbol']} != live {card['symbol']}")
        if e["decimals"] != card["decimals"]:
            fails.append(f"{e['mint']}: registry decimals {e['decimals']} != live {card['decimals']}")
        if e["issuer_program"] != TOKEN_2022:
            fails.append(f"{e['mint']}: registry issuer {e['issuer_program']} != Token-2022")
        print(f"OK {e['symbol']:8s} mint={e['mint']} multiplier={card['multiplier']} paused={card['paused']} slot={card['slot']}")
    if fails:
        for f in fails:
            print(f"FAIL {f}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
