"""Thin JSON-RPC helper.

Every call includes a browser User-Agent because the public Solana mainnet RPC
returns 403 without one. If the primary endpoint fails, we try the fallback.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

import requests

DEFAULT_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _endpoints() -> list[str]:
    urls = [os.environ.get("RPC_URL", "https://api.mainnet-beta.solana.com")]
    fb = os.environ.get("RPC_URL_FALLBACK")
    if fb and fb not in urls:
        urls.append(fb)
    return urls


def _headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "User-Agent": os.environ.get("RPC_USER_AGENT", DEFAULT_UA),
        "Accept": "application/json",
    }


def rpc(method: str, params: list[Any], timeout: float = 20.0) -> dict[str, Any]:
    body = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
    last_err: Exception | None = None
    for url in _endpoints():
        try:
            r = requests.post(url, headers=_headers(), data=json.dumps(body), timeout=timeout)
            if r.status_code == 429:
                time.sleep(1.5)
                r = requests.post(url, headers=_headers(), data=json.dumps(body), timeout=timeout)
            r.raise_for_status()
            data = r.json()
            if "error" in data:
                # let caller decide what to do with typed RPC errors
                return data
            return data
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue
    raise RuntimeError(f"all RPC endpoints failed: {last_err}")


def user_agent() -> str:
    return _headers()["User-Agent"]
