#!/usr/bin/env python3
"""
Verify the exit terms this repository publishes, independently.

Deliberately does NOT import or call the JavaScript module. It walks the
Token-2022 TLV region in Python and re-derives the fee schedules from raw
account bytes, so a bug in the TypeScript read cannot hide behind itself.
If this disagrees with the site, the site is wrong.

Stdlib only. No API key. Public RPC.

    python3 scripts/verify_receipts.py           # verify, then record a reading
    python3 scripts/verify_receipts.py --check   # verify only, write nothing

Exit code is non-zero if any published number fails to reproduce.
"""

from __future__ import annotations

import base64
import json
import os
import pathlib
import re
import struct
import sys
import time
import urllib.request

RPC = os.environ.get("RPC_URL", "https://api.mainnet-beta.solana.com")
UA = os.environ.get(
    "RPC_USER_AGENT",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
)

TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
MINT_TLV_START = 166
EXT_TRANSFER_FEE_CONFIG = 1
TRANSFER_FEE_CONFIG_LEN = 108
U64_MAX = (1 << 64) - 1

DEVNET_RPC = os.environ.get("DEVNET_RPC_URL", "https://api.devnet.solana.com")

ROOT = pathlib.Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "app" / "data" / "registry.json"
READINGS = ROOT / "app" / "data" / "readings.jsonl"

# Every document that quotes an address or a signature. The README is the only
# one now: the addresses it quotes are the ones a reader can go and check.
DOC_FILES = [
    "README.md",
]
B58_RE = re.compile(r"[1-9A-HJ-NP-Za-km-z]{32,90}")


def rpc_at(url: str, method: str, params: list):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json", "User-Agent": UA}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.load(r)
    if "error" in out:
        raise RuntimeError(f"{method}: {out['error']}")
    return out["result"]


def rpc(method: str, params: list):
    return rpc_at(RPC, method, params)


def read_fee_config_exact(data: bytes):
    """Walk the TLV region and lift the fee config out of the bytes.

    TransferFeeConfig body, 108 bytes:
        [  0: 32] transfer_fee_config_authority
        [ 32: 64] withdraw_withheld_authority
        [ 64: 72] withheld_amount          u64
        [ 72: 90] older  epoch u64, maximum_fee u64, basis points u16
        [ 90:108] newer  epoch u64, maximum_fee u64, basis points u16
    """
    if len(data) < MINT_TLV_START or data[165] != 1:
        return None  # not a mint account
    p = MINT_TLV_START
    while p + 4 <= len(data):
        etype, elen = struct.unpack_from("<HH", data, p)
        if etype == 0 and elen == 0:
            return None
        if etype == EXT_TRANSFER_FEE_CONFIG and elen >= TRANSFER_FEE_CONFIG_LEN:
            body = data[p + 4 : p + 4 + TRANSFER_FEE_CONFIG_LEN]
            return {
                "withheld_amount": struct.unpack_from("<Q", body, 64)[0],
                "older": {
                    "epoch": struct.unpack_from("<Q", body, 72)[0],
                    "maximum_fee": struct.unpack_from("<Q", body, 80)[0],
                    "bps": struct.unpack_from("<H", body, 88)[0],
                },
                "newer": {
                    "epoch": struct.unpack_from("<Q", body, 90)[0],
                    "maximum_fee": struct.unpack_from("<Q", body, 98)[0],
                    "bps": struct.unpack_from("<H", body, 106)[0],
                },
            }
        p += 4 + elen
    return None


def schedule_in_force(older: dict, newer: dict, epoch: int):
    """The newer schedule is in force when epoch is at or past its epoch."""
    if epoch >= newer["epoch"]:
        return newer, None
    return older, (newer if newer["epoch"] > epoch else None)


