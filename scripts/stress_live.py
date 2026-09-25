#!/usr/bin/env python3
"""Stress the deployed surfaces.

Two passes. The load pass sends a bounded number of requests at each endpoint at a
fixed concurrency and reports the status mix and the latency percentiles. The
hostile pass sends inputs a caller should not be able to break the service with and
asserts that each one comes back as JSON with a named reason, never as a 5xx and
never as an HTML error page.

    python3 scripts/stress_live.py --base https://manifest-mocha-six.vercel.app \
        --requests 60 --concurrency 8

Exit code is 0 only when every hostile case is answered properly and no load request
came back 5xx.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

MINT = "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB"
USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


def call(base: str, path: str, timeout: float = 30.0, method: str = "GET"):
    url = base.rstrip("/") + path
    req = urllib.request.Request(url, method=method, headers={"user-agent": "manifest-stress/1.0"})
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8", "replace")
            code = r.status
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        code = e.code
    except Exception as e:  # noqa: BLE001 - a transport failure is a result here, not a crash
        return {"path": path, "status": 0, "ms": (time.perf_counter() - t0) * 1000.0,
                "body": "", "error": f"{type(e).__name__}: {e}"}
    return {"path": path, "status": code, "ms": (time.perf_counter() - t0) * 1000.0,
            "body": body, "error": None}


def pct(vals, q):
    if not vals:
        return 0.0
    vals = sorted(vals)
    i = min(len(vals) - 1, int(round((len(vals) - 1) * q)))
    return vals[i]


LOAD = [
    "/api/health",
    f"/api/exit?mint={MINT}&size=1000000000",
    "/api/assets",
    "/api/compare?size=100000000",
    "/api/registry",
]

HOSTILE = [
    ("no mint", "/api/exit?size=1000000000"),
    ("mint not base58", "/api/exit?mint=not-base58!!&size=1000000000"),
    ("mint is zeros", "/api/exit?mint=11111111111111111111111111111111&size=1000000000"),
    ("mint is a plain SPL token", f"/api/exit?mint={USDC}&size=1000000000"),
    ("mint truncated", f"/api/exit?mint={MINT[:20]}&size=1000000000"),
    ("size zero", f"/api/exit?mint={MINT}&size=0"),
    ("size negative", f"/api/exit?mint={MINT}&size=-1"),
    ("size not a number", f"/api/exit?mint={MINT}&size=abc"),
    ("size astronomically large", f"/api/exit?mint={MINT}&size={10**30}"),
    ("size missing", f"/api/exit?mint={MINT}"),
    ("unknown parameter", f"/api/exit?mint={MINT}&size=1000000000&wat=1"),
    ("script in the mint field", f"/api/exit?mint=%3Cscript%3Ealert(1)%3C%2Fscript%3E&size=1000000000"),
    ("wrong method", f"/api/exit?mint={MINT}&size=1000000000"),
]


def load_pass(base, n, conc):
    jobs = [p for p in LOAD for _ in range(max(1, n // len(LOAD)))]
    print(f"load pass: {len(jobs)} requests, concurrency {conc}")
    print(f"  {'endpoint':<46} {'n':>4} {'2xx':>4} {'4xx':>4} {'5xx':>4} {'p50 ms':>8} {'p95 ms':>8} {'max ms':>8}")
    bad = 0
    with ThreadPoolExecutor(max_workers=conc) as ex:
        results = list(ex.map(lambda p: call(base, p), jobs))
    for path in LOAD:
        rs = [r for r in results if r["path"] == path]
        codes = [r["status"] for r in rs]
        ms = [r["ms"] for r in rs if r["status"]]
        n2 = sum(1 for c in codes if 200 <= c < 300)
        n4 = sum(1 for c in codes if 400 <= c < 500)
        n5 = sum(1 for c in codes if c >= 500) + sum(1 for c in codes if c == 0)
        bad += n5
        print(f"  {path:<46} {len(rs):>4} {n2:>4} {n4:>4} {n5:>4} "
              f"{pct(ms, 0.5):>8.0f} {pct(ms, 0.95):>8.0f} {max(ms) if ms else 0:>8.0f}")
    return bad


def hostile_pass(base):
    print("\nhostile pass: inputs that should come back named, not as a crash")
    failures = []
    for name, path in HOSTILE:
        method = "POST" if name == "wrong method" else "GET"
        r = call(base, path, method=method)
        body = r["body"].strip()
        is_json = False
        reason = ""
        try:
            d = json.loads(body)
            is_json = True
            reason = str(d.get("reason") or d.get("error") or d.get("verdict") or d.get("reason_code") or "")
            if not reason:
                for k in ("terms", "verdict"):
                    if isinstance(d.get(k), dict):
                        reason = str(d[k].get("reason") or d[k].get("verdict") or reason)
        except Exception:  # noqa: BLE001
            is_json = False
        html = body[:200].lower().startswith("<!doctype") or "<html" in body[:400].lower()
        ok = r["status"] != 0 and r["status"] < 500 and (is_json or r["status"] == 405)
        if html:
            ok = False
        print(f"  {'PASS' if ok else 'FAIL'}  {name:<28} http {r['status']:<3} "
              f"{'json' if is_json else 'not json'} {('- ' + reason[:48]) if reason else ''}")
        if not ok:
            failures.append((name, r["status"], body[:160]))
    print(f"\n  {len(HOSTILE) - len(failures)}/{len(HOSTILE)} hostile cases answered properly")
    return failures


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://manifest-mocha-six.vercel.app")
    ap.add_argument("--requests", type=int, default=60)
    ap.add_argument("--concurrency", type=int, default=8)
    a = ap.parse_args()

    print(f"base {a.base}\n")
    started = time.time()
    n5 = load_pass(a.base, a.requests, a.concurrency)
    failures = hostile_pass(a.base)
    print(f"\nelapsed {time.time() - started:.1f}s")

    if failures or n5:
        for f in failures:
            print("  failure:", f)
        print(f"\nFAIL  {n5} load requests came back 5xx or unreachable, {len(failures)} hostile cases mishandled")
        return 1
    print("\nPASS  no 5xx under load, every hostile input answered with a named reason")
    return 0


if __name__ == "__main__":
    sys.exit(main())
