use anchor_lang::prelude::*;
use crate::state::{Plan, TapeEntry, FillResultType};
use crate::error::ManifestError;

#[derive(Accounts)]
#[instruction(plan_id: u64)]
pub struct Preflight<'info> {
    #[account(
        mut,
        seeds = [b"plan", authority.key().as_ref(), &plan_id.to_le_bytes()],
        bump,
    )]
    pub plan: Account<'info, Plan>,
    /// CHECK: Read-only, we verify the mint is a Token-2022 mint
    /// via the owner field comparison at runtime.
    pub mint: AccountInfo<'info>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(plan_id: u64, tx_sig: String, fill_amount: u64)]
pub struct RecordFill<'info> {
    #[account(
        mut,
        seeds = [b"plan", authority.key().as_ref(), &plan_id.to_le_bytes()],
        bump,
    )]
    pub plan: Account<'info, Plan>,
    #[account(
        init,
        payer = authority,
        space = TapeEntry::LEN,
        seeds = [b"tape", authority.key().as_ref(), &plan_id.to_le_bytes(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub tape: Account<'info, TapeEntry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(plan_id: u64, reason_code: u16, check_value: String)]
pub struct RecordRefusal<'info> {
    #[account(
        init,
        payer = caller,
        space = TapeEntry::LEN,
        seeds = [b"refusal", caller.key().as_ref(), &plan_id.to_le_bytes(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub tape: Account<'info, TapeEntry>,
    #[account(mut)]
    pub caller: Signer<'info>,
    pub system_program: Program<'info, System>,
}