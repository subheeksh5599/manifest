use anchor_lang::prelude::*;

#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub enum FillResultType {
    Filled = 0,
    Refused = 1,
}

#[account]
pub struct TapeEntry {
    pub plan_id: u64,
    pub result_type: FillResultType,
    pub reason_code: u16,
    /// Up to 120 bytes of on-chain value string
    pub check_value: [u8; 120],
    /// For filled entries: the transaction signature (max 88 base58 bytes)
    pub tx_signature: [u8; 96],
    pub amount: u64,
    pub timestamp: i64,
}

impl TapeEntry {
    pub const LEN: usize = 8 + 8 + 1 + 2 + 120 + 96 + 8 + 8;
}