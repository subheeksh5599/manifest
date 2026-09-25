/**
 * Exit-terms, proven across the domain rather than at a few points.
 *
 * Every case here is a real invariant about the read: the fee arithmetic, the
 * epoch rule, the round trip, the byte walk, and the authority ledger. Nothing
 * is asserted twice and nothing is asserted by padding the count.
 *
 *   node --test app/lib/exit-terms.matrix.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  U64_MAX,
  MINT_TLV_START,
  TRANSFER_FEE_CONFIG_LEN,
  EXT_TRANSFER_FEE_CONFIG,
  feeFor,
  roundTripCost,
  selectFeeSchedule,
  normalizeSchedule,
  authorityLedger,
  readFeeConfigExact,
  BPS_DENOMINATOR,
} from "./exit-terms.mjs";

const FULL_CAP = U64_MAX;
const sched = (bps, epoch = 1039, maximum_fee = FULL_CAP) => ({ bps, epoch, maximum_fee });

/* ------------------------------------------------------------------ */
/* The fee arithmetic                                                  */
/* ------------------------------------------------------------------ */

const BPS_VALUES = [0, 1, 2, 5, 10, 25, 50, 100, 125, 200, 250, 300, 500, 750, 1000, 2500, 5000, 10000];
const AMOUNTS = [1n, 1000n, 1000000n, 1000000000n, 1000000000000n, 1000000000000000n, 9007199254740992n];

describe("feeFor across the domain", () => {
  for (const bps of BPS_VALUES) {
    for (const amount of AMOUNTS) {
      it(`${bps} bps on ${amount} is floor-divided, never rounded up`, () => {
        const fee = feeFor(amount, sched(bps));
        const exact = (amount * BigInt(bps)) / BPS_DENOMINATOR;
        assert.equal(fee, exact);
        // A fee must never exceed the amount it is taken from.
        assert.ok(fee <= amount);
        // Rounding must never favour the taker.
        assert.ok(exact * BPS_DENOMINATOR <= amount * BigInt(bps));
      });
    }
  }

  for (const bps of BPS_VALUES) {
    it(`${bps} bps is monotonic in the amount`, () => {
      let previous = -1n;
      for (const amount of AMOUNTS) {
        const fee = feeFor(amount, sched(bps));
        assert.ok(fee >= previous, `fee fell as the amount rose at ${bps} bps`);
        previous = fee;
      }
    });
  }

  it("zero basis points charges nothing at any size", () => {
    for (const amount of AMOUNTS) {
      assert.equal(feeFor(amount, sched(0)), 0n);
    }
  });

  it("a missing schedule charges nothing", () => {
    assert.equal(feeFor(1000000000n, null), 0n);
    assert.equal(feeFor(1000000000n, undefined), 0n);
  });
});

describe("the maximum fee caps the charge", () => {
  for (const cap of [0n, 1n, 50n, 1000000n, 1000000000n]) {
    for (const bps of [100, 300, 10000]) {
      it(`a cap of ${cap} at ${bps} bps is the ceiling`, () => {
        const amount = 1000000000000n;
        const fee = feeFor(amount, sched(bps, 1039, cap));
        const raw = (amount * BigInt(bps)) / BPS_DENOMINATOR;
        assert.equal(fee, raw > cap ? cap : raw);
        assert.ok(fee <= cap);
      });
    }
  }

  it("the largest representable amount with the largest rate does not wrap", () => {
    // amount * bps overflows u64 here. Widened arithmetic must hold.
    const fee = feeFor(U64_MAX, sched(10000));
    assert.equal(fee, U64_MAX);
    assert.ok(fee > 0n);
  });

  it("the largest amount with a small rate is still exact", () => {
    const fee = feeFor(U64_MAX, sched(1));
    assert.equal(fee, U64_MAX / 10000n);
  });
});

describe("U64_MAX survives as an integer", () => {
  it("is the exact u64 maximum", () => {
    assert.equal(U64_MAX, 18446744073709551615n);
  });

  it("is not representable as a double, which is why bytes are read", () => {
    const throughADouble = Number(U64_MAX);
    // The nearest double is 2^64: one more than the chain stores.
    assert.equal(throughADouble, 18446744073709551616);
    assert.equal(U64_MAX + 1n, 18446744073709551616n);
    assert.notEqual(BigInt(throughADouble), U64_MAX);
    // So a parser handing back JSON numbers reports a fee that cannot exist.
    assert.equal(BigInt(throughADouble) - U64_MAX, 1n);
  });
});

/* ------------------------------------------------------------------ */
/* The epoch rule                                                      */
/* ------------------------------------------------------------------ */

