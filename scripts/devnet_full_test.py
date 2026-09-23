"""
Full devnet integration test — fresh plan, preflight, refusal, verify on-chain.

Usage: cd ~/manifest && source .venv/bin/activate && python3 scripts/devnet_full_test.py
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
        return Keypair.from_bytes(bytes(json.load(f)))


def run(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip()


def disc(name):
    return hashlib.sha256(f"global:{name}".encode()).digest()[:8]


def send(client, kp, ixs):
    bh = client.get_latest_blockhash().value.blockhash
    msg = Message.new_with_blockhash(ixs, kp.pubkey(), bh)
    tx = Transaction.new_unsigned(msg)
    tx.sign([kp], bh)
    sig = client.send_transaction(tx).value
    time.sleep(3)
    st = client.get_signature_statuses([sig]).value[0]
    return sig, st


def main():
    kp = load_keypair()
    client = Client(RPC)
    program = Pubkey.from_string(PROGRAM_ID)
    auth = kp.pubkey()
    print(f"Authority: {auth}")

    # Use a unique plan_id based on timestamp
    plan_id = int(time.time())
    plan_id_bytes = struct.pack("<Q", plan_id)
    print(f"Plan ID: {plan_id}")

    # Create Token-2022 mint
    mint_kp_path = "/tmp/manifest-test-mint2.json"
    run(f"solana-keygen new --outfile {mint_kp_path} --no-bip39-passphrase --force")
    mint_addr = run(f"solana-keygen pubkey {mint_kp_path}")
    run(
        f"spl-token create-token "
        f"--program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb "
        f"--decimals 9 --url {RPC} {mint_kp_path}"
    )
    print(f"Mint: {mint_addr}")
    mint_pub = Pubkey.from_string(mint_addr)

    # ── 1. create_plan ──
    plan_pda, _ = Pubkey.find_program_address(
        [b"plan", bytes(auth), plan_id_bytes], program
    )
    print(f"\n1. create_plan -> PDA {plan_pda}")

    ix_data = disc("create_plan")
    ix_data += plan_id_bytes
    ix_data += bytes(mint_pub)
    ix_data += struct.pack("<Q", 1_000_000_000)  # amount
    ix_data += struct.pack("<H", 100)              # max_slippage_bps
    ix_data += struct.pack("<H", 1000)             # ref_tolerance
    ix_data += struct.pack("<Q", 1_000_000_000)    # snapshot_multiplier

    accounts = [
        AccountMeta(plan_pda, False, True),
        AccountMeta(auth, True, True),
        AccountMeta(SYS_PROGRAM, False, False),
    ]
    sig, st = send(client, kp, [Instruction(program, ix_data, accounts)])
    print(f"   sig={sig}  err={st.err if st else 'no status'}")

    # Verify plan account exists and has correct data
    plan_info = client.get_account_info(plan_pda)
    if plan_info.value:
        plan_data = plan_info.value.data
        print(f"   Plan account size: {len(plan_data)} bytes (expected {8+32+8+32+8+2+2+1+8+8+2+8+1}={112})")
    else:
        print("   FAIL: plan account not found")
        return 1

    # ── 2. preflight ──
    print(f"\n2. preflight")
    ix_data2 = disc("preflight") + plan_id_bytes
    accounts2 = [
        AccountMeta(plan_pda, False, True),
        AccountMeta(mint_pub, False, False),
        AccountMeta(auth, True, False),
    ]
    try:
        sig2, st2 = send(client, kp, [Instruction(program, ix_data2, accounts2)])
        err2 = st2.err if st2 else None
        if err2:
            print(f"   FAIL: {err2}")
        else:
            print(f"   PASS sig={sig2}")
    except Exception as e:
        # Extract logs from the error
        err_str = str(e)
        if "AccountNotInitialized" in err_str:
            print(f"   Deserialization issue — Plan::LEN mismatch")
            # Check actual vs expected size
            print(f"   Account data len: {len(plan_data)}, Plan::LEN in code: 112")
        else:
            print(f"   Error: {err_str[:200]}")

    # ── 3. record_refusal ──
    print(f"\n3. record_refusal")
    nonce = int(time.time() * 1000) % (2**64)
    nonce_bytes = struct.pack("<Q", nonce)
    refusal_pda, _ = Pubkey.find_program_address(
        [b"refusal", bytes(auth), plan_id_bytes, nonce_bytes], program
    )
    reason = 2  # MultiplierStale
    cv = b"snap=1e9,live=2e9"

    ix_data3 = disc("record_refusal")
    ix_data3 += plan_id_bytes
    ix_data3 += nonce_bytes
    ix_data3 += struct.pack("<H", reason)
    ix_data3 += struct.pack("<I", len(cv)) + cv

    accounts3 = [
        AccountMeta(refusal_pda, False, True),
        AccountMeta(auth, True, True),
        AccountMeta(SYS_PROGRAM, False, False),
    ]
    sig3, st3 = send(client, kp, [Instruction(program, ix_data3, accounts3)])
    print(f"   sig={sig3}  err={st3.err if st3 else 'no status'}")

    # ── 4. Read back refusal ──
    print(f"\n4. Read back refusal account")
    ref_info = client.get_account_info(refusal_pda)
    if ref_info.value:
        rdata = ref_info.value.data
        print(f"   Refusal account size: {len(rdata)} bytes")
        # Skip 8-byte discriminator, then parse
        if len(rdata) >= 16:
            stored_plan_id = struct.unpack("<Q", bytes(rdata[8:16]))[0]
            print(f"   stored plan_id: {stored_plan_id} (expected {plan_id})")
            stored_authority = Pubkey.from_bytes(bytes(rdata[16:48]))
            print(f"   stored authority: {stored_authority}")
            result_type = rdata[48]
            print(f"   result_type: {result_type} (1=Refused)")
            reason_code = struct.unpack("<H", bytes(rdata[49:51]))[0]
            print(f"   reason_code: {reason_code}")
            cv_stored = bytes(rdata[51:115])
            cv_len = rdata[115]
            print(f"   check_value: {cv_stored[:cv_len].decode('utf-8', errors='replace')}")
    else:
        print("   FAIL: refusal account not found")

    # Summary
    bal = client.get_balance(auth).value / 1e9
    print(f"\n{'='*50}")
    print(f"Program:  {PROGRAM_ID}")
    print(f"Plan:     {plan_pda}")
    print(f"Refusal:  {refusal_pda}")
    print(f"Balance:  {bal:.4f} SOL")
    print(f"\nhttps://explorer.solana.com/address/{PROGRAM_ID}?cluster=devnet")
    print(f"https://explorer.solana.com/address/{plan_pda}?cluster=devnet")
    print(f"https://explorer.solana.com/address/{refusal_pda}?cluster=devnet")

    return 0


if __name__ == "__main__":
    sys.exit(main())
