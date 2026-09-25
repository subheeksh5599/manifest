/**
 * Real devnet state, in a validator on this machine, and the lifecycle against it.
 *
 * Two modes:
 *
 *   node scripts/fork_clone.mjs fixture --mutate --out /tmp/mint_b.json
 *       dumps a devnet account as validator input, optionally with one byte of the
 *       fee schedule changed. That file is what the validator loads instead of
 *       cloning, and it is how the negative control below is set up.
 *
 *   node scripts/fork_clone.mjs check [--expect-failure]
 *       runs against a validator (RPC_URL, default localhost:8899) that has the
 *       issuers' mints, their pools and the reading program cloned into it, and
 *       checks:
 *
 *         the cloned mint and pool bytes hash to what devnet holds right now
 *         the fee schedule is read from the cloned mint and selected by epoch
 *         both issuers price, and each price is the pool library's own quote
 *         what lands never exceeds the pool's spot price
 *
 *       --expect-failure inverts the outcome: with a mutated fixture loaded, the
 *       hash check must not match, and this must exit non-zero. A control that
 *       cannot fail proves nothing, so the workflow runs it both ways.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { Connection, PublicKey } from "@solana/web3.js";
import * as sdk from "@orca-so/whirlpools-sdk";
import { Percentage } from "@orca-so/common-sdk";
import BN from "bn.js";
import { readPoolAccount, POOL_PROGRAM } from "../app/lib/pool-account.mjs";
import { readFeeConfigExact, selectFeeSchedule, feeFor } from "../app/lib/exit-terms.mjs";
import { compareIssuers } from "../app/lib/compare-engine.mjs";
import replica from "../app/data/replica-devnet.json" with { type: "json" };

const SOURCE = process.env.SOURCE_RPC_URL || "https://api.devnet.solana.com";
const LOCAL = process.env.RPC_URL || "http://127.0.0.1:8899";
const SIZE = BigInt(process.env.FORK_SIZE || "100000000");
const PROGRAM_ID = "pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA";
const program = () => process.env.FORK_PROGRAM_ID || PROGRAM_ID;
const UA =
  process.env.RPC_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

async function rpc(url, method, params) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const b = await r.json();
  if (b.error) throw new Error(`${method}: ${b.error.message}`);
  return b.result;
}

async function pull(url, address) {
  const v = await rpc(url, "getAccountInfo", [address, { encoding: "base64", commitment: "confirmed" }]);
  if (!v?.value?.data?.[0]) return null;
  return { data: Buffer.from(v.value.data[0], "base64"), owner: v.value.owner, lamports: v.value.lamports, space: v.value.space };
}

const ISSUERS = [
  { label: "A", key: "issuer_a" },
  { label: "B", key: "issuer_b" },
];

// ---------------------------------------------------------------- fixture mode

async function fixture() {
  const args = process.argv.slice(3);
  const mutate = args.includes("--mutate");
  const outIdx = args.indexOf("--out");
  const out = outIdx > -1 ? args[outIdx + 1] : "/tmp/fork-account.json";
  const which = (args.find((a) => a.startsWith("--mint=")) || "--mint=B").split("=")[1];

  const row = which === "A" ? replica.issuer_a : replica.issuer_b;
  const live = await pull(SOURCE, row.mint);
  if (!live) throw new Error(`no account at ${row.mint} on ${SOURCE}`);

  const data = Buffer.from(live.data);
  let changed = null;
  if (mutate) {
    // The older schedule's basis points sit at 166 (the extensions) + 4 (this
    // extension's header) + 88. This is the value the reader is supposed to read,
    // so it is the value worth tampering with in a control.
    const at = 166 + 4 + 88;
    const before = data.readUInt16LE(at);
    data.writeUInt16LE(before === 0 ? 999 : 0, at);
    changed = { offset: at, from: before, to: data.readUInt16LE(at) };
  }

  const doc = {
    pubkey: row.mint,
    account: {
      lamports: live.lamports,
      data: [data.toString("base64"), "base64"],
      owner: live.owner,
      executable: false,
      rentEpoch: 0,
      space: live.space ?? data.length,
    },
  };
  fs.writeFileSync(out, JSON.stringify(doc));
  console.log(
    `wrote ${out} for issuer ${which} mint ${row.mint}` +
      (changed ? ` with byte ${changed.offset} of the fee schedule changed ${changed.from} -> ${changed.to}` : " unchanged")
  );
  console.log(`sha256 ${sha(data)}`);
}

// ------------------------------------------------------------------ check mode

async function check() {
  const expectFailure = process.argv.includes("--expect-failure");
  let checks = 0;
  let failed = 0;
  const say = (ok, what, detail = "") => {
    checks++;
    if (!ok) failed++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${what}${detail ? "  " + detail : ""}`);
  };

  const local = new Connection(LOCAL, "confirmed");
  const epoch = (await local.getEpochInfo("confirmed")).epoch;
  console.log(`fork: local ${LOCAL} · source ${SOURCE} · epoch ${epoch} · size ${SIZE}`);
  console.log("the lifecycle, against cloned state");

  const issuers = [];
  const rail = {};
  const hashes = {};

  for (const { label, key } of ISSUERS) {
    const row = replica[key];
    const localMint = await pull(LOCAL, row.mint);
    const localPool = await pull(LOCAL, row.pool.address);
    const sourceMint = await pull(SOURCE, row.mint);
    const sourcePool = await pull(SOURCE, row.pool.address);

    const mintMatch = !!localMint && !!sourceMint && sha(localMint.data) === sha(sourceMint.data);
    const poolMatch = !!localPool && !!sourcePool && sha(localPool.data) === sha(sourcePool.data);
    hashes[label] = { mint: localMint ? sha(localMint.data) : null, pool: localPool ? sha(localPool.data) : null };

    console.log(`\nissuer ${label}`);
    say(mintMatch, `the cloned mint is byte-for-byte what the source holds`, `${row.mint} ${hashes[label].mint?.slice(0, 16) ?? "absent"}…`);
    say(poolMatch, `the cloned pool is byte-for-byte what the source holds`, `${row.pool.address} ${hashes[label].pool?.slice(0, 16) ?? "absent"}…`);

    // the read the product is built on, from the clone
    let schedule = null;
    let pending = null;
    if (localMint) {
      const raw = readFeeConfigExact(new Uint8Array(localMint.data));
      const sel = raw ? selectFeeSchedule(raw.older, raw.newer, epoch) : null;
      schedule = sel?.effective ?? null;
      pending = sel?.pending ?? null;
      say(!!raw, `a fee schedule is readable from the cloned mint bytes`);
      if (schedule) {
        const f = feeFor(SIZE, schedule);
        console.log(
          `    in force ${schedule.bps} bps (since epoch ${schedule.epoch}) · ${f} withheld on ${SIZE}` +
            (pending ? ` · ${pending.bps} bps announced for epoch ${pending.epoch}` : "")
        );
      }
    }

    let poolState = null;
    if (localPool && localPool.owner === POOL_PROGRAM) {
      poolState = readPoolAccount(localPool.data.toString("base64"), POOL_PROGRAM, localPool.owner);
      say(!!poolState, `the cloned pool decodes at the offsets this app uses`);
    } else {
      say(false, `the cloned pool is owned by the pool program`, localPool?.owner ?? "absent");
    }
    if (poolState) rail[label] = poolState;
    issuers.push({ label, mint: row.mint, pool: row.pool.address, poolState, schedule, pending, epoch });
  }

  // the route: both issuers priced off the cloned pools
  const out = compareIssuers({ size: SIZE, issuers, rail });
  console.log("\nthe route, priced from the clone");
  for (const x of out.issuers) {
    console.log(
      x.refused
        ? `  issuer ${x.label}  refused: ${x.refused}`
        : `  issuer ${x.label}  into pool ${x.intoPool} · lands ${x.lands} · spot ${x.spotPerToken?.toFixed(6)} · landed ${x.landedPerToken?.toFixed(6)}`
    );
  }
  say(out.issuers.filter((x) => !x.refused).length === 2, "both issuers price from the cloned state");
  if (!out.refused) console.log(`  apart by ${out.spreadBps} bps at this size`);

  // and each price is still the library's own quote
  const ctx = sdk.WhirlpoolContext.from(local, {
    publicKey: PublicKey.default,
    signTransaction: async (t) => t,
    signAllTransactions: async (t) => t,
  });
  const client = sdk.buildWhirlpoolClient(ctx, sdk.ORCA_WHIRLPOOL_PROGRAM_ID);
  for (const { label, key } of ISSUERS) {
    const mine = out.issuers.find((x) => x.label === label);
    if (!mine || mine.refused) continue;
    const wp = await client.getPool(new PublicKey(replica[key].pool.address));
    const lib = await sdk.swapQuoteByInputToken(
      wp,
      new PublicKey(replica[key].mint),
      new BN(SIZE.toString()),
      Percentage.fromFraction(1, 100),
      sdk.ORCA_WHIRLPOOL_PROGRAM_ID,
      ctx.fetcher
    );
    const diff = BigInt(mine.lands) - BigInt(lib.estimatedAmountOut.toString());
    const abs = diff < 0n ? -diff : diff;
    say(abs <= 2n, `issuer ${label}: the clone's price is the library's own quote`, `difference ${diff} lamports`);
    say(mine.spotPerToken && mine.landedPerToken <= mine.spotPerToken, `issuer ${label}: what lands does not exceed the spot`);
  }

  console.log("\nthe cloned account set");
  for (const [label, h] of Object.entries(hashes)) console.log(`  issuer ${label}  mint ${h.mint}\n             pool ${h.pool}`);
  const setHash = sha(Buffer.from(JSON.stringify(hashes)));
  console.log(`  set hash ${setHash}`);

  if (expectFailure) {
    // the whole point of the control: it has to fail
    const ok = failed > 0;
    console.log(
      ok
        ? `\ncontrol behaved: ${failed} of ${checks} checks failed on mutated state, as they must`
        : `\ncontrol did NOT behave: every check passed on mutated state, which means these checks cannot fail`
    );
    process.exit(ok ? 0 : 1);
  }

  console.log(`\n${checks - failed}/${checks} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
}

// ------------------------------------------------------------------ plan mode

/**
 * Print the validator's clone arguments, built from the replica data rather than
 * copied into a workflow where they would drift. The vaults are in the list
 * because the pool library refuses to build a pool object without them - and if
 * the library cannot read the pool, the price here cannot be checked against it,
 * which is the check that matters most.
 */
function plan() {
  const addrs = [];
  for (const { key } of ISSUERS) {
    const row = replica[key];
    addrs.push(row.mint, row.pool.address, row.pool.vault_quote, row.pool.vault_issuer);
  }
  if (process.env.FORK_MUTATED_ACCOUNT && process.env.FORK_MUTATED_FILE) {
    // the negative control: this account comes from a file, not from the source
    const others = addrs.filter((a) => a !== process.env.FORK_MUTATED_ACCOUNT);
    console.log(others.map((a) => `--clone ${a}`).join(" "));
    console.log(`--account ${process.env.FORK_MUTATED_ACCOUNT} ${process.env.FORK_MUTATED_FILE}`);
  } else {
    console.log(addrs.map((a) => `--clone ${a}`).join(" "));
  }
  console.log(`--clone-upgradeable-program ${program()}`);
}

const mode = process.argv[2];
if (mode === "plan") plan();
else if (mode === "fixture") await fixture();
else if (mode === "check") await check();
else {
  console.error("usage: node scripts/fork_clone.mjs fixture [--mutate] [--out FILE] [--mint=A|B] | check [--expect-failure]");
  process.exit(2);
}