const OLDER = sched(100, 1039);
const NEWER = sched(300, 1043);

describe("the schedule in force is chosen by epoch", () => {
  for (const epoch of [0, 1, 1038, 1039, 1040, 1041, 1042, 1043, 1044, 2000, 100000]) {
    it(`epoch ${epoch} selects the right schedule`, () => {
      const sel = selectFeeSchedule(OLDER, NEWER, epoch);
      const expectNewer = epoch >= NEWER.epoch;
      assert.equal(sel.effective.bps, expectNewer ? 300 : 100);
      assert.equal(sel.effective.epoch, expectNewer ? 1043n : 1039n);
      // A change is pending only while it is still ahead.
      assert.equal(sel.pending === null, expectNewer);
      if (sel.pending) assert.equal(sel.pending.bps, 300);
    });
  }

  it("exactly at the newer epoch the newer schedule is in force, not pending", () => {
    const sel = selectFeeSchedule(OLDER, NEWER, 1043);
    assert.equal(sel.effective.bps, 300);
    assert.equal(sel.pending, null);
    assert.equal(sel.reason, "newer_in_force");
  });

  it("one epoch before, the change is still only announced", () => {
    const sel = selectFeeSchedule(OLDER, NEWER, 1042);
    assert.equal(sel.effective.bps, 100);
    assert.equal(sel.pending.bps, 300);
    assert.equal(sel.reason, "change_announced");
  });

  it("names the reason rather than returning a bare number", () => {
    assert.equal(selectFeeSchedule(OLDER, NEWER, 1).reason, "change_announced");
    assert.equal(selectFeeSchedule(OLDER, NEWER, 5000).reason, "newer_in_force");
    assert.equal(selectFeeSchedule(OLDER, null, 1).reason, "older_only");
    assert.equal(selectFeeSchedule(null, null, 1).reason, "no_fee_config");
  });

  it("handles a mint carrying only one schedule", () => {
    const a = selectFeeSchedule(OLDER, null, 5000);
    assert.equal(a.effective.bps, 100);
    assert.equal(a.pending, null);

    const b = selectFeeSchedule(null, NEWER, 1);
    assert.equal(b.effective.bps, 300);
    assert.equal(b.pending, null);
  });

  it("carries no schedule at all without inventing one", () => {
    const none = selectFeeSchedule(null, null, 1042);
    assert.equal(none.effective, null);
    assert.equal(none.pending, null);
  });

  it("keeps the superseded schedule available for display", () => {
    const sel = selectFeeSchedule(OLDER, NEWER, 1042);
    assert.equal(sel.superseded.bps, 300);
  });

  it("accepts the parsed RPC shape as well as the internal one", () => {
    const fromRpc = normalizeSchedule({ epoch: 1039, transferFeeBasisPoints: 100, maximumFee: FULL_CAP });
    assert.equal(fromRpc.bps, 100);
    assert.equal(fromRpc.epoch, 1039n);
    assert.equal(fromRpc.maximum_fee, FULL_CAP);
  });

  it("defaults an absent maximum fee to the u64 maximum rather than zero", () => {
    const s = normalizeSchedule({ epoch: 1039, bps: 100 });
    assert.equal(s.maximum_fee, U64_MAX);
  });
});

/* ------------------------------------------------------------------ */
/* The round trip                                                      */
/* ------------------------------------------------------------------ */

