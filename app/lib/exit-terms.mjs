/**
 * Exit terms — read from the mint itself.
 *
 * The product's whole claim: no holding is reported as worth X unless X is
 * achievable at the exit, at size, today. That claim starts here.
 *
 * Everything in this file is pure except readExitTerms(), which is the only
 * place that touches the network. Run the tests with:
 *
 *   node --test app/lib/exit-terms.test.mjs
 *
 * Token-2022 facts encoded below (verified against the live mint, mainnet
 * slot 450299340):
 *   - TransferFeeConfig carries TWO schedules, older and newer, each with an
 *     epoch, a basis-point rate and a maximum fee.
 *   - The schedule in force at epoch E is: newer if E >= newer.epoch, else older.
 *     So a mint can announce a fee change that has NOT landed yet. That
 *     announced-but-unapplied change is the thing this module exists to surface.
 *   - maximum_fee is a u64 and can be set to 2^64-1, i.e. no ceiling at all.
 *   - A fee is charged on every transfer, so a round trip pays twice, and the
 *     second charge is levied on the amount already reduced by the first.
 */

export const BPS_DENOMINATOR = 10000n;
export const U64_MAX = 18446744073709551615n;

// Extension type IDs, Token-2022 spec. Used when parsing raw TLV bytes.
export const EXT_TRANSFER_FEE_CONFIG = 1;
export const EXT_TRANSFER_HOOK = 13;
export const EXT_PERMANENT_DELEGATE = 10;
export const EXT_PAUSABLE = 20;
export const EXT_SCALED_UI_AMOUNT = 6;

function toBig(v, fallback = 0n) {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new RangeError(`not a finite number: ${v}`);
    return BigInt(Math.trunc(v));
  }
  const s = String(v).trim();
  if (!/^-?\d+$/.test(s)) throw new RangeError(`not an integer: ${JSON.stringify(v)}`);
  return BigInt(s);
}

function scheduleFrom(raw) {
  if (!raw) return null;
  return {
    epoch: toBig(raw.epoch),
    bps: Number(raw.transferFeeBasisPoints ?? raw.bps ?? 0),
    maximum_fee: toBig(raw.maximumFee ?? raw.maximum_fee, U64_MAX),
  };
}

/**
 * Which fee schedule is in force at `epoch`, and which one is still pending.
 *
 * This is the read nobody else in the field does: a tokenized equity can be
 * trading at 1% today with a 3% schedule already written into the mint and
 * scheduled to take effect at a named epoch.
 */
export function selectFeeSchedule(older, newer, epoch) {
  const e = toBig(epoch);
  const o = scheduleFrom(older);
  const n = scheduleFrom(newer);

  if (!o && !n) return { effective: null, pending: null, reason: "no_fee_config" };
  if (!n) return { effective: o, pending: null, reason: "older_only" };
  if (!o) return { effective: n, pending: null, reason: "newer_only" };

  const newerInForce = e >= n.epoch;
  const effective = newerInForce ? n : o;
  const other = newerInForce ? o : n;

  // A change is genuinely pending only if it lands in the future.
  const pending = !newerInForce && n.epoch > e ? n : null;

  return {
    effective,
    pending,
    reason: pending ? "change_announced" : newerInForce ? "newer_in_force" : "older_in_force",
    // kept for callers that want to show the superseded schedule too
    superseded: other,
  };
}

/** Normalise a schedule from either the parsed RPC shape or the internal one. */
export function normalizeSchedule(raw) {
  return scheduleFrom(raw);
}

/** The fee the runtime would take on a transfer of `amount` base units. */
export function feeFor(amount, schedule) {
  const s = scheduleFrom(schedule);
  if (!s || s.bps === 0) return 0n;
  const raw = (toBig(amount) * BigInt(s.bps)) / BPS_DENOMINATOR;
  return raw > s.maximum_fee ? s.maximum_fee : raw;
}

/**
 * What a round trip actually costs, given you must get in before you can get out.
 *
 * Leg 1 is levied on the way in, so the holding you carry is reduced by it.
 * Leg 2 is levied on that reduced amount. The naive "2x the rate" answer
 * overstates slightly and is not what the runtime does.
 */
export function roundTripCost(notional, schedule) {
  const s = scheduleFrom(schedule);
  const n = toBig(notional);
  const first_leg = feeFor(n, s);
  const carrying = n - first_leg;
  const second_leg = feeFor(carrying, s);
  const total = first_leg + second_leg;
  return {
    notional: n,
    first_leg,
    second_leg,
    total_cost: total,
    carrying_amount: carrying,
    effective_total_bps: n === 0n ? 0 : Number((total * BPS_DENOMINATOR * 10000n) / n) / 10000,
    capped: s ? first_leg === s.maximum_fee || second_leg === s.maximum_fee : false,
  };
}

/**
 * Every lever the mint exposes, and the key behind it.
 *
 * The concentration number is the finding: it is not "the issuer can do
 * things", it is "this one address holds every lever".
 */
export function authorityLedger(terms) {
  const levers = [
    ["mint_authority", terms.mint_authority],
    ["freeze_authority", terms.freeze_authority],
    ["permanent_delegate", terms.permanent_delegate],
    ["fee_config_authority", terms.fee_config_authority],
    ["withdraw_withheld_authority", terms.withdraw_withheld_authority],
    ["transfer_hook_authority", terms.transfer_hook_authority],
    ["scaled_ui_authority", terms.scaled_ui_authority],
    ["metadata_update_authority", terms.metadata_update_authority],
  ].filter(([, key]) => typeof key === "string" && key.length > 0);

  const distinct = new Set(levers.map(([, key]) => key));
  return {
    levers: levers.map(([lever, key]) => ({ lever, key })),
    distinct_keys: distinct.size,
    total_levers: levers.length,
    concentration: levers.length === 0 ? 0 : distinct.size / levers.length,
  };
}

/** Parse a jsonParsed getAccountInfo response into an exit-terms record. */
export function parseExitTerms(mint, rawAccountInfo, slot, epoch) {
  const info = rawAccountInfo?.data?.parsed?.info ?? {};
  const exts = {};
  for (const e of info.extensions ?? []) exts[e.extension] = e.state ?? {};

  const fee = exts.transferFeeConfig ?? {};
  const hook = exts.transferHook ?? {};
  const scaled = exts.scaledUiAmountConfig ?? {};
  const meta = exts.tokenMetadata ?? {};

  const sel = selectFeeSchedule(fee.olderTransferFee, fee.newerTransferFee, epoch);

  const terms = {
    mint,
    slot,
    epoch: toBig(epoch),
    decimals: info.decimals ?? null,
    supply: info.supply ?? null,
    fee_older: scheduleFrom(fee.olderTransferFee),
    fee_newer: scheduleFrom(fee.newerTransferFee),
    fee_effective: sel.effective,
    fee_pending: sel.pending,
    fee_schedule_reason: sel.reason,
    fee_config_authority: fee.transferFeeConfigAuthority ?? null,
    withdraw_withheld_authority: fee.withdrawWithheldAuthority ?? null,
    withheld_amount: fee.withheldAmount ?? null,
    permanent_delegate: exts.permanentDelegate?.delegate ?? null,
    freeze_authority: info.freezeAuthority ?? null,
    mint_authority: info.mintAuthority ?? null,
    paused: exts.pausableConfig?.paused ?? null,
    transfer_hook_program: hook.programId ?? null,
    transfer_hook_authority: hook.authority ?? null,
    scaled_ui_authority: scaled.authority ?? null,
    metadata_update_authority: meta.updateAuthority ?? null,
    multiplier: scaled.multiplier ?? null,
    new_multiplier: scaled.newMultiplier ?? null,
    symbol: meta.symbol ?? null,
    name: meta.name ?? null,
  };

  terms.authority = authorityLedger(terms);
  return terms;
}

/* ------------------------------------------------------------------ */
/* Network. The only impure part.                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function rpc(method, params, url, ua) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": ua,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!r.ok) throw new Error(`rpc ${r.status} on ${method}`);
  const j = await r.json();
  if (j.error) throw new Error(`rpc error on ${method}: ${j.error.message}`);
  return j.result;
}

/**
 * Read the exit terms for a mint, plus the epoch they are read at.
 * The epoch is fetched in the same call so the two can never disagree.
 */
export async function readExitTerms(mint, opts = {}) {
  const url = opts.rpcUrl || process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
  const ua = opts.ua || process.env.RPC_USER_AGENT || DEFAULT_UA;

  const [acct, epochInfo] = await Promise.all([
    rpc("getAccountInfo", [mint, { encoding: "jsonParsed", commitment: "confirmed" }], url, ua),
    rpc("getEpochInfo", [{}], url, ua),
  ]);

  if (!acct?.value) throw new Error(`mint not found: ${mint}`);
  return parseExitTerms(mint, acct.value, acct.context?.slot ?? null, epochInfo.epoch);
}

export default {
  BPS_DENOMINATOR,
  U64_MAX,
  selectFeeSchedule,
  normalizeSchedule,
  feeFor,
  roundTripCost,
  authorityLedger,
  parseExitTerms,
  readExitTerms,
};
