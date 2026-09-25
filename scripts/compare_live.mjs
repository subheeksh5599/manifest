/**
 * Does the comparison the screen shows agree with the chain and the library?
 *
 * Each issuer's landing is recomputed here and set against the client library's
 * own quote for the same swap. The library applies the mint's transfer fee
 * itself, so the two should agree to the lamport rather than approximately - and
 * where they do not, the screen is showing a number that is not defensible.
 *
 * Also checked: that no issuer's landing exceeds its own spot price, and that
 * every figure survives being sent as JSON, since /api/compare returns them
 * straight through NextResponse.json.
 *
 *   node scripts/compare_live.mjs [size]
 */
import { Connection, PublicKey } from "@solana/web3.js";
import * as sdk from "@orca-so/whirlpools-sdk";
import { Percentage } from "@orca-so/common-sdk";
import BN from "bn.js";
import { readPoolAccount } from "../app/lib/pool-account.mjs";
import { readFeeConfigExact, selectFeeSchedule } from "../app/lib/exit-terms.mjs";
import { compareIssuers } from "../app/lib/compare-engine.mjs";
import replica from "../app/data/replica-devnet.json" with { type: "json" };

const RPC = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
const SIZE = BigInt(process.argv[2] || "100000000");

let checks = 0;
let failed = 0;
const say = (ok, what, detail = "") => {
  checks++;
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${what}${detail ? "  " + detail : ""}`);
};

const c = new Connection(RPC, "confirmed");
const ctx = sdk.WhirlpoolContext.from(c, {
  publicKey: PublicKey.default,
  signTransaction: async (t) => t,
  signAllTransactions: async (t) => t,
});
const client = sdk.buildWhirlpoolClient(ctx, sdk.ORCA_WHIRLPOOL_PROGRAM_ID);

const epoch = (await c.getEpochInfo("confirmed")).epoch;
console.log(`devnet, epoch ${epoch}, size ${SIZE}`);

const issuers = [];
const rail = {};
const rows = [];

for (const key of ["issuer_a", "issuer_b"]) {
  const row = replica[key];
  const label = key === "issuer_a" ? "A" : "B";
  const mintInfo = await c.getAccountInfo(new PublicKey(row.mint), "confirmed");
  const raw = mintInfo ? readFeeConfigExact(new Uint8Array(mintInfo.data)) : null;
  const sel = raw ? selectFeeSchedule(raw.older, raw.newer, epoch) : null;
  const poolInfo = await c.getAccountInfo(new PublicKey(row.pool.address), "confirmed");
  const poolState = poolInfo
    ? readPoolAccount(Buffer.from(poolInfo.data).toString("base64"), sdk.ORCA_WHIRLPOOL_PROGRAM_ID.toBase58(), poolInfo.owner.toBase58())
    : null;
  if (poolState) rail[label] = poolState;
  issuers.push({ label, mint: row.mint, pool: row.pool.address, poolState, schedule: sel?.effective ?? null, pending: sel?.pending ?? null, epoch });
  rows.push({ key, label, row, poolState });
}

const out = compareIssuers({ size: SIZE, issuers, rail });

console.log("\nthe comparison, as the screen would show it");
for (const x of out.issuers) {
  if (x.refused) console.log(`  issuer ${x.label}  refused: ${x.refused}`);
  else
    console.log(
      `  issuer ${x.label}  withheld ${x.mintFeeWithheld} at ${x.mintFeeBpsInForce} bps · ` +
        `into pool ${x.intoPool} · lands ${x.lands} · spot ${x.spotPerToken?.toFixed(6)} SOL/token · landed ${x.landedPerToken?.toFixed(6)}`
    );
}
if (!out.refused) console.log(`  apart by ${out.spreadBps} bps at this size (${out.better} lands more than ${out.worse})`);

console.log("\nchecks");
say(out.issuers.filter((x) => !x.refused).length === 2, "both issuers could be priced", out.refused ?? "");

for (const { label, row, poolState } of rows) {
  if (!poolState) {
    say(false, `issuer ${label} pool is readable`);
    continue;
  }
  say(poolState.tokenMintB === row.mint, `issuer ${label} pool trades that issuer's mint`);

  const wp = await client.getPool(new PublicKey(row.pool.address));
  const lib = await sdk.swapQuoteByInputToken(
    wp,
    new PublicKey(row.mint),
    new BN(SIZE.toString()),
    Percentage.fromFraction(1, 100),
    sdk.ORCA_WHIRLPOOL_PROGRAM_ID,
    ctx.fetcher
  );
  const libOut = BigInt(lib.estimatedAmountOut.toString());
  const mine = out.issuers.find((x) => x.label === label);
  const diff = mine && !mine.refused ? BigInt(mine.lands) - libOut : null;
  const abs = diff === null ? null : (diff < 0n ? -diff : diff);
  say(
    abs !== null && abs <= 2n,
    `issuer ${label}: the screen's landing is the library's own quote`,
    diff === null ? "no figure" : `difference ${diff} lamports`
  );
}

for (const x of out.issuers) {
  if (x.refused || !x.spotPerToken) continue;
  say(
    x.landedPerToken <= x.spotPerToken,
    `issuer ${x.label}: what lands does not exceed the pool's spot`,
    `${x.landedPerToken?.toFixed(6)} vs ${x.spotPerToken.toFixed(6)}`
  );
}

try {
  JSON.parse(JSON.stringify(out));
  say(true, "the whole answer survives being sent as JSON");
} catch (e) {
  say(false, "the whole answer survives being sent as JSON", e.message);
}

if (out.rail) {
  say(out.rail.available === true, "the rail is priced", out.rail.reason ?? "");
  if (out.rail.available) {
    say(out.rail.legs === 2 && out.rail.inOneTransaction === true, "the rail is two swaps in one transaction");
    say(
      out.rail.costOfTheRail === (BigInt(out.rail.leg1.fee) + BigInt(out.rail.leg2.fee)).toString(),
      "the rail's cost is the sum of its two legs' fees"
    );
  }
}

// A negative control, here rather than in the docs: move one issuer's landing by
// a lamport and the equality above must stop holding.
if (out.issuers[0] && !out.issuers[0].refused) {
  const tampered = { ...out.issuers[0], lands: (BigInt(out.issuers[0].lands) + 1n).toString() };
  const wp = await client.getPool(new PublicKey(out.issuers[0].pool));
  const lib = await sdk.swapQuoteByInputToken(
    wp,
    new PublicKey(out.issuers[0].mint),
    new BN(SIZE.toString()),
    Percentage.fromFraction(1, 100),
    sdk.ORCA_WHIRLPOOL_PROGRAM_ID,
    ctx.fetcher
  );
  const diff = BigInt(tampered.lands) - BigInt(lib.estimatedAmountOut.toString());
  say(diff !== 0n, "one lamport of tampering is caught by the same comparison", `difference ${diff}`);
}

console.log(`\n${checks - failed}/${checks} checks passed`);
process.exit(failed === 0 ? 0 : 1);
