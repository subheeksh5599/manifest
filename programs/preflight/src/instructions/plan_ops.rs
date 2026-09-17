use anchor_lang::prelude::*;
use crate::state::{Plan, PlanStatus};
use crate::error::ManifestError;

#[derive(Accounts)]
pub struct CreatePlan<'info> {
    #[account(
        init,
        payer = authority,
        space = Plan::LEN,
        seeds = [b"plan", authority.key().as_ref(), &plan_id.to_le_bytes()],
        bump
    )]
    pub plan: Account<'info, Plan>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    // plan_id is passed as an argument to the instruction
    pub plan_id: u64, // this won't compile; we'll pass it as arg
}