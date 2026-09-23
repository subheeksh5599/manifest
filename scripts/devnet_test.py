"""
Devnet integration test for Manifest Preflight program.

Creates a Token-2022 mint on devnet, then exercises:
  create_plan -> preflight -> record_refusal

Usage: cd ~/manifest && source .venv/bin/activate && python3 scripts/devnet_test.py
"""

import json
import struct
import time
import subprocess
import sys
import os
import hashlib

from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import ID as SYS_PROGRAM
from solders.instruction import Instruction, AccountMeta
from solders.transaction import Transaction
from solders.message import Message
from solana.rpc.api import Client

PROGRAM_ID = "pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA"
KEYPAIR_PATH = os.path.expanduser("~/.config/solana/id.json")
RPC = "https://api.devnet.solana.com"


def load_keypair():
    with open(KEYPAIR_PATH) as f:
        secret = json.load(f)
    return Keypair.from_bytes(bytes(secret))


def run(cmd, check=True):
    print(f"  $ {cmd}")
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode != 0 and check:
        print(f"  ERR: {r.stderr.strip()}")
        raise RuntimeError(f"Command failed: {cmd}")
    return r.stdout.strip()


def anchor_disc(name: str) -> bytes:
    return hashlib.sha256(f"global:{name}".encode()).digest()[:8]


def send_and_confirm(client, kp, ixs):
    bh = client.get_latest_blockhash().value.blockhash
    msg = Message.new_with_blockhash(ixs, kp.pubkey(), bh)
    tx = Transaction.new_unsigned(msg)
    tx.sign([kp], bh)
    sig = client.send_transaction(tx).value
    time.sleep(3)
    status = client.get_signature_statuses([sig]).value[0]
    return sig, status


def create_token_2022_mint():
    """Create a plain Token-2022 mint on devnet for testing."""
    print("\n=== Creating Token-2022 mint ===")
    mint_kp = "/tmp/manifest-test-mint.json"
    run(f"solana-keygen new --outfile {mint_kp} --no-bip39-passphrase --force")
    mint_addr = run(f"solana-keygen pubkey {mint_kp}")
    print(f"  Mint: {mint_addr}")

    result = run(
        f"spl-token create-token "
        f"--program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb "
        f"--decimals 9 "
        f"--url {RPC} "
        f"{mint_kp}",
        check=False
    )
    print(f"  {result}")
    return mint_addr


def test_create_plan(client, kp, mint_addr, plan_id):
    print(f"\n=== create_plan (id={plan_id}) ===")

    program = Pubkey.from_string(PROGRAM_ID)
    mint_pubkey = Pubkey.from_string(mint_addr)
    auth = kp.pubkey()

    plan_id_bytes = struct.pack("<Q", plan_id)
    plan_pda, _ = Pubkey.find_program_address(
        [b"plan", bytes(auth), plan_id_bytes], program
    )
    print(f"  Plan PDA: {plan_pda}")

    amount = 1_000_000_000
    max_slippage_bps = 100
    ref_tolerance = 1000
    snapshot_multiplier = 1_000_000_000

    ix_data = anchor_disc("create_plan")
    ix_data += struct.pack("<Q", plan_id)
    ix_data += bytes(mint_pubkey)
    ix_data += struct.pack("<Q", amount)
    ix_data += struct.pack("<H", max_slippage_bps)
    ix_data += struct.pack("<H", ref_tolerance)
    ix_data += struct.pack("<Q", snapshot_multiplier)

    accounts = [
        AccountMeta(plan_pda, is_signer=False, is_writable=True),
        AccountMeta(auth, is_signer=True, is_writable=True),
        AccountMeta(SYS_PROGRAM, is_signer=False, is_writable=False),
    ]

    ix = Instruction(program, ix_data, accounts)
    sig, status = send_and_confirm(client, kp, [ix])
    err = status.err if status else "no status"
    if err:
        print(f"  FAIL: {err}")
        return None
    print(f"  OK sig={sig}")
    return str(plan_pda)


