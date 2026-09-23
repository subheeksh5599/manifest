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
    pub authority: Pubkey,
    pub result_type: FillResultType,
    pub reason_code: u16,
    /// On-chain value that tripped the check (up to 64 bytes)
    pub check_value: [u8; 64],
    pub check_value_len: u8,
    /// For filled entries: the transaction signature (88 base58 chars max)
    pub tx_signature: [u8; 88],
    pub tx_sig_len: u8,
    pub amount: u64,
    pub timestamp: i64,
    pub bump: u8,
}

impl TapeEntry {
    // discriminator(8) + u64(8) + pubkey(32) + u8(1) + u16(2) + [u8;64](64) + u8(1) + [u8;88](88) + u8(1) + u64(8) + i64(8) + u8(1)
    pub const LEN: usize = 8 + 8 + 32 + 1 + 2 + 64 + 1 + 88 + 1 + 8 + 8 + 1;
}
