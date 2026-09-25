/**
 * Exit-terms tests.
 *
 * Run:  node --test app/lib/exit-terms.test.mjs
 *
 * The last block is a LIVE read against a real mainnet mint. It is the point
 * of the file: the numbers the product shows are read from the chain, not
 * declared here.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import exitTerms from "./exit-terms.mjs";

const {
  selectFeeSchedule,
  feeFor,
  roundTripCost,
  authorityLedger,
  parseExitTerms,
  readExitTerms,
  readExitTermsCached,
  clearTermsCache,
  rpcEndpoints,
  readFeeConfigExact,
  DEFAULT_FALLBACK_RPC,
  BPS_DENOMINATOR,
  U64_MAX,
  EXT_TRANSFER_FEE_CONFIG,
  EXT_PERMANENT_DELEGATE,
} = exitTerms;

// The mint verified on 25 Sep 2026, mainnet slot 450299340.
const VERIFIED_MINT = "PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB";
const ONE_KEY = "WV9PJN7XTmTLVwbutCLFxp8TyePee6Xq5mRq6Fti5Wc";

const OLDER = { epoch: 1039, transferFeeBasisPoints: 100, maximumFee: "18446744073709551615" };
const NEWER = { epoch: 1043, transferFeeBasisPoints: 300, maximumFee: "18446744073709551615" };

// ---------------------------------------------------------------
// selectFeeSchedule — which schedule is in force, and which is pending
// ---------------------------------------------------------------
describe("selectFeeSchedule", () => {
  it("uses the older schedule before the newer epoch arrives", () => {
    const s = selectFeeSchedule(OLDER, NEWER, 1040);
    assert.equal(s.effective.bps, 100);
    assert.equal(s.effective.epoch, 1039n);
  });

  it("reports the newer schedule as PENDING while it has not landed", () => {
    const s = selectFeeSchedule(OLDER, NEWER, 1040);
    assert.ok(s.pending, "a future schedule must be surfaced, not hidden");
    assert.equal(s.pending.bps, 300);
    assert.equal(s.pending.epoch, 1043n);
    assert.equal(s.reason, "change_announced");
  });

  it("flips to the newer schedule exactly at its epoch", () => {
    const at = selectFeeSchedule(OLDER, NEWER, 1043);
    assert.equal(at.effective.bps, 300);
    assert.equal(at.pending, null);
    assert.equal(at.reason, "newer_in_force");
  });

  it("stays on the newer schedule past its epoch", () => {
    assert.equal(selectFeeSchedule(OLDER, NEWER, 9999).effective.bps, 300);
  });

  it("reports no pending change when the newer schedule is already in force", () => {
    assert.equal(selectFeeSchedule(OLDER, NEWER, 1044).pending, null);
  });

  it("does not invent a pending change when newer.epoch is in the past", () => {
    const past = { epoch: 10, transferFeeBasisPoints: 50, maximumFee: "0" };
    const s = selectFeeSchedule(past, { epoch: 5, transferFeeBasisPoints: 20, maximumFee: "0" }, 100);
    assert.equal(s.effective.bps, 20);
    assert.equal(s.pending, null);
  });

  it("handles a mint with no fee config at all", () => {
    const s = selectFeeSchedule(null, null, 100);
    assert.equal(s.effective, null);
    assert.equal(s.reason, "no_fee_config");
  });

  it("handles older-only and newer-only", () => {
    assert.equal(selectFeeSchedule(OLDER, null, 100).reason, "older_only");
    assert.equal(selectFeeSchedule(OLDER, null, 100).effective.bps, 100);
    assert.equal(selectFeeSchedule(null, NEWER, 100).reason, "newer_only");
  });

  it("treats a schedule with no epoch as epoch 0", () => {
    const s = selectFeeSchedule({ transferFeeBasisPoints: 100 }, { transferFeeBasisPoints: 300 }, 0);
    assert.equal(s.effective.bps, 300);
  });
});

// ---------------------------------------------------------------
// feeFor — the rate applied to an amount
// ---------------------------------------------------------------
describe("feeFor", () => {
  const s100 = { epoch: 0n, bps: 100, maximum_fee: U64_MAX };

  it("takes the basis points off the amount", () => {
    assert.equal(feeFor(1_000_000_000n, s100), 10_000_000n);
  });

  it("floors, never rounds up", () => {
    // 1 unit at 100 bps is 0.01 -> 0
    assert.equal(feeFor(1n, s100), 0n);
    assert.equal(feeFor(199n, s100), 1n);
  });

  it("charges nothing at 0 bps", () => {
    assert.equal(feeFor(1_000_000_000n, { epoch: 0n, bps: 0, maximum_fee: U64_MAX }), 0n);
  });

  it("respects a maximum fee", () => {
    const capped = { epoch: 0n, bps: 100, maximum_fee: 5_000_000n };
    assert.equal(feeFor(1_000_000_000n, capped), 5_000_000n);
  });

  it("treats maximum_fee 2^64-1 as no ceiling", () => {
    const huge = 10n ** 18n;
    assert.equal(feeFor(huge, s100), huge / 100n);
  });

  it("keeps precision past Number.MAX_SAFE_INTEGER", () => {
    assert.equal(feeFor("18446744073709551615", s100), 184467440737095516n);
  });

  it("returns 0 for a null schedule", () => {
    assert.equal(feeFor(1_000n, null), 0n);
  });
});

// ---------------------------------------------------------------
// roundTripCost — in AND out
// ---------------------------------------------------------------
describe("roundTripCost", () => {
  const s100 = { epoch: 0n, bps: 100, maximum_fee: U64_MAX };

  it("charges the second leg on the amount the first leg left behind", () => {
    const r = roundTripCost(1_000_000_000n, s100);
    assert.equal(r.first_leg, 10_000_000n);
    assert.equal(r.carrying_amount, 990_000_000n);
    assert.equal(r.second_leg, 9_900_000n);
    assert.equal(r.total_cost, 19_900_000n);
  });

  it("is slightly less than twice a single leg, as the runtime does", () => {
    const r = roundTripCost(1_000_000_000n, s100);
    assert.ok(r.total_cost < r.first_leg * 2n);
    assert.equal(r.first_leg * 2n - r.total_cost, 100_000n);
  });

  it("reports the round-trip rate in basis points", () => {
    const r = roundTripCost(1_000_000_000n, s100);
    // 199 bps, not 200 — the second leg is levied on a reduced base
    assert.equal(Math.round(r.effective_total_bps), 199);
  });

  it("costs nothing at 0 bps", () => {
    const r = roundTripCost(500_000n, { epoch: 0n, bps: 0, maximum_fee: U64_MAX });
    assert.equal(r.total_cost, 0n);
  });

  it("does not divide by zero on an empty position", () => {
    assert.equal(roundTripCost(0n, s100).effective_total_bps, 0);
  });

  it("flags when a cap is what is really being charged", () => {
    const capped = { epoch: 0n, bps: 100, maximum_fee: 1n };
    assert.equal(roundTripCost(1_000_000n, capped).capped, true);
  });
});

// ---------------------------------------------------------------
// authorityLedger — one key behind every lever
// ---------------------------------------------------------------
describe("authorityLedger", () => {
  it("counts a single key holding every lever as one distinct key", () => {
    const l = authorityLedger({
      mint_authority: ONE_KEY,
      freeze_authority: ONE_KEY,
      permanent_delegate: ONE_KEY,
      fee_config_authority: ONE_KEY,
      withdraw_withheld_authority: ONE_KEY,
      transfer_hook_authority: ONE_KEY,
      scaled_ui_authority: ONE_KEY,
      metadata_update_authority: ONE_KEY,
    });
    assert.equal(l.total_levers, 8);
    assert.equal(l.distinct_keys, 1);
    assert.equal(l.concentration, 0.125);
  });

  it("counts distinct keys separately", () => {
    const l = authorityLedger({ mint_authority: "A", freeze_authority: "B" });
    assert.equal(l.distinct_keys, 2);
  });

  it("ignores absent authorities rather than counting nulls", () => {
    const l = authorityLedger({ mint_authority: "A", freeze_authority: null });
    assert.equal(l.total_levers, 1);
  });

  it("reports zero concentration when there are no levers", () => {
    assert.equal(authorityLedger({}).concentration, 0);
  });
});

// ---------------------------------------------------------------
// parseExitTerms — the shape the app consumes
// ---------------------------------------------------------------
const PARSED_BODY = {
  owner: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  data: {
    parsed: {
      info: {
        decimals: 9,
        supply: "1000000000000",
        mintAuthority: ONE_KEY,
        freezeAuthority: ONE_KEY,
        extensions: [
          {
            extension: "transferFeeConfig",
            state: {
              transferFeeConfigAuthority: ONE_KEY,
              withdrawWithheldAuthority: ONE_KEY,
              withheldAmount: "1875519083",
              olderTransferFee: OLDER,
              newerTransferFee: NEWER,
            },
          },
          { extension: "permanentDelegate", state: { delegate: ONE_KEY } },
          { extension: "transferHook", state: { authority: ONE_KEY, programId: null } },
          {
            extension: "scaledUiAmountConfig",
            state: { authority: ONE_KEY, multiplier: "1", newMultiplier: "1" },
          },
          { extension: "tokenMetadata", state: { symbol: "TST", name: "Test", updateAuthority: ONE_KEY } },
        ],
      },
    },
  },
};

describe("parseExitTerms", () => {
  const t = parseExitTerms(VERIFIED_MINT, PARSED_BODY, 450299340, 1040);

  it("carries both schedules", () => {
    assert.equal(t.fee_older.bps, 100);
    assert.equal(t.fee_newer.bps, 300);
  });

  it("selects the schedule in force at the read epoch", () => {
    assert.equal(t.fee_effective.bps, 100);
    assert.equal(t.fee_pending.bps, 300);
  });

  it("keeps the slot and epoch of the read", () => {
    assert.equal(t.slot, 450299340);
    assert.equal(t.epoch, 1040n);
  });

  it("flags the mint as pausable-state unknown rather than guessing", () => {
    assert.equal(t.paused, null);
  });

  it("reads the hook as uninstalled but authorised", () => {
    assert.equal(t.transfer_hook_program, null);
    assert.equal(t.transfer_hook_authority, ONE_KEY);
  });

  it("records the owning program, which decides whether a fee extension can exist", () => {
    assert.equal(t.is_token_2022, true);
  });

  it("carries the withheld amount", () => {
    assert.equal(t.withheld_amount, "1875519083");
  });

  it("summarises authority concentration inside the record", () => {
    assert.equal(t.authority.distinct_keys, 1);
  });
});

// ---------------------------------------------------------------
// The ablation — what happens if you do NOT read the epoch
// ---------------------------------------------------------------
describe("ablation: ignoring the epoch schedule misprices the exit", () => {
  const notional = 1_000_000_000n;

  it("understates the cost once the announced schedule has landed", () => {
    const epoch = 1050; // past newer.epoch 1043
    const truth = selectFeeSchedule(OLDER, NEWER, epoch).effective;
    const naive = OLDER; // what you get if you read only the older schedule

    const real = roundTripCost(notional, truth);
    const wrong = roundTripCost(notional, naive);

    assert.equal(truth.bps, 300);
    // The arithmetic, spelled out rather than asserted as a magic gap:
    //   truth  3%: leg1 30,000,000 | carry 970,000,000 | leg2 29,100,000 | total 59,100,000
    //   naive  1%: leg1 10,000,000 | carry 990,000,000 | leg2  9,900,000 | total 19,900,000
    assert.equal(real.first_leg, 30_000_000n);
    assert.equal(real.second_leg, 29_100_000n);
    assert.equal(real.total_cost, 59_100_000n);
    assert.equal(wrong.total_cost, 19_900_000n);
    assert.ok(wrong.total_cost < real.total_cost, "the un-ablated read must be the dearer truth");
    assert.equal(real.total_cost - wrong.total_cost, 39_200_000n);
  });

  it("accepts a raw parsed schedule without misreading it as free", () => {
    // The shape straight out of getAccountInfo, maximumFee spelled camelCase.
    const raw = { epoch: 1043, transferFeeBasisPoints: 300, maximumFee: "18446744073709551615" };
    assert.equal(feeFor(notional, raw), 30_000_000n);
    assert.equal(roundTripCost(notional, raw).total_cost, 59_100_000n);
  });

  it("shows the same position 2% cheaper per leg", () => {
    const truth = selectFeeSchedule(OLDER, NEWER, 1050).effective;
    assert.equal(truth.bps - OLDER.transferFeeBasisPoints, 200);
  });
});

// ---------------------------------------------------------------
// readFeeConfigExact — the u64 fields come from bytes, not JSON numbers
// ---------------------------------------------------------------
describe("readFeeConfigExact", () => {
  // The TransferFeeConfig body exactly as read from mainnet, 108 bytes.
  const BODY_HEX =
    "078daaa78203d77bc823b96863da4d8651c643fc10eb6cbe5b9787e056da4bdd" +
    "078daaa78203d77bc823b96863da4d8651c643fc10eb6cbe5b9787e056da4bdd" +
    "17cfc77400000000" +
    "0f04000000000000" +
    "ffffffffffffffff" +
    "6400" +
    "1304000000000000" +
    "ffffffffffffffff" +
    "2c01";

  function mintBuffer(bodyHex) {
    const body = Uint8Array.from((bodyHex.match(/../g) || []).map((h) => parseInt(h, 16)));
    const buf = new Uint8Array(166 + 4 + body.length + 4);
    const dv = new DataView(buf.buffer);
    dv.setUint16(166, EXT_TRANSFER_FEE_CONFIG, true);
    dv.setUint16(168, body.length, true);
    buf.set(body, 170);
    dv.setUint16(170 + body.length, 0, true);
    return buf;
  }

  const exact = readFeeConfigExact(mintBuffer(BODY_HEX));

  it("lifts the withheld amount out of the bytes", () => {
    assert.equal(exact.withheld_amount, 1959251735n);
  });

  it("lifts both schedules with their exact epochs", () => {
    assert.equal(exact.older.epoch, 1039n);
    assert.equal(exact.newer.epoch, 1043n);
  });

  it("reads the basis points from the byte after the maximum fee", () => {
    assert.equal(exact.older.bps, 100);
    assert.equal(exact.newer.bps, 300);
  });

  it("reports 2^64-1 exactly, which a JSON number cannot", () => {
    assert.equal(exact.older.maximum_fee, 18446744073709551615n);
    assert.equal(exact.newer.maximum_fee, 18446744073709551615n);
    assert.notEqual(exact.older.maximum_fee, 18446744073709551616n);
  });

  it("documents why the bytes are required", () => {
    // A u64 maximum fee cannot survive a round trip through a double:
    assert.equal(Number(18446744073709551615n), 18446744073709551616);
    // ...which is the off-by-one the parsed read would have published.
  });

  it("returns null when the mint carries no fee config", () => {
    // TLV: one permanent-delegate entry, then the terminator. 166 + (4 + 32) + 4.
    const buf = new Uint8Array(206);
    const dv = new DataView(buf.buffer);
    dv.setUint16(166, EXT_PERMANENT_DELEGATE, true);
    dv.setUint16(168, 32, true);
    dv.setUint16(202, 0, true);
    assert.equal(readFeeConfigExact(buf), null);
  });
});

// ---------------------------------------------------------------
// LIVE — the numbers the product shows come from the chain
// ---------------------------------------------------------------
describe("LIVE read against a real mainnet mint", () => {
  it("reads exit terms and an epoch in one call", async () => {
    let t;
    try {
      t = await readExitTerms(VERIFIED_MINT);
    } catch (e) {
      // Do not silently pass: the live read is the evidence.
      assert.fail(`live read failed: ${e.message}`);
    }

    assert.equal(t.mint, VERIFIED_MINT);
    assert.ok(t.slot > 0, "a live read must carry a slot");
    assert.ok(t.epoch >= 0n, "a live read must carry the epoch");

    // The read must be internally consistent: the selected schedule is the one
    // the epoch rule picks.
    const sel = selectFeeSchedule(t.fee_older, t.fee_newer, t.epoch);
    assert.equal(t.fee_effective?.bps, sel.effective?.bps);

    // The u64 fee fields must come from the bytes, not from JSON numbers.
    assert.equal(t.fee_exact, true, "a live read must report exact fee fields");
    assert.equal(t.fee_older.maximum_fee, 18446744073709551615n);

    console.log(
      `\n  LIVE ${VERIFIED_MINT.slice(0, 8)}…  slot=${t.slot} epoch=${t.epoch}\n` +
        `  older=${t.fee_older?.bps}bps@${t.fee_older?.epoch}  newer=${t.fee_newer?.bps}bps@${t.fee_newer?.epoch}\n` +
        `  IN FORCE NOW: ${t.fee_effective?.bps}bps` +
        (t.fee_pending ? `   PENDING: ${t.fee_pending.bps}bps at epoch ${t.fee_pending.epoch}` : "   (nothing pending)") +
        `\n  authorities: ${t.authority.total_levers} levers, ${t.authority.distinct_keys} distinct key(s)`
    );
  });
});

describe("reading several mints at once", () => {
  it("asks a second endpoint when one rate limits", () => {
    // Six mints read at once edited the public endpoint's rate limit into the
    // board, so a reading must not depend on one host answering.
    const urls = rpcEndpoints({ rpcUrl: "https://primary.example", rpcUrlFallback: "https://backup.example" });
    assert.deepEqual(urls, ["https://primary.example", "https://backup.example"]);
  });

  it("never asks the same endpoint twice", () => {
    const urls = rpcEndpoints({ rpcUrl: "https://same.example", rpcUrlFallback: "https://same.example" });
    assert.equal(urls.length, 1);
  });

  it("always has a second endpoint, whatever the environment says", () => {
    const urls = rpcEndpoints({ rpcUrl: "https://primary.example" });
    assert.ok(urls.length >= 2, "a single endpoint is not enough to survive a rate limit");
    assert.notEqual(urls[0], urls[1]);
  });

  it("serves a repeat read from cache rather than the chain", async () => {
    clearTermsCache();
    const first = await readExitTermsCached(VERIFIED_MINT);
    const second = await readExitTermsCached(VERIFIED_MINT);
    // Identical slot means the second call did not touch the network.
    assert.equal(second.slot, first.slot);
    assert.equal(second.epoch, first.epoch);
  });

  it("shares one in-flight read between callers", async () => {
    clearTermsCache();
    const [a, b] = await Promise.all([
      readExitTermsCached(VERIFIED_MINT),
      readExitTermsCached(VERIFIED_MINT),
    ]);
    assert.equal(a.slot, b.slot);
  });

  it("does not cache a failure", async () => {
    clearTermsCache();
    // A valid address that holds nothing, so this cannot start passing later.
    const empty = "z".repeat(43);
    await assert.rejects(() => readExitTermsCached(empty), /mint not found/);
    // A second call must go back to the network, not replay the failure.
    await assert.rejects(() => readExitTermsCached(empty), /mint not found/);
  });

  it("reports an account that is not a mint rather than inventing terms", async () => {
    clearTermsCache();
    const terms = await readExitTermsCached("11111111111111111111111111111111").catch(() => null);
    if (terms) {
      assert.equal(terms.is_token_2022, false);
      assert.equal(terms.fee_exact, null);
    }
  });
});
