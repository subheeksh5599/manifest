use anchor_lang::prelude::*;

#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub enum PlanStatus {
    Active = 0,
    Ready = 1,
    Filled = 2,
    Expired = 3,
}

#[account]
pub struct Plan {
    pub authority: Pubkey,
    pub plan_id: u64,
    pub mint: Pubkey,
    pub amount: u64,
    pub max_slippage_bps: u16,
    pub reference_price_tolerance: u16,
    pub status: PlanStatus,
    pub created_ts: i64,
    pub last_check_ts: i64,
    pub fill_count: u16,
    /// Snapshot of the ScaledUiAmount multiplier at plan creation
    pub snapshot_multiplier: u64,
}

impl Plan {
    pub const LEN: usize = 8 + 32 + 8 + 32 + 8 + 2 + 2 + 1 + 8 + 8 + 2 + 8;
}