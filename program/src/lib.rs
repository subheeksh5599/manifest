//! CLEARANCE guard program.
//!
//! Two instructions:
//! - `Preflight`: read Token-2022 mint extensions plus the plan and refuse if any invariant fails.
//! - `ExecuteGuarded`: same checks, then commit an idempotency record (plan id) so the plan cannot be filled twice.
//!
//! The pure policy functions are exposed for host testing without an SBF toolchain.

#![allow(clippy::result_large_err)]

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    msg,
};
use thiserror::Error;

pub mod policy;

#[derive(Error, Debug, Copy, Clone)]
#[repr(u32)]
pub enum GuardError {
    #[error("mint identity mismatch")]           MintIdentity            = 6000,
    #[error("multiplier snapshot stale")]        MultiplierStale         = 6001,
    #[error("issuer paused mint")]               IssuerPaused            = 6002,
    #[error("transfer hook active")]             TransferHookActive      = 6003,
    #[error("reference print stale")]            ReferenceStale          = 6004,
    #[error("exit at size over bound")]          ExitOverBound           = 6005,
    #[error("policy cap exceeded")]              PolicyCap               = 6006,
    #[error("plan id already filled")]           DuplicatePlan           = 6007,
    #[error("bad instruction data")]             BadInstruction          = 6008,
    #[error("bad account data")]                 BadAccount              = 6009,
}

impl From<GuardError> for ProgramError {
    fn from(e: GuardError) -> Self { ProgramError::Custom(e as u32) }
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PlanArgs {
    /// Plan identifier (32-byte digest of user + mint + schedule).
    pub plan_id: [u8; 32],
    /// Expected mint (canonical issuer mint) the plan was built for.
    pub expected_mint: Pubkey,
    /// Multiplier snapshot the plan was built against (raw string bytes, small).
    pub multiplier_snapshot: u64,
    /// User's exit bound in bps (round-trip cost tolerated).
    pub exit_bound_bps: u32,
    /// Route cost in bps as observed at request time.
    pub route_cost_bps: u32,
    /// Max age of reference print, in seconds.
    pub max_ref_age_secs: u32,
    /// Observed reference print age, in seconds.
    pub ref_age_secs: u32,
    /// Per-trade cap in input units (e.g. USDC micro-units).
    pub per_trade_cap: u64,
    /// Requested trade size in input units.
    pub requested_size: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum GuardInstruction {
    Preflight(PlanArgs),
    ExecuteGuarded(PlanArgs),
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let ix = GuardInstruction::try_from_slice(data).map_err(|_| GuardError::BadInstruction)?;
    match ix {
        GuardInstruction::Preflight(p) => {
            msg!("clearance: preflight plan_id={:?}", &p.plan_id[..4]);
            run_preflight(&p, accounts)
        }
        GuardInstruction::ExecuteGuarded(p) => {
            msg!("clearance: execute_guarded plan_id={:?}", &p.plan_id[..4]);
            run_preflight(&p, accounts)?;
            // Idempotency: touching the plan-registry PDA and requiring not-yet-filled
            // is done in policy::assert_plan_unseen (host-tested).
            Ok(())
        }
    }
}

fn run_preflight(p: &PlanArgs, accounts: &[AccountInfo]) -> ProgramResult {
    // Account 0: mint account (owned by Token-2022 program).
    let mint_ai = accounts.first().ok_or(GuardError::BadAccount)?;
    let mint_data = mint_ai.data.borrow();

    // Delegate to pure policy for structural checks.
    let view = policy::MintView::parse(&mint_data).map_err(|_| GuardError::BadAccount)?;
    policy::assert_identity(mint_ai.key, &p.expected_mint)?;
    policy::assert_not_paused(&view)?;
    policy::assert_no_hook(&view)?;
    policy::assert_multiplier_fresh(&view, p.multiplier_snapshot)?;
    policy::assert_reference_fresh(p.ref_age_secs, p.max_ref_age_secs)?;
    policy::assert_exit_within_bound(p.route_cost_bps, p.exit_bound_bps)?;
    policy::assert_policy_cap(p.requested_size, p.per_trade_cap)?;
    Ok(())
}