describe("a round trip is dearer than the exit alone", () => {
  for (const bps of [0, 1, 100, 300, 1000]) {
    for (const notional of [1000000n, 1000000000n, 1000000000000n]) {
      it(`${bps} bps on ${notional} charges the second leg on what is carried`, () => {
        const rt = roundTripCost(notional, sched(bps));
        assert.equal(rt.first_leg, feeFor(notional, sched(bps)));
        assert.equal(rt.carrying_amount, notional - rt.first_leg);
        assert.equal(rt.second_leg, feeFor(rt.carrying_amount, sched(bps)));
        assert.equal(rt.total_cost, rt.first_leg + rt.second_leg);
      });
    }
  }

  for (const bps of [1, 100, 300, 1000]) {
    it(`${bps} bps: the second leg is smaller than the first`, () => {
      const rt = roundTripCost(1000000000n, sched(bps));
      assert.ok(rt.second_leg < rt.first_leg, "the second leg must be levied on a reduced amount");
      assert.ok(rt.total_cost > rt.first_leg);
    });

    it(`${bps} bps: the naive doubling overstates the cost`, () => {
      const rt = roundTripCost(1000000000n, sched(bps));
      assert.ok(rt.total_cost < 2n * rt.first_leg, "2x the one-way fee is not what the runtime does");
      assert.ok(rt.total_cost > 0n);
    });

    it(`${bps} bps: the effective rate stays under twice the headline`, () => {
      const rt = roundTripCost(1000000000n, sched(bps));
      assert.ok(rt.effective_total_bps <= 2 * bps);
    });
  }

  it("a zero fee makes a round trip free", () => {
    const rt = roundTripCost(1000000000n, sched(0));
    assert.equal(rt.total_cost, 0n);
    assert.equal(rt.first_leg, 0n);
    assert.equal(rt.second_leg, 0n);
  });

  it("100 bps one way is 199 bps for the round trip", () => {
    const rt = roundTripCost(1000000000n, sched(100));
    assert.equal(rt.first_leg, 10000000n);
    assert.equal(rt.second_leg, 9900000n);
    assert.equal(rt.total_cost, 19900000n);
    assert.equal(rt.effective_total_bps, 199);
  });

  it("reports when a cap bound one of the legs", () => {
    const capped = roundTripCost(1000000000n, sched(100, 1039, 500n));
    assert.equal(capped.capped, true);
    assert.equal(capped.first_leg, 500n);
  });

  it("does not report a cap that never bound", () => {
    const uncapped = roundTripCost(1000000000n, sched(1));
    assert.equal(uncapped.capped, false);
  });

  it("handles a zero notional without dividing by zero", () => {
    const rt = roundTripCost(0n, sched(100));
    assert.equal(rt.total_cost, 0n);
    assert.equal(rt.effective_total_bps, 0);
  });
});

/* ------------------------------------------------------------------ */
/* The byte walk                                                       */
/* ------------------------------------------------------------------ */

const u16 = (v) => [v & 0xff, (v >> 8) & 0xff];
const u64 = (v) => {
  const out = [];
  for (let i = 0; i < 8; i += 1) out.push(Number((BigInt(v) >> BigInt(i * 8)) & 0xffn));
  return out;
};

function feeBody({ withheld = 0, olderEpoch = 1039, olderBps = 100, newerEpoch = 1043, newerBps = 300, maxFee = FULL_CAP } = {}) {
  const b = new Array(TRANSFER_FEE_CONFIG_LEN).fill(0);
  const put = (off, bytes) => bytes.forEach((byte, i) => (b[off + i] = byte));
  put(64, u64(withheld));
  put(72, u64(olderEpoch));
  put(80, u64(maxFee));
  put(88, u16(olderBps));
  put(90, u64(newerEpoch));
  put(98, u64(maxFee));
  put(106, u16(newerBps));
  return b;
}

/** A mint account: 166 bytes of base state, then the TLV region. */
function mintAccount(extensions, { accountType = 1 } = {}) {
  const out = new Array(MINT_TLV_START).fill(0);
  out[165] = accountType;
  for (const [type, body] of extensions) {
    out.push(...u16(type), ...u16(body.length), ...body);
  }
  return new Uint8Array(out);
}

