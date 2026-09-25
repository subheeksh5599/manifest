use anchor_lang::prelude::*;

/// One reading of a mint's exit terms, taken at a known slot.
///
/// There is no mutable instruction for this account. A reading is written once
/// and either still reproduces or does not.
#[account]
#[derive(Debug)]
pub struct Reading {
    /// Who recorded it. Not used for access control; the record is public.
    pub authority: Pubkey,
    pub mint: Pubkey,
    /// Client-chosen, so one mint can be read more than once.
    pub nonce: u64,
    pub slot: u64,
    pub epoch: u64,
    /// The position this reading prices.
    pub size: u64,
    /// 0 when the mint carries no fee extension at all, which is a different
    /// statement from a fee of zero that someone intends to raise later.
    pub has_fee_config: u8,
    pub bps_in_force: u16,
    pub epoch_in_force: u64,
    /// Kept in full. A u64 maximum fee cannot survive a float, and this field
    /// is why the read comes from bytes rather than parsed JSON.
    pub maximum_fee: u64,
    pub bps_pending: u16,
    pub epoch_pending: u64,
    pub withheld: u64,
    pub lands: u64,
    /// What the mint has withheld from everyone so far.
    pub withheld_amount: u64,
    pub created_ts: i64,
    pub bump: u8,
}

impl Reading {
    /// Every byte the account needs: the discriminator, then each field in
    /// declaration order. Written as a sum of named sizes so adding a field
    /// without adding its space is a compile-visible omission rather than a
    /// silent eight-byte shortfall that only shows up at write time.
    pub const LEN: usize = 8
        + 32 // authority
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

    /// The fields, without the discriminator.
    pub const FIELDS_LEN: usize = Self::LEN - 8;
}
