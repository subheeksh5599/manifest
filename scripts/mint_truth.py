"""Print the guard's input set for a mint by reading Token-2022 extensions live.

Usage: python3 scripts/mint_truth.py <MINT_ADDRESS>
"""

from __future__ import annotations

import json
import pathlib
import sys

from rpc import rpc


TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"


def truth_card(mint: str) -> dict:
    resp = rpc("getAccountInfo", [mint, {"encoding": "jsonParsed", "commitment": "confirmed"}])
    if "result" not in resp or resp["result"]["value"] is None:
        raise SystemExit(f"mint not found: {mint}")
    val = resp["result"]["value"]
    if val["owner"] != TOKEN_2022:
        raise SystemExit(f"mint {mint} is not owned by Token-2022; owner={val['owner']}")
    parsed = val["data"]["parsed"]["info"]
    exts = {e["extension"]: e.get("state", {}) for e in parsed.get("extensions", [])}
    scaled = exts.get("scaledUiAmountConfig", {})
    pausable = exts.get("pausableConfig", {})
    hook = exts.get("transferHook", {})
    delegate = exts.get("permanentDelegate", {})
    meta = exts.get("tokenMetadata", {})
    ct = exts.get("confidentialTransferMint", {})
    return {
        "mint": mint,
        "slot": resp["result"]["context"]["slot"],
        "symbol": meta.get("symbol"),
        "name": meta.get("name"),
        "decimals": parsed.get("decimals"),
        "supply": parsed.get("supply"),
        "multiplier": scaled.get("multiplier"),
        "next_multiplier": scaled.get("newMultiplier"),
        "effective_timestamp": scaled.get("newMultiplierEffectiveTimestamp"),
        "paused": pausable.get("paused"),
        "permanent_delegate": delegate.get("delegate"),
        "transfer_hook_program": hook.get("programId"),
        "transfer_hook_authority": hook.get("authority"),
        "auditor_elgamal_pubkey": ct.get("auditorElgamalPubkey"),
    }


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    mint = argv[1]
    card = truth_card(mint)
    print(json.dumps(card, indent=2, sort_keys=True))
    # save fixture
    out = pathlib.Path(__file__).parent.parent / "data" / "mints" / f"{card.get('symbol') or mint}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(card, indent=2, sort_keys=True) + "\n")
    print(f"# saved: {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