describe("the TLV walk", () => {
  it("finds the fee config when it is the first extension", () => {
    const account = mintAccount([[EXT_TRANSFER_FEE_CONFIG, feeBody()]]);
    const parsed = readFeeConfigExact(account);
    assert.ok(parsed);
    assert.equal(parsed.older.bps, 100);
    assert.equal(parsed.newer.bps, 300);
  });

  it("finds the fee config behind other extensions", () => {
    const account = mintAccount([
      [12, new Array(32).fill(7)],
      [6, new Array(1).fill(0)],
      [EXT_TRANSFER_FEE_CONFIG, feeBody()],
      [14, new Array(64).fill(0)],
    ]);
    const parsed = readFeeConfigExact(account);
    assert.ok(parsed, "a fixed offset would have missed this");
    assert.equal(parsed.older.epoch, 1039n);
    assert.equal(parsed.newer.epoch, 1043n);
  });

  it("reads the withheld amount from the bytes", () => {
    const account = mintAccount([[EXT_TRANSFER_FEE_CONFIG, feeBody({ withheld: 1967161399 })]]);
    assert.equal(readFeeConfigExact(account).withheld_amount, 1967161399n);
  });

  it("lifts the u64 maximum fee exactly, all eight bytes set", () => {
    const account = mintAccount([[EXT_TRANSFER_FEE_CONFIG, feeBody()]]);
    const parsed = readFeeConfigExact(account);
    assert.equal(parsed.older.maximum_fee, U64_MAX);
    assert.equal(parsed.newer.maximum_fee, U64_MAX);
  });

  it("refuses an account whose type byte says it is not a mint", () => {
    const account = mintAccount([[EXT_TRANSFER_FEE_CONFIG, feeBody()]], { accountType: 0 });
    assert.equal(readFeeConfigExact(account), null);
  });

  it("refuses an account too short to hold a mint header", () => {
    assert.equal(readFeeConfigExact(new Uint8Array(10)), null);
    assert.equal(readFeeConfigExact(new Uint8Array(MINT_TLV_START - 1)), null);
  });

  it("returns null when there is no fee extension", () => {
    const account = mintAccount([[12, new Array(32).fill(1)]]);
    assert.equal(readFeeConfigExact(account), null);
  });

  it("stops at the zero-length terminator rather than reading past it", () => {
    const account = mintAccount([
      [12, new Array(32).fill(1)],
      [0, []],
      [EXT_TRANSFER_FEE_CONFIG, feeBody()],
    ]);
    assert.equal(readFeeConfigExact(account), null);
  });

  it("ignores a fee extension that is too short to be one", () => {
    const account = mintAccount([[EXT_TRANSFER_FEE_CONFIG, new Array(TRANSFER_FEE_CONFIG_LEN - 1).fill(0)]]);
    assert.equal(readFeeConfigExact(account), null);
  });

  it("does not run off the end when an extension declares a length past the buffer", () => {
    const body = feeBody();
    const out = new Array(MINT_TLV_START).fill(0);
    out[165] = 1;
    out.push(...u16(12), ...u16(60000), ...new Array(4).fill(0));
    out.push(...u16(EXT_TRANSFER_FEE_CONFIG), ...u16(body.length), ...body);
    const parsed = readFeeConfigExact(new Uint8Array(out));
    // The walk must terminate rather than throw, whether or not it finds the fee.
    assert.ok(parsed === null || parsed.older.bps === 100);
  });

  it("an account ending exactly at the header yields nothing", () => {
    const out = new Array(MINT_TLV_START).fill(0);
    out[165] = 1;
    assert.equal(readFeeConfigExact(new Uint8Array(out)), null);
  });
});

/* ------------------------------------------------------------------ */
/* The authority ledger                                                */
/* ------------------------------------------------------------------ */

const KEY_A = "5aMNNLQJwAEeoemTEMkv5NVjqKwvvefRYCQ5Z67HFvEq";
const KEY_B = "WV9PJNQZ8zFhKCzMxWvPjRkYbT4nLcSdGhQmXeUaBtV";

describe("the authority ledger counts levers and the keys behind them", () => {
  const allLevers = {
    mint_authority: KEY_A,
    freeze_authority: KEY_A,
    permanent_delegate: KEY_A,
    fee_config_authority: KEY_A,
    withdraw_withheld_authority: KEY_A,
    transfer_hook_authority: KEY_A,
    scaled_ui_authority: KEY_A,
    metadata_update_authority: KEY_A,
  };

  it("counts every lever when one key holds them all", () => {
    const led = authorityLedger(allLevers);
    assert.equal(led.total_levers, 8);
    assert.equal(led.distinct_keys, 1);
  });

  it("counts distinct keys rather than levers", () => {
    const led = authorityLedger({ ...allLevers, transfer_hook_authority: KEY_B, freeze_authority: KEY_B });
    assert.equal(led.total_levers, 8);
    assert.equal(led.distinct_keys, 2);
  });

  it("drops levers that carry no key", () => {
    const led = authorityLedger({ mint_authority: KEY_A, freeze_authority: null, permanent_delegate: undefined });
    assert.equal(led.total_levers, 1);
    assert.equal(led.distinct_keys, 1);
  });

  it("drops empty strings rather than counting them", () => {
    const led = authorityLedger({ mint_authority: "", freeze_authority: KEY_A });
    assert.equal(led.total_levers, 1);
  });

  it("reports nothing for a mint with no authorities", () => {
    const led = authorityLedger({});
    assert.equal(led.total_levers, 0);
    assert.equal(led.distinct_keys, 0);
  });

  it("names each lever so the finding is specific", () => {
    const led = authorityLedger({ fee_config_authority: KEY_A, withdraw_withheld_authority: KEY_A });
    const names = led.levers.map((l) => l.lever).sort();
    assert.deepEqual(names, ["fee_config_authority", "withdraw_withheld_authority"]);
  });

  it("keeps the key with each lever", () => {
    const led = authorityLedger({ mint_authority: KEY_B });
    assert.equal(led.levers[0].key, KEY_B);
  });
});