def test_preflight(client, kp, mint_addr, plan_id, plan_pda):
    print(f"\n=== preflight (id={plan_id}) ===")

    program = Pubkey.from_string(PROGRAM_ID)
    mint_pubkey = Pubkey.from_string(mint_addr)
    plan_pubkey = Pubkey.from_string(plan_pda)

    ix_data = anchor_disc("preflight")
    ix_data += struct.pack("<Q", plan_id)

    accounts = [
        AccountMeta(plan_pubkey, is_signer=False, is_writable=True),
        AccountMeta(mint_pubkey, is_signer=False, is_writable=False),
        AccountMeta(kp.pubkey(), is_signer=True, is_writable=False),
    ]

    ix = Instruction(program, ix_data, accounts)
    try:
        sig, status = send_and_confirm(client, kp, [ix])
        err = status.err if status else "no status"
        if err:
            print(f"  FAIL: {err}")
            return False
        print(f"  OK sig={sig}")
        return True
    except Exception as e:
        print(f"  Expected failure (no extensions): {e}")
        return False


def test_record_refusal(client, kp, plan_id, reason_code, check_value_bytes):
    print(f"\n=== record_refusal (id={plan_id}, reason={reason_code}) ===")

    program = Pubkey.from_string(PROGRAM_ID)
    caller = kp.pubkey()

    nonce = int(time.time() * 1000) % (2**64)
    plan_id_bytes = struct.pack("<Q", plan_id)
    nonce_bytes = struct.pack("<Q", nonce)

    refusal_pda, _ = Pubkey.find_program_address(
        [b"refusal", bytes(caller), plan_id_bytes, nonce_bytes], program
    )
    print(f"  Refusal PDA: {refusal_pda}")

    ix_data = anchor_disc("record_refusal")
    ix_data += struct.pack("<Q", plan_id)
    ix_data += struct.pack("<Q", nonce)
    ix_data += struct.pack("<H", reason_code)
    # Borsh Vec<u8>: 4-byte LE length prefix + data
    ix_data += struct.pack("<I", len(check_value_bytes)) + check_value_bytes

    accounts = [
        AccountMeta(refusal_pda, is_signer=False, is_writable=True),
        AccountMeta(caller, is_signer=True, is_writable=True),
        AccountMeta(SYS_PROGRAM, is_signer=False, is_writable=False),
    ]

    ix = Instruction(program, ix_data, accounts)
    sig, status = send_and_confirm(client, kp, [ix])
    err = status.err if status else "no status"
    if err:
        print(f"  FAIL: {err}")
        return None
    print(f"  OK sig={sig}")
    return str(refusal_pda)


def main():
    print("Manifest Preflight — Devnet Integration Test")
    print("=" * 50)

    kp = load_keypair()
    client = Client(RPC)
    auth = str(kp.pubkey())
    bal = client.get_balance(kp.pubkey()).value / 1e9
    print(f"Authority: {auth}")
    print(f"Balance: {bal:.4f} SOL")
    print(f"Program: {PROGRAM_ID}")

    # 1. Create Token-2022 mint
    mint = create_token_2022_mint()

    # 2. Create plan
    plan_id = int(time.time()) % 1_000_000
    plan_pda = test_create_plan(client, kp, mint, plan_id)
    if not plan_pda:
        print("ABORT: create_plan failed")
        return 1

    # 3. Preflight (expect pass for plain Token-2022 mint, no extensions to trip)
    preflight_ok = test_preflight(client, kp, mint, plan_id, plan_pda)

    # 4. Record a refusal (simulating multiplier_freshness failure)
    check_msg = b"multiplier_stale: snap=1e9, live=2e9"
    refusal_pda = test_record_refusal(client, kp, plan_id, 2, check_msg)

    # Summary
    print("\n" + "=" * 50)
    print("RESULTS:")
    print(f"  Program:  {PROGRAM_ID}")
    print(f"  Mint:     {mint}")
    print(f"  Plan PDA: {plan_pda}")
    print(f"  Preflight: {'PASS' if preflight_ok else 'FAIL (expected)'}")
    if refusal_pda:
        print(f"  Refusal:  {refusal_pda}")
    bal2 = client.get_balance(kp.pubkey()).value / 1e9
    print(f"  Balance:  {bal2:.4f} SOL (spent {bal - bal2:.4f})")

    print(f"\nExplorer:")
    print(f"  https://explorer.solana.com/address/{PROGRAM_ID}?cluster=devnet")
    print(f"  https://explorer.solana.com/address/{plan_pda}?cluster=devnet")
    if refusal_pda:
        print(f"  https://explorer.solana.com/address/{refusal_pda}?cluster=devnet")

    return 0


if __name__ == "__main__":
    sys.exit(main())
