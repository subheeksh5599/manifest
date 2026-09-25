/**
 * The route across issuers, as data.
 *
 * These tests hold the claim still. They do not prove the pools exist; that is
 * what `scripts/verify_pools.py` does against devnet. What they check is that the
 * numbers the product publishes about the crossing cannot drift apart from each
 * other, or drift into a shape the crossing cannot have.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, "..", "data", "replica-devnet.json"), "utf8"));

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIG = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

test("both issuers carry a mint, a pool and two vaults", () => {
  for (const key of ["issuer_a", "issuer_b"]) {
    const issuer = data[key];
    assert.match(issuer.mint, BASE58, `${key} mint`);
    assert.match(issuer.pool.address, BASE58, `${key} pool`);
    assert.match(issuer.pool.vault_quote, BASE58, `${key} quote vault`);
    assert.match(issuer.pool.vault_issuer, BASE58, `${key} issuer vault`);
    assert.match(issuer.pool.deposit_sig, SIG, `${key} deposit signature`);
    assert.notEqual(issuer.pool.vault_quote, issuer.pool.vault_issuer);
  }
});

test("the two pools are different pools", () => {
  assert.notEqual(data.issuer_a.pool.address, data.issuer_b.pool.address);
  assert.notEqual(data.issuer_a.mint, data.issuer_b.mint);
});

test("the crossing is one transaction holding two legs", () => {
  assert.equal(data.cross_issuer.legs_in_one_transaction, 2);
  assert.match(data.cross_issuer.sig, SIG);
  assert.equal(data.cross_issuer.from, "issuer_b");
  assert.equal(data.cross_issuer.to, "issuer_a");
});

test("the crossing spends issuer B and lands issuer A", () => {
  const m = data.cross_issuer.measured;
  assert.equal(m.issuer_b_spent, "100000000");
  assert.ok(BigInt(m.issuer_a_received) > 0n, "issuer A has to have received something");
});

test("the crossing costs something, and the numbers say so", () => {
  const m = data.cross_issuer.measured;
  // A route that claims to be free across two pools and a transfer fee is the
  // shape a wrong number would take. The landing must be below what was spent.
  assert.ok(
    BigInt(m.issuer_a_received) < BigInt(m.issuer_b_spent),
    "a crossing through two pools and a fee-bearing mint cannot land more than it spent"
  );
});

test("the middle asset is left behind, not carried", () => {
  const m = data.cross_issuer.measured;
  assert.equal(m.quote_asset, "wSOL");
  // Only dust: the route is not a way to acquire the quote asset.
  assert.ok(BigInt(m.quote_asset_left_behind) < BigInt(m.issuer_b_spent) / 1000n);
});

test("issuer B is the one with a fee, and issuer A is the free one", () => {
  assert.equal(data.issuer_a.fee_bps, 0);
  assert.equal(data.issuer_b.fee_bps, 100);
  assert.ok(data.issuer_b.announced_fee_bps > data.issuer_b.fee_bps);
});
