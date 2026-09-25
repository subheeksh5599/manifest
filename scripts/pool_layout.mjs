/**
 * Derive the pool account layout, then prove the offsets against a live pool.
 *
 * The app reads accounts with plain JSON-RPC and has no client library, so the
 * fields it needs - the price, the depth, the tick, the fee - have to be read at
 * fixed byte offsets. This prints those offsets straight out of the IDL that
 * built the account, then parses a real devnet pool with them and compares every
 * value against the client library's own decode. If the two disagree, the offsets
 * are wrong and nothing downstream can be trusted.
 *
 *   node scripts/pool_layout.mjs
 */
import fs from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import * as sdk from "@orca-so/whirlpools-sdk";

const RPC = process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
const POOL = process.argv[2] || "bp5Jto1AxiWzaB1D6kGwancaptGgPgGNkzhLRgN1tXE";

const artifact = JSON.parse(
  fs.readFileSync(
    new URL("./node_modules/@orca-so/whirlpools-sdk/dist/artifacts/whirlpool.json", import.meta.url),
    "utf8"
  )
);

const type = artifact.types.find((t) => t.name === "Whirlpool");
if (!type) throw new Error("no Whirlpool type in the artifact");

const SIZES = {
  u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4, u64: 8, i64: 8, u128: 16, i128: 16,
  bool: 1, publicKey: 32, pubkey: 32,
};

function sizeOf(fieldType) {
  if (typeof fieldType === "string") {
    if (SIZES[fieldType]) return SIZES[fieldType];
    throw new Error("unknown primitive " + fieldType);
  }
  if (fieldType.vec) return 4;
  if (fieldType.option) return 1;
  if (fieldType.array) {
    const [inner, len] = fieldType.array;
    return sizeOf(inner) * (typeof len === "number" ? len : 0);
  }
  if (fieldType.defined) {
    const nested = artifact.types.find((t) => t.name === fieldType.defined.name);
    if (!nested) throw new Error("unknown defined " + fieldType.defined.name);
    return nested.type.fields.reduce((a, f) => a + sizeOf(f.type), 0);
  }
  throw new Error("unhandled " + JSON.stringify(fieldType));
}

// 8-byte discriminator, then borsh packs the fields with no padding
let off = 8;
const offsets = {};
for (const f of type.type.fields) {
  offsets[f.name] = { offset: off, size: sizeOf(f.type), type: JSON.stringify(f.type).slice(0, 40) };
  off += sizeOf(f.type);
}
console.log("whirlpool account, by field");
for (const [name, o] of Object.entries(offsets)) {
  console.log(`  ${String(o.offset).padStart(6)}  ${String(o.size).padStart(4)}  ${name}`);
}
console.log(`  ${String(off).padStart(6)}  total (the account is ${off} bytes)`);

// --- and now the check: parse a live pool with those offsets
const c = new Connection(RPC, "confirmed");
const info = await c.getAccountInfo(new PublicKey(POOL), "confirmed");
if (!info) throw new Error("no pool at " + POOL);
const data = Buffer.from(info.data);

const read = (name) => {
  const { offset, size } = offsets[name];
  const buf = data.subarray(offset, offset + size);
  if (size <= 8) return BigInt(`0x${Buffer.from(buf).reverse().toString("hex") || "0"}`);
  return { lo: buf.readBigUInt64LE(0), hi: buf.readBigUInt64LE(8) };
};
const u128 = (name) => {
  const { offset } = offsets[name];
  const lo = data.readBigUInt64LE(offset);
  const hi = data.readBigUInt64LE(offset + 8);
  return (hi << 64n) + lo;
};
const key = (name) => new PublicKey(data.subarray(offsets[name].offset, offsets[name].offset + 32)).toBase58();

console.log("\nparsed with those offsets (live, devnet)");
const parsed = {
  tickSpacing: Number(read("tick_spacing")),
  feeRate: Number(read("fee_rate")),
  protocolFeeRate: Number(read("protocol_fee_rate")),
  liquidity: u128("liquidity").toString(),
  sqrtPrice: u128("sqrt_price").toString(),
  tickCurrentIndex: Number(BigInt.asIntN(32, read("tick_current_index"))),
  tokenMintA: key("token_mint_a"),
  tokenMintB: key("token_mint_b"),
  tokenVaultA: key("token_vault_a"),
  tokenVaultB: key("token_vault_b"),
};
for (const [k, v] of Object.entries(parsed)) console.log(`  ${k.padEnd(18)} ${v}`);

const cl = sdk.buildWhirlpoolClient(
  sdk.WhirlpoolContext.from(c, {
    publicKey: PublicKey.default,
    signTransaction: async (t) => t,
    signAllTransactions: async (t) => t,
  }, undefined, undefined, undefined, sdk.ORCA_WHIRLPOOL_PROGRAM_ID)
);
const d = (await cl.getPool(new PublicKey(POOL))).getData();
const truth = {
  tickSpacing: d.tickSpacing,
  feeRate: d.feeRate,
  protocolFeeRate: d.protocolFeeRate,
  liquidity: d.liquidity.toString(),
  sqrtPrice: d.sqrtPrice.toString(),
  tickCurrentIndex: d.tickCurrentIndex,
  tokenMintA: d.tokenMintA.toBase58(),
  tokenMintB: d.tokenMintB.toBase58(),
  tokenVaultA: d.tokenVaultA.toBase58(),
  tokenVaultB: d.tokenVaultB.toBase58(),
};

console.log("\nthe same fields, from the client library");
let bad = 0;
for (const [k, v] of Object.entries(truth)) {
  const ok = String(v) === String(parsed[k]);
  if (!ok) bad++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${k.padEnd(18)} ${ok ? "" : `offset parse ${parsed[k]} vs library ${v}`}`);
}
console.log(bad === 0 ? "\nall offsets agree with the library" : `\n${bad} fields disagree`);
process.exit(bad === 0 ? 0 : 1);