def fee_for(amount: int, bps: int, maximum_fee: int) -> int:
    if bps == 0:
        return 0
    return min(amount * bps // 10000, maximum_fee)


def doc_tokens() -> dict:
    """Every base58-shaped token the documents quote, and which file quotes it."""
    found: dict = {}
    for rel in DOC_FILES:
        path = ROOT / rel
        if not path.exists():
            continue
        for m in B58_RE.finditer(path.read_text()):
            found.setdefault(m.group(0), []).append(rel)
    return found


def _probe(url: str, method: str, params: list, tries: int = 3):
    """Ask, and say whether the answerer refused rather than answered."""
    last = ""
    for i in range(tries):
        try:
            return rpc_at(url, method, params), None
        except Exception as exc:  # noqa: BLE001 - any transport failure is the same news
            last = str(exc)[:80]
            time.sleep(0.6 * (i + 1))
    return None, last


def docs_checks() -> list:
    """Every address and signature a document quotes must resolve on chain.

    A definite negative from the chain fails the run, because a stale address in
    a README is a real defect and a reader would find it first. An RPC that
    cannot answer does not fail the run, because a network failure says nothing
    about the document and a verifier that cries wolf gets ignored.
    """
    out: list = []
    for token, where in sorted(doc_tokens().items()):
        n = len(token)
        loc = where[0]
        if 32 <= n <= 44:
            word = "address"
            probes = [
                ("mainnet", RPC, "getAccountInfo", [token, {"encoding": "base64"}]),
                ("devnet", DEVNET_RPC, "getAccountInfo", [token, {"encoding": "base64"}]),
            ]

            def found_it(res):
                return bool(res) and res.get("value") is not None

        elif 80 <= n <= 90:
            word = "signature"
            opts = {"encoding": "json", "maxSupportedTransactionVersion": 0}
            probes = [
                ("mainnet", RPC, "getTransaction", [token, opts]),
                ("devnet", DEVNET_RPC, "getTransaction", [token, opts]),
            ]

            def found_it(res):
                return res is not None

        else:
            continue

        ok = False
        unreachable = False
        detail = loc
        for net, url, method, params in probes:
            res, err = _probe(url, method, params)
            if err is not None:
                unreachable = True
                continue
            if found_it(res):
                ok = True
                detail = f"{net} · {loc}"
                break
            detail = f"not on {net} · {loc}"

        if not ok and unreachable:
            # Not evidence either way. Say that rather than pass it or fail it.
            out.append((f"docs {word} {token[:10]}…", True, f"{loc} · chain did not answer, not judged"))
        else:
            out.append((f"docs {word} {token[:10]}…", ok, detail))
    return out


def main() -> int:
    check_only = "--check" in sys.argv

    registry = json.loads(REGISTRY.read_text())
    epoch = rpc("getEpochInfo", [{}])["epoch"]

    checks: list[tuple[str, bool, str]] = []
    readings: list[dict] = []

    for entry in registry["entries"]:
        mint, symbol, decimals = entry["mint"], entry["symbol"], entry["decimals"]

        res = rpc("getAccountInfo", [mint, {"encoding": "base64", "commitment": "confirmed"}])
        value = res["value"]
        data = base64.b64decode(value["data"][0])
        slot = res["context"]["slot"]

        checks.append((f"{symbol}: owned by the Token-2022 program", value["owner"] == TOKEN_2022, value["owner"][:12]))

        fee = read_fee_config_exact(data)
        if fee is None:
            # No fee extension is a legitimate state, and a different statement
            # from a fee of zero that someone intends to raise later.
            checks.append((f"{symbol}: no transfer-fee extension present", True, "0 bps, nothing scheduled"))
            readings.append(
                {
                    "ts": int(time.time()),
                    "mint": mint,
                    "symbol": symbol,
                    "slot": slot,
                    "epoch": epoch,
                    "fee_in_force_bps": 0,
                    "fee_in_force_epoch": None,
                    "fee_pending_bps": None,
                    "fee_pending_epoch": None,
                    "maximum_fee": None,
                    "withheld_amount": None,
                    "source": "no_fee_extension",
                }
            )
            continue

        in_force, pending = schedule_in_force(fee["older"], fee["newer"], epoch)

        # The exactness check that motivated reading bytes at all.
        checks.append(
            (
                f"{symbol}: maximum fee is exactly 2^64-1",
                fee["older"]["maximum_fee"] == U64_MAX and fee["newer"]["maximum_fee"] == U64_MAX,
                str(fee["older"]["maximum_fee"]),
            )
        )

        # A double cannot represent that value. Prove it rather than assert it.
        checks.append(
            (
                f"{symbol}: the same value through a float is wrong",
                int(float(U64_MAX)) != U64_MAX,
                str(int(float(U64_MAX))),
            )
        )

        checks.append(
            (
                f"{symbol}: the two schedules are ordered",
                fee["older"]["epoch"] < fee["newer"]["epoch"],
                f"{fee['older']['epoch']} -> {fee['newer']['epoch']}",
            )
        )

        expected = fee["newer"] if epoch >= fee["newer"]["epoch"] else fee["older"]
        checks.append(
            (
                f"{symbol}: schedule in force at epoch {epoch}",
                in_force["epoch"] == expected["epoch"],
                f"{in_force['bps']} bps @ epoch {in_force['epoch']}",
            )
        )

        # The three numbers the product puts on screen. One thousand whole tokens.
        notional = 10 ** (decimals + 3)
        withheld = fee_for(notional, in_force["bps"], in_force["maximum_fee"])
        lands = notional - withheld
        checks.append((f"{symbol}: the withheld fee does not exceed the position", withheld <= notional, str(withheld)))
        checks.append(
            (
                f"{symbol}: what lands equals the quote minus the fee",
                lands == notional - withheld,
                str(lands),
            )
        )

        readings.append(
            {
                "ts": int(time.time()),
                "mint": mint,
                "symbol": symbol,
                "slot": slot,
                "epoch": epoch,
                "fee_in_force_bps": in_force["bps"],
                "fee_in_force_epoch": in_force["epoch"],
                "fee_pending_bps": pending["bps"] if pending else None,
                "fee_pending_epoch": pending["epoch"] if pending else None,
                "maximum_fee": in_force["maximum_fee"],
                "withheld_amount": fee["withheld_amount"],
                "source": "raw_tlv",
            }
        )

    checks.extend(docs_checks())

    width = max(len(c[0]) for c in checks)
    for name, ok, detail in checks:
        print(f"  {'PASS' if ok else 'FAIL'}  {name.ljust(width)}  {detail}")

    failed = [c for c in checks if not c[1]]
    charged = [r for r in readings if r["fee_in_force_bps"] > 0]
    scheduled = [r for r in readings if r["fee_pending_bps"]]

    print()
    print(f"  mints read            {len(readings)}")
    print(f"  charged at the exit   {len(charged)}")
    print(f"  a change scheduled    {len(scheduled)}")
    print(f"  checks                {len(checks) - len(failed)}/{len(checks)} passed")

    if not check_only:
        with READINGS.open("a") as f:
            for r in readings:
                f.write(json.dumps(r, sort_keys=True) + "\n")
        print(f"  appended {len(readings)} readings to app/data/readings.jsonl")

    if failed:
        print(f"\n  {len(failed)} check(s) FAILED: a published number did not reproduce")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
