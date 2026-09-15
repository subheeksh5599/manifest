"""Preflight evaluator.

Given a plan file (JSON), evaluate the seven invariants against live mainnet
state. Returns a verdict: ACCEPT or REFUSE with a named error. Every REFUSE is
appended to the refusal tape (`data/tape.jsonl`).

This is the keyless evidence path: no funds, no wallet, no key. The composed
transaction is never broadcast. When broadcast becomes available (funded key +
deployed program), the same evaluator can be reused as the on-chain preflight.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import sys
import time

from rpc import rpc
from mint_truth import truth_card


ROOT = pathlib.Path(__file__).parent.parent
TAPE = ROOT / "data" / "tape.jsonl"


CHECKS = [
    "mint_identity",
    "multiplier_freshness",
    "issuer_levers",
    "reference_regime",
    "exit_at_size",
    "policy",
    "idempotency",
]


def _load_registry() -> dict[str, dict]:
    reg = json.loads((ROOT / "data" / "registry.json").read_text())
    return {e["mint"]: e for e in reg["entries"]}


def _seen_plans() -> set[str]:
    if not TAPE.exists():
        return set()
    seen = set()
    for line in TAPE.read_text().splitlines():
        if not line.strip():
            continue
        rec = json.loads(line)
        if rec.get("verdict") == "ACCEPT":
            seen.add(rec["plan"]["plan_id"])
    return seen


def account_data_hash(mint: str) -> tuple[str, int]:
    resp = rpc("getAccountInfo", [mint, {"encoding": "base64", "commitment": "confirmed"}])
    val = resp["result"]["value"]
    data_b64 = val["data"][0]
    slot = resp["result"]["context"]["slot"]
    h = hashlib.sha256(data_b64.encode()).hexdigest()
    return h, slot


def evaluate(plan: dict) -> dict:
    registry = _load_registry()
    verdict = "ACCEPT"
    check_id = None
    live_value: dict = {}

    mint = plan["mint"]
    # 1. mint identity
    reg_entry = registry.get(mint)
    if reg_entry is None or reg_entry["symbol"] != plan.get("expected_symbol"):
        verdict, check_id = "REFUSE", "mint_identity"
        live_value = {"registry_entry": reg_entry, "expected_symbol": plan.get("expected_symbol")}

    card = truth_card(mint)
    live_value["mint_card"] = card

    if verdict == "ACCEPT":
        # 2. multiplier freshness
        if str(card["multiplier"]) != str(plan["multiplier_snapshot"]):
            verdict, check_id = "REFUSE", "multiplier_freshness"
        # 3. issuer levers
        elif card["paused"]:
            verdict, check_id = "REFUSE", "issuer_levers"
        elif card["transfer_hook_program"]:
            verdict, check_id = "REFUSE", "issuer_levers"
        # 4. reference regime
        elif plan.get("ref_age_secs", 0) > plan.get("max_ref_age_secs", 0):
            verdict, check_id = "REFUSE", "reference_regime"
        # 5. exit at size
        elif plan.get("route_cost_bps", 0) > plan.get("exit_bound_bps", 0):
            verdict, check_id = "REFUSE", "exit_at_size"
        # 6. policy
        elif plan.get("requested_size", 0) > plan.get("per_trade_cap", 0):
            verdict, check_id = "REFUSE", "policy"
        # 7. idempotency
        elif plan["plan_id"] in _seen_plans():
            verdict, check_id = "REFUSE", "idempotency"

    data_hash, slot = account_data_hash(mint)
    record = {
        "ts": int(time.time()),
        "verdict": verdict,
        "check_id": check_id,
        "plan": plan,
        "live_value": live_value,
        "account_data_hash": data_hash,
        "slot": slot,
    }
    return record


def append_tape(record: dict) -> None:
    TAPE.parent.mkdir(parents=True, exist_ok=True)
    with TAPE.open("a") as f:
        f.write(json.dumps(record, sort_keys=True) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True, help="Path to plan JSON")
    ap.add_argument("--no-append", action="store_true", help="Do not append to tape")
    args = ap.parse_args()
    plan = json.loads(pathlib.Path(args.plan).read_text())
    record = evaluate(plan)
    print(json.dumps(record, indent=2, sort_keys=True))
    if not args.no_append:
        append_tape(record)
    return 0 if record["verdict"] == "REFUSE" or record["verdict"] == "ACCEPT" else 1


if __name__ == "__main__":
    raise SystemExit(main())
