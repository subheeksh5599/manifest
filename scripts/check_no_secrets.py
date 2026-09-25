#!/usr/bin/env python3
"""
Refuse to commit credentials.

Runs over the staged tree, so it catches a key on the way in rather than after
it has been pushed and indexed. Three things are looked for, in order of how
often they actually turn up:

  1. A Solana keypair, which is a JSON array of 64 small integers. This is the
     one that matters: it is a valid, unremarkable-looking .json file.
  2. A private key file: PEM blocks, OpenSSL, ssh keys.
  3. A .env file, and assignment lines naming a secret with a long value.

    python3 scripts/check_no_secrets.py            # staged files
    python3 scripts/check_no_secrets.py --all      # every tracked file
"""

import json
import re
import subprocess
import sys

# A 64-element array of integers, which is what `solana-keygen` writes.
KEYPAIR_JSON = re.compile(r"^\s*\[\s*\d{1,3}\s*(,\s*\d{1,3}\s*){63}\]\s*$")

# Multi-line private keys. The markers are assembled rather than written out,
# so that this file does not itself contain the thing it is looking for — which
# it did, and the hook refused to commit it.
_DASHES = "-" * 5
PEM = re.compile(
    re.escape(_DASHES + "BEGIN ")
    + r"(?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY"
    + re.escape(_DASHES)
)

# A name that says "this is a secret", on the left of an assignment, followed by
# something long enough to be one. Deliberately requires a long value so that
# `API_KEY=` in a template does not trip it.
SECRET_ASSIGN = re.compile(
    r"""(?ix)
    ^\s*
    (?:export\s+)?
    (?:[\w.]*?)
    ( private [_-]? key | secret | passwd | password | api [_-]? key
    | access [_-]? token | auth [_-]? token | seed [_-]? phrase | mnemonic )
    (?:[\w.]*?)
    \s*[:=]\s*
    ["']?
    (?!\$\{?[A-Z_]+\}?|your[_-]|xxx|placeholder|<|\.\.\.)
    ([A-Za-z0-9/+_\-]{20,})
    """
)

# Files whose whole purpose is to hold the real values.
ENV_FILE = re.compile(r"(^|/)\.env(\.|$)")
ENV_ALLOWED = re.compile(r"\.(example|sample|template)$")


def staged_files():
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
        capture_output=True, text=True, check=True,
    ).stdout
    return [f for f in out.split("\n") if f.strip()]


def tracked_files():
    out = subprocess.run(
        ["git", "ls-files"], capture_output=True, text=True, check=True
    ).stdout
    return [f for f in out.split("\n") if f.strip()]


def staged_bytes(path):
    r = subprocess.run(["git", "show", f":{path}"], capture_output=True)
    return r.stdout if r.returncode == 0 else None


def read_bytes(path):
    try:
        with open(path, "rb") as fh:
            return fh.read()
    except OSError:
        return None


def decode(raw):
    """Decode if this is text, and say so plainly if it is not.

    A guard that raises on a PNG blocks the commit it was meant to protect, and
    the next thing anybody does is commit with the hook skipped. Decoding is
    therefore total, and the decision about whether the file is text is made
    here rather than in an exception handler.
    """
    if not raw:
        return ""
    if b"\x00" in raw[:8192]:
        return None
    return raw.decode("utf-8", errors="replace")


def check_bytes(raw, path):
    """The markers, looked for in the bytes.

    Binaries are scanned rather than skipped: a private key inside a compiled
    artifact is still a private key, and it is the one thing a text-only scan
    would walk straight past.
    """
    if _DASHES.encode() + b"BEGIN " in raw and b"PRIVATE KEY" in raw:
        return "a private key file, and one that a text scan would not have read"
    return None


def check(path, text):
    """Return a reason, or None."""
    if not text:
        return None

    base = path.rsplit("/", 1)[-1]

    if base.endswith(".json") or KEYPAIR_JSON.match(text.strip()):
        stripped = text.strip()
        if KEYPAIR_JSON.match(stripped):
            try:
                arr = json.loads(stripped)
                if isinstance(arr, list) and len(arr) == 64:
                    return "a Solana keypair, written as a 64-element JSON array"
            except (ValueError, TypeError):
                pass

    if PEM.search(text):
        return "a private key file"

    if ENV_FILE.search(path) and not ENV_ALLOWED.search(path):
        return "a .env file, which is where the real values live"

    for line in text.splitlines():
        if line.lstrip().startswith("#"):
            continue
        m = SECRET_ASSIGN.search(line)
        if m:
            return f"a credential on one line ({m.group(1).strip()})"

    return None


def main():
    staged = "--all" not in sys.argv
    files = staged_files() if staged else tracked_files()
    scope = "staged" if staged else "tracked"

    found = []
    for path in files:
        raw = staged_bytes(path) if staged else read_bytes(path)
        if raw is None:
            continue

        reason = check_bytes(raw, path)
        if reason is None:
            text = decode(raw)
            if text is not None:
                reason = check(path, text)
        if reason:
            found.append((path, reason))

    if found:
        print(f"refusing: {len(found)} of {len(files)} {scope} files look like credentials", file=sys.stderr)
        for path, reason in found:
            print(f"  {path}: {reason}", file=sys.stderr)
        print("\nRemove it from the commit. If it was ever pushed, rotate it — "
              "removing the file does not remove it from history.", file=sys.stderr)
        return 1

    print(f"no credentials in {len(files)} {scope} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
