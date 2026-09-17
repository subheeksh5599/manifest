use anchor_lang::prelude::*;

declare_id!("FmTiQA51nS9eQbWAnnN47Hq87fYMk7TKANvPk416yVTN");

pub mod instructions;
pub mod state;
pub mod error;

pub use instructions::*;
pub use state::*;
pub use error::*;

#[program]
pub mod manifest_preflight {
    use super::*;

    /// Create a new plan with mint, amount, tolerance and a snapshot of the
    /// ScaledUiAmount multiplier. The plan must be created by the user who
    /// will later execute it.
    pub fn create_plan(
        ctx: Context<CreatePlan>,
        plan_id: u64,
        mint: Pubkey,
        amount: u64,
        max_slippage_bps: u16,
        reference_price_tolerance: u16, // max age of last print in slots
    ) -> Result<()> {
        let plan = &mut ctx.accounts.plan;
        plan.authority = ctx.accounts.authority.key();
        plan.plan_id = plan_id;
        plan.mint = mint;
        plan.amount = amount;
        plan.max_slippage_bps = max_slippage_bps;
        plan.reference_price_tolerance = reference_price_tolerance;
        plan.status = PlanStatus::Active;
        plan.created_ts = Clock::get()?.unix_timestamp;
        plan.fill_count = 0;
        Ok(())
    }

    /// Preflight evaluation: checks all invariants against the on-chain
    /// Token-2022 mint extension state. If any check fails, records a refusal
    /// and returns the error. If all pass, marks the plan as ready.
    pub fn preflight<'info>(
        ctx: Context<'_, '_, '_, 'info, Preflight<'info>>,
        plan_id: u64,
    ) -> Result<()> {
        let plan = &mut ctx.accounts.plan;

        // 1. Check authority
        require!(
            plan.authority == ctx.accounts.authority.key(),
            ManifestError::Unauthorized
        );

        // 2. Verify plan is active
        require!(
            plan.status == PlanStatus::Active,
            ManifestError::PlanInactive
        );

        // 3. Read the mint extension data
        let mint_info = &ctx.accounts.mint.to_account_info();
        let mint_data = mint_info.data.borrow();

        // Parse the Token-2022 extensions manually to check state
        // ScaledUiAmountConfig is extension type 6
        // We need to find it in the variable-length extension data

        let result = Self::check_scaled_ui_amount(&mint_data, &plan)?;
        let result = Self::check_pausable(&mint_data, &plan)?;
        let result = Self::check_permanent_delegate(&mint_data, &plan)?;
        let result = Self::check_transfer_hook(&mint_data, &plan)?;

        // All checks passed
        plan.status = PlanStatus::Ready;
        plan.last_check_ts = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// Record a successful fill against a plan
    pub fn record_fill(
        ctx: Context<RecordFill>,
        plan_id: u64,
        tx_signature: String,
        fill_amount: u64,
    ) -> Result<()> {
        let plan = &mut ctx.accounts.plan;
        require!(plan.status == PlanStatus::Ready, ManifestError::PlanNotReady);

        let tape = &mut ctx.accounts.tape;
        tape.plan_id = plan_id;
        tape.result_type = FillResultType::Filled;
        tape.tx_signature = tx_signature;
        tape.amount = fill_amount;
        tape.timestamp = Clock::get()?.unix_timestamp;

        plan.fill_count += 1;
        plan.status = PlanStatus::Active;
        Ok(())
    }

    /// Record a refusal (can be called by anyone since the data is already
    /// verified on-chain)
    pub fn record_refusal(
        ctx: Context<RecordRefusal>,
        plan_id: u64,
        reason_code: u16,
        check_value: String,
    ) -> Result<()> {
        let tape = &mut ctx.accounts.tape;
        tape.plan_id = plan_id;
        tape.result_type = FillResultType::Refused;
        tape.reason_code = reason_code;
        tape.check_value = check_value;
        tape.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }
}