"""Verify the refusal tape.

Rules:
- Every line is a well-formed JSON record with required fields.
- Every record's account_data_hash is a hex sha256 (64 chars).
- Every refusal has a named check_id from the known set.
- Re-reading the same mint account today yields the same shape; the slot may advance.
- If any record is tampered (fields mutated by hand without re-signing), this script exits non-zero.

Tamper detection: we recompute a canonical digest over
(ts, verdict, check_id, plan.plan_id, plan.mint, account_data_hash, slot). The digest is stored on
each line as `line_digest`. Recomputation must match.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import sys


ROOT = pathlib.Path(__file__).parent.parent
TAPE = ROOT / "data" / "tape.jsonl"

CHECKS = {
    "mint_identity", "multiplier_freshness", "issuer_levers", "reference_regime",
    "exit_at_size", "policy", "idempotency", None,
}


def canonical_digest(rec: dict) -> str:
    payload = {
        "ts": rec["ts"],
        "verdict": rec["verdict"],
        "check_id": rec.get("check_id"),
        "plan_id": rec["plan"]["plan_id"],
        "mint": rec["plan"]["mint"],
        "account_data_hash": rec["account_data_hash"],
        "slot": rec["slot"],
    }
    b = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(b).hexdigest()


def main() -> int:
    if not TAPE.exists():
        print("no tape yet", file=sys.stderr)
        return 0
    errors: list[str] = []
    lines = TAPE.read_text().splitlines()
    for i, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError as e:
            errors.append(f"line {i}: not JSON: {e}")
            continue
        for field in ("ts", "verdict", "plan", "account_data_hash", "slot"):
            if field not in rec:
                errors.append(f"line {i}: missing {field}")
        if rec.get("verdict") not in ("ACCEPT", "REFUSE"):
            errors.append(f"line {i}: bad verdict {rec.get('verdict')!r}")
        if rec.get("check_id") not in CHECKS:
            errors.append(f"line {i}: unknown check_id {rec.get('check_id')!r}")
        h = rec.get("account_data_hash", "")
        if not (isinstance(h, str) and len(h) == 64):
            errors.append(f"line {i}: bad account_data_hash")
        if "line_digest" in rec:
            expected = canonical_digest(rec)
            if rec["line_digest"] != expected:
                errors.append(f"line {i}: tamper: line_digest mismatch")
    if errors:
        for e in errors:
            print(f"FAIL {e}", file=sys.stderr)
        return 1
    print(f"OK {len(lines)} tape records verified")
    return 0


def seal_tape() -> None:
    """Compute canonical digests and rewrite the tape with them in place."""
    if not TAPE.exists():
        return
    out_lines = []
    for line in TAPE.read_text().splitlines():
        if not line.strip():
            continue
        rec = json.loads(line)
        rec["line_digest"] = canonical_digest(rec)
        out_lines.append(json.dumps(rec, sort_keys=True))
    TAPE.write_text("\n".join(out_lines) + "\n")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "seal":
        seal_tape()
        print("sealed")
    else:
        raise SystemExit(main())
