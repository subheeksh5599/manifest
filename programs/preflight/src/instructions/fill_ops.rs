use anchor_lang::prelude::*;
use crate::state::{TapeEntry, FillResultType};

#[derive(Accounts)]
pub struct RecordFillAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordRefusalAccounts<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    pub system_program: Program<'info, System>,
}