"""Assert every RPC call includes a browser User-Agent header.

The public Solana mainnet RPC returns 403 without a browser UA. This test
inspects the module-level header builder to guarantee the header is present.
"""

from __future__ import annotations

from rpc import user_agent, _headers


def test_ua_header_present():
    h = _headers()
    assert "User-Agent" in h, "User-Agent header missing"
    ua = h["User-Agent"]
    assert "Mozilla" in ua or "Chrome" in ua, f"UA does not look like a browser: {ua}"


def test_user_agent_helper():
    assert user_agent()


if __name__ == "__main__":
    test_ua_header_present()
    test_user_agent_helper()
    print("ok")
