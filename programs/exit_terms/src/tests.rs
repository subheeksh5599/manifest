//! The byte parser, unit-tested against a real account.

use super::*;

/// Live mainnet bytes: a tokenized-equity mint whose fee config is the third
/// extension in the account, so a fixed offset would not find it.
const MINT_ACCOUNT_LEN_WITH_TLV: usize = MINT_TLV_START + fixture::TLV.len();

fn as_mint_account(tlv: &[u8]) -> Vec<u8> {
    let mut v = vec![0u8; MINT_TLV_START];
    v[165] = 1; // account type: mint
    v.extend_from_slice(tlv);
    v
}

#[test]
fn finds_the_fee_config_behind_two_other_extensions() {
    let account = as_mint_account(&fixture::TLV);
    assert_eq!(account.len(), MINT_ACCOUNT_LEN_WITH_TLV);
    let cfg = read_fee_config(&account).expect("fee config");
    assert_eq!(cfg.older.epoch, 1039);
    assert_eq!(cfg.older.bps, 100);
    assert_eq!(cfg.newer.epoch, 1043);
    assert_eq!(cfg.newer.bps, 300);
}

#[test]
fn maximum_fee_comes_back_exactly() {
    let account = as_mint_account(&fixture::TLV);
    let cfg = read_fee_config(&account).unwrap();
    assert_eq!(cfg.older.maximum_fee, u64::MAX);
    assert_eq!(cfg.newer.maximum_fee, u64::MAX);

    // Why the bytes are the source: the value does not survive a float.
    // The nearest f64 is 2^64, one above the maximum, and casting it back
    // saturates rather than round-tripping. Comparing in u128 is what makes the
    // off-by-one visible.
    let as_float = u64::MAX as f64;
    assert_eq!(as_float, 18446744073709551616.0_f64);
    assert_ne!(as_float as u128, u64::MAX as u128);
    assert_eq!(as_float as u64, u64::MAX); // saturation, not a faithful read
}

#[test]
fn withheld_amount_comes_from_the_bytes() {
    let account = as_mint_account(&fixture::TLV);
    let cfg = read_fee_config(&account).unwrap();
    assert_eq!(cfg.withheld_amount, 1_967_161_399);
}

#[test]
fn the_schedule_in_force_is_chosen_by_epoch() {
    let account = as_mint_account(&fixture::TLV);
    let cfg = read_fee_config(&account).unwrap();

    // Before both schedules: the older one, and the newer is pending.
    let (f, p) = select_schedule(&cfg, 1);
    assert_eq!(f.bps, 100);
    assert_eq!(p.unwrap().bps, 300);

    // Between them: still the older one.
    let (f, p) = select_schedule(&cfg, 1042);
    assert_eq!(f.bps, 100);
    assert_eq!(p.unwrap().epoch, 1043);

    // Exactly at the newer epoch: it is in force, and nothing is pending.
    let (f, p) = select_schedule(&cfg, 1043);
    assert_eq!(f.bps, 300);
    assert!(p.is_none());

    // Past it: unchanged.
    let (f, _) = select_schedule(&cfg, 5000);
    assert_eq!(f.bps, 300);
}

#[test]
fn an_announced_increase_is_priced_before_it_is_charged() {
    let account = as_mint_account(&fixture::TLV);
    let cfg = read_fee_config(&account).unwrap();
    let size = 1_000_000_000u64;

    let now = quote_exit(Some(cfg), size, 1042);
    assert_eq!(now.withheld, 10_000_000);
    assert_eq!(now.lands, 990_000_000);

    // The same exit once the announcement takes effect.
    let later = quote_exit(Some(cfg), size, 1043);
    assert_eq!(later.withheld, 30_000_000);
    assert_eq!(later.lands, 970_000_000);

    assert_eq!(later.withheld - now.withheld, 20_000_000);
}

#[test]
fn a_missing_fee_config_is_not_a_zero_fee() {
    let account = vec![0u8; MINT_TLV_START];
    assert!(read_fee_config(&account).is_none());

    let q = quote_exit(None, 1_000_000_000, 1042);
    assert!(!q.has_fee_config);
    assert_eq!(q.withheld, 0);
    assert_eq!(q.lands, 1_000_000_000);
    assert!(q.pending.is_none());
}

#[test]
fn an_account_that_is_not_a_mint_yields_nothing() {
    let mut account = as_mint_account(&fixture::TLV);
    account[165] = 0; // not a mint
    assert!(read_fee_config(&account).is_none());

    let short = vec![0u8; 10];
    assert!(read_fee_config(&short).is_none());
}

#[test]
fn a_fee_never_wraps_and_never_exceeds_the_cap() {
    // amount * bps overflows u64 here; it must not wrap.
    let huge = u64::MAX;
    let fee = fee_for(huge, 10_000, u64::MAX);
    assert!(fee <= u64::MAX);
    assert_eq!(fee, u64::MAX);

    // Capped by the schedule.
    assert_eq!(fee_for(1_000_000, 100, 50), 50);

    // Zero basis points charges nothing regardless of the cap.
    assert_eq!(fee_for(1_000_000_000, 0, u64::MAX), 0);
}

#[test]
fn reading_length_covers_every_field() {
    // Summed here from the declaration rather than asserted as a magic number,
    // because asserting the wrong number is how the account came to be
    // allocated eight bytes short of what it writes.
    let fields = 32 // authority
        + 32 // mint
        + 8  // nonce
        + 8  // slot
        + 8  // epoch
        + 8  // size
        + 1  // has_fee_config
        + 2  // bps_in_force
        + 8  // epoch_in_force
        + 8  // maximum_fee
        + 2  // bps_pending
        + 8  // epoch_pending
        + 8  // withheld
        + 8  // lands
        + 8  // withheld_amount
        + 8  // created_ts
        + 1; // bump
    assert_eq!(Reading::FIELDS_LEN, fields);
    assert_eq!(Reading::LEN, fields + 8);
    assert_eq!(Reading::LEN, 166);
}
