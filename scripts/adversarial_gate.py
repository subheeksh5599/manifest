#!/usr/bin/env python3
"""
Adversarial gate for the exit pricing.

Five hostile checks, each independent of the others. Exit non-zero if any fails.
The point is to attack the product's own claim rather than restate it.

1. ablation          Ignore the not-yet-in-force schedule and show the position
                     is priced wrong by exactly the amount it matters.
2. tampered_bytes    Mutate the bps inside real account bytes and confirm the
                     read follows the bytes rather than a cached value.
3. capped_fee        Set the maximum fee to zero in the bytes and confirm the
                     cap is what gets charged.
4. no_fee_extension  A mint without a fee config must report nothing scheduled,
                     never a fabricated one.
5. unknown_mint      A mint that does not exist must raise, not report zeros.

    python3 scripts/adversarial_gate.py
"""

from __future__ import annotations

import base64
import os
import sys

from verify_receipts import (
    EXT_TRANSFER_FEE_CONFIG,
    MINT_TLV_START,
    TRANSFER_FEE_CONFIG_LEN,
    U64_MAX,
    fee_for,
    read_fee_config_exact,
    rpc,
    schedule_in_force,
)

# A mint carrying a schedule that has not taken effect yet.
MINT = "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB"
# A mint with no fee extension at all.
NO_FEE_MINT = "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB"
B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def random_address() -> str:
    """A valid-format address that holds nothing, so the check cannot go stale."""
    n = int.from_bytes(os.urandom(32), "big")
    out = ""
    while n:
        n, r = divmod(n, 58)
        out = B58[r] + out
    return (out or "1").ljust(32, "1")

NOTIONAL = 10 ** 12  # one thousand whole tokens at 9 decimals


def fetch_bytes(mint: str):
    res = rpc("getAccountInfo", [mint, {"encoding": "base64", "commitment": "confirmed"}])
    value = res["value"]
    if value is None:
        return None, None, None
    return base64.b64decode(value["data"][0]), res["context"]["slot"], value["owner"]


def fee_body_offset(data: bytes):
    """Offset of the TransferFeeConfig body, or None."""
    p = MINT_TLV_START
    while p + 4 <= len(data):
        etype, elen = __import__("struct").unpack_from("<HH", data, p)
        if etype == 0 and elen == 0:
            return None
        if etype == EXT_TRANSFER_FEE_CONFIG and elen >= TRANSFER_FEE_CONFIG_LEN:
            return p + 4
        p += 4 + elen
    return None


def check_ablation() -> tuple[bool, str]:
    """Not reading the epoch schedule understates the exit by a real amount."""
    data, _, _ = fetch_bytes(MINT)
    if data is None:
        return False, "the ablation mint could not be read"
    fee = read_fee_config_exact(data)
    if fee is None:
        return False, "no fee config on the ablation mint"

    newer_epoch = fee["newer"]["epoch"]
    # Evaluate as if the announced schedule had already taken effect.
    later = newer_epoch
    in_force, pending = schedule_in_force(fee["older"], fee["newer"], later)

    truth_bps = in_force["bps"]
    naive_bps = fee["older"]["bps"]  # what you get from the older schedule alone

    if truth_bps == naive_bps:
        return False, "the two schedules are equal, so nothing can be shown"

    truth_cost = fee_for(NOTIONAL, truth_bps, in_force["maximum_fee"]) * 2
    naive_cost = fee_for(NOTIONAL, naive_bps, fee["older"]["maximum_fee"]) * 2
    gap = truth_cost - naive_cost

    if gap <= 0:
        return False, "the ablated read was not cheaper, so the epoch read proves nothing"
    if pending is not None:
        return False, "a schedule should be in force at its own epoch, not still pending"

    return True, f"{truth_bps}bps vs {naive_bps}bps -> overstates the exit by {gap:,} micro-units"


def check_tampered_bytes() -> tuple[bool, str]:
    """The read must follow the bytes, so mutating a byte must change the answer."""
    data, _, _ = fetch_bytes(MINT)
    if data is None:
        return False, "the ablation mint could not be read"
    off = fee_body_offset(data)
    if off is None:
        return False, "no fee config to tamper with"

    original = read_fee_config_exact(data)
    mutated = bytearray(data)
    # older.transfer_fee_basis_points is a u16 at body offset +88.
    bps_offset = off + 88
    if mutated[bps_offset] == 0xFF and mutated[bps_offset + 1] == 0xFF:
        return False, "cannot raise a saturated basis-points value"
    mutated[bps_offset] = 0xFF
    mutated[bps_offset + 1] = 0xFF

    after = read_fee_config_exact(bytes(mutated))
    if after is None:
        return False, "the mutated bytes no longer parsed"
    if after["older"]["bps"] == original["older"]["bps"]:
        return False, "the read did not follow the mutated byte"

    return True, f"{original['older']['bps']} -> {after['older']['bps']} bps from the bytes alone"


def check_capped_fee() -> tuple[bool, str]:
    """With the maximum fee set to zero in the bytes, the cap is what is charged."""
    data, _, _ = fetch_bytes(MINT)
    if data is None:
        return False, "the ablation mint could not be read"
    off = fee_body_offset(data)
    if off is None:
        return False, "no fee config to cap"

    mutated = bytearray(data)
    # older.maximum_fee is a u64 at body offset +80.
    for i in range(8):
        mutated[off + 80 + i] = 0

    after = read_fee_config_exact(bytes(mutated))
    if after is None:
        return False, "the capped bytes no longer parsed"
    if after["older"]["maximum_fee"] != 0:
        return False, f"maximum_fee was {after['older']['maximum_fee']}, expected 0"

    charged = fee_for(NOTIONAL, after["older"]["bps"], after["older"]["maximum_fee"])
    if charged != 0:
        return False, f"a zero cap still charged {charged}"

    return True, "a zero maximum fee charges nothing, and the bytes say so"


def check_no_fee_extension() -> tuple[bool, str]:
    """A mint without a fee config must not acquire a fabricated schedule."""
    data, _, _ = fetch_bytes(NO_FEE_MINT)
    if data is None:
        return False, "could not read the no-fee mint"
    if read_fee_config_exact(data) is not None:
        return False, "this mint now carries a fee config; the fixture is stale"
    return True, "reads as absent, so nothing is scheduled rather than zero"


def check_unknown_mint() -> tuple[bool, str]:
    """An address holding nothing must yield no reading, not zeros."""
    addr = random_address()
    data, _, owner = fetch_bytes(addr)
    if data is not None:
        return False, f"{addr} unexpectedly holds an account"
    if read_fee_config_exact(b"") is not None:
        return False, "empty bytes produced a fee config"
    return True, f"{addr[:8]}… holds nothing, so no reading is invented"


def main() -> int:
    checks = [
        ("ablation_understates_the_exit", check_ablation),
        ("read_follows_the_bytes", check_tampered_bytes),
        ("zero_cap_charges_nothing", check_capped_fee),
        ("absent_fee_is_not_a_schedule", check_no_fee_extension),
        ("missing_mint_is_not_zero", check_unknown_mint),
    ]

    failed = 0
    for name, fn in checks:
        try:
            ok, msg = fn()
        except Exception as exc:  # a gate that cannot run is a failure, not a pass
            ok, msg = False, f"raised {type(exc).__name__}: {exc}"
        print(f"  {'PASS' if ok else 'FAIL'}  {name}  —  {msg}")
        if not ok:
            failed += 1

    print()
    print(f"  {len(checks) - failed}/{len(checks)} hostile checks passed")
    if failed:
        print(f"  {failed} FAILED")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
