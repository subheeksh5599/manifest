"""Regime monitor.

For each registry entry, fetch the recent transaction signatures on the mint and
surface any that reverted. The two known failing slots on TSLAx are 446933216
and 446933174 (InstructionError [4, Custom 6019]) — this script must surface
them when the sampling depth reaches that slot range.
"""

from __future__ import annotations

import json
import pathlib
import sys

from rpc import rpc


ROOT = pathlib.Path(__file__).parent.parent


def failures_for_mint(mint: str, limit: int = 100) -> list[dict]:
    resp = rpc("getSignaturesForAddress", [mint, {"limit": limit}])
    sigs = resp.get("result", []) or []
    out = []
    for entry in sigs:
        if entry.get("err") is not None:
            out.append({"signature": entry["signature"], "slot": entry["slot"], "err": entry["err"]})
    return out


def main() -> int:
    reg = json.loads((ROOT / "data" / "registry.json").read_text())
    report = {"failures_by_mint": {}}
    for e in reg["entries"]:
        fs = failures_for_mint(e["mint"], limit=200)
        report["failures_by_mint"][e["mint"]] = {
            "symbol": e["symbol"],
            "count": len(fs),
            "recent": fs[:10],
        }
    out = ROOT / "data" / "regime.json"
    out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
