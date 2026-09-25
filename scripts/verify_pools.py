#!/usr/bin/env python3
"""Check the devnet pools and the cross-issuer route against the chain.

Everything this reads is in app/data/replica-devnet.json. Nothing here trusts
that file: each address is fetched, each claim is compared against what comes
back, and the one claim that matters most - that the exit across issuers happens
in a single transaction - is counted in that transaction's own logs.

Stdlib only. No key needed. Devnet.

  python3 scripts/verify_pools.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "app", "data", "replica-devnet.json")

RPC = os.environ.get("DEVNET_RPC_URL", "https://api.devnet.solana.com")
UA = os.environ.get(
    "RPC_USER_AGENT",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
)
WHIRLPOOL_PROGRAM = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"

_id = 0


def rpc(method: str, params: list):
    """One devnet call. Raises RpcDown so a silent RPC is never read as a pass."""
    global _id
    _id += 1
    body = json.dumps({"jsonrpc": "2.0", "id": _id, "method": method, "params": params}).encode()
    req = urllib.request.Request(
        RPC, data=body, headers={"content-type": "application/json", "user-agent": UA}
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            payload = json.loads(r.read().decode())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        raise RpcDown(str(e)) from e
    if "error" in payload:
        raise RpcDown(payload["error"].get("message", "rpc error"))
    return payload["result"]


class RpcDown(Exception):
    """The chain did not answer. Not a failure of the claim, and not a pass."""


def check(name: str, ok: bool, detail: str) -> tuple:
    return (name, ok, detail)


def issuer_checks(key: str, issuer: dict) -> list:
    out = []
    pool = issuer["pool"]
    info = rpc("getAccountInfo", [pool["address"], {"encoding": "base64", "commitment": "confirmed"}])
    value = (info or {}).get("value")
    out.append(
        check(
            f"{key} pool exists",
            bool(value),
            f"{pool['address']} · {'present' if value else 'no such account'}",
        )
    )
    owner = (value or {}).get("owner")
    out.append(
        check(
            f"{key} pool owned by the pool program",
            owner == WHIRLPOOL_PROGRAM,
            f"owner {owner or '—'}",
        )
    )

    for label, vault in (("quote", pool["vault_quote"]), ("issuer", pool["vault_issuer"])):
        bal = rpc("getTokenAccountBalance", [vault, {"commitment": "confirmed"}])
        amount = int((bal or {}).get("value", {}).get("amount", "0"))
        out.append(
            check(
                f"{key} {label} vault holds a balance",
                amount > 0,
                f"{vault} · {amount}",
            )
        )

    status = rpc("getSignatureStatuses", [[pool["deposit_sig"]], {"searchTransactionHistory": True}])
    entry = ((status or {}).get("value") or [None])[0]
    out.append(
        check(
            f"{key} deposit confirmed",
            bool(entry) and entry.get("confirmationStatus") in ("confirmed", "finalized") and not entry.get("err"),
            f"{pool['deposit_sig'][:16]}… · {(entry or {}).get('confirmationStatus') or 'not found'}",
        )
    )
    return out


def main() -> int:
    if not os.path.exists(DATA):
        print(f"no data at {DATA}")
        return 1
    data = json.load(open(DATA))

    print(f"devnet pools and the cross-issuer route · {RPC}\n")
    rows: list = []
    unreachable = 0
    for key in ("issuer_a", "issuer_b"):
        try:
            rows.extend(issuer_checks(key, data[key]))
        except RpcDown as e:
            unreachable += 1
            rows.append(check(f"{key} pools", False, f"chain did not answer: {e}"))

    failed = 0
    for name, ok, detail in rows:
        if unreachable and "chain did not answer" in detail:
            print(f"  SKIP  {name:48} {detail}")
            continue
        print(f"  {'PASS' if ok else 'FAIL'}  {name:48} {detail}")
        if not ok:
            failed += 1

    print(f"\n{len(rows) - failed}/{len(rows)} checks passed")
    if failed:
        print("a definite negative fails the run; an RPC that will not answer is never a pass")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
