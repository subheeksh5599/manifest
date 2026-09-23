use anchor_lang::prelude::*;

declare_id!("pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA");

pub mod error;
pub mod state;

use error::*;
use state::*;

// Token-2022 program ID
const TOKEN_2022_PROGRAM: Pubkey = pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

// TLV extension type IDs (Token-2022 spec)
const EXT_TRANSFER_HOOK: u16 = 13;
const EXT_PERMANENT_DELEGATE: u16 = 10;
const EXT_PAUSABLE: u16 = 20;
const EXT_SCALED_UI_AMOUNT: u16 = 6;

#[program]
pub mod manifest_preflight {
    use super::*;

    /// Create a new preflight plan
    pub fn create_plan(
        ctx: Context<CreatePlan>,
        plan_id: u64,
        mint: Pubkey,
        amount: u64,
        max_slippage_bps: u16,
        reference_price_tolerance: u16,
        snapshot_multiplier: u64,
    ) -> Result<()> {
        let plan = &mut ctx.accounts.plan;
        plan.authority = ctx.accounts.authority.key();
        plan.plan_id = plan_id;
        plan.mint = mint;
        plan.amount = amount;
        plan.max_slippage_bps = max_slippage_bps;
        plan.reference_price_tolerance = reference_price_tolerance;
        plan.snapshot_multiplier = snapshot_multiplier;
        plan.status = PlanStatus::Active;
        plan.created_ts = Clock::get()?.unix_timestamp;
        plan.last_check_ts = 0;
        plan.fill_count = 0;
        plan.bump = ctx.bumps.plan;
        Ok(())
    }

    /// Preflight evaluation: checks invariants against on-chain mint state.
    /// If any check fails, the entire tx reverts — the revert IS the refusal.
    pub fn preflight(
        ctx: Context<PreflightCheck>,
        _plan_id: u64,
    ) -> Result<()> {
        let plan = &mut ctx.accounts.plan;

        // 1. Authority check
        require!(
            plan.authority == ctx.accounts.authority.key(),
            ManifestError::Unauthorized
        );

        // 2. Plan must be active
        require!(
            plan.status == PlanStatus::Active,
            ManifestError::PlanInactive
        );

        // 3. Mint must be owned by Token-2022
        let mint_info = &ctx.accounts.mint;
        require!(
            *mint_info.owner == TOKEN_2022_PROGRAM,
            ManifestError::Unauthorized
        );

        // 4. Parse Token-2022 extension data
        let mint_data = mint_info.data.borrow();

        // Token-2022 mint: base=82 bytes, then account_type(1) at 165,
        // then TLV extension data starts at 166
        if mint_data.len() > 166 {
            let ext_data = &mint_data[166..];
            check_extensions(ext_data, plan)?;
        }

        // All checks passed
        plan.status = PlanStatus::Ready;
        plan.last_check_ts = Clock::get()?.unix_timestamp;

        Ok(())
    }

    /// Record a refusal on-chain as a permanent receipt.
    /// nonce is a client-chosen unique value to derive unique PDA per refusal.
    pub fn record_refusal(
        ctx: Context<RecordRefusal>,
        plan_id: u64,
        _nonce: u64,
        reason_code: u16,
        check_value: Vec<u8>,
    ) -> Result<()> {
        let tape = &mut ctx.accounts.tape;
        tape.plan_id = plan_id;
        tape.authority = ctx.accounts.caller.key();
        tape.result_type = FillResultType::Refused;
        tape.reason_code = reason_code;
        tape.timestamp = Clock::get()?.unix_timestamp;
        tape.amount = 0;
        tape.bump = ctx.bumps.tape;

        // Copy check_value (up to 64 bytes)
        let len = check_value.len().min(64);
        tape.check_value[..len].copy_from_slice(&check_value[..len]);
        tape.check_value_len = len as u8;
        tape.tx_sig_len = 0;

        Ok(())
    }

    /// Record a successful fill
    pub fn record_fill(
        ctx: Context<RecordFill>,
        plan_id: u64,
        _nonce: u64,
        fill_amount: u64,
        tx_signature: Vec<u8>,
    ) -> Result<()> {
        let plan = &mut ctx.accounts.plan;
        require!(plan.status == PlanStatus::Ready, ManifestError::PlanNotReady);

        let tape = &mut ctx.accounts.tape;
        tape.plan_id = plan_id;
        tape.authority = ctx.accounts.authority.key();
        tape.result_type = FillResultType::Filled;
        tape.reason_code = 0;
        tape.amount = fill_amount;
        tape.timestamp = Clock::get()?.unix_timestamp;
        tape.bump = ctx.bumps.tape;

        // Copy tx signature (up to 88 bytes)
        let sig_len = tx_signature.len().min(88);
        tape.tx_signature[..sig_len].copy_from_slice(&tx_signature[..sig_len]);
        tape.tx_sig_len = sig_len as u8;
        tape.check_value_len = 0;

        plan.fill_count += 1;
        plan.status = PlanStatus::Active; // ready for next recurring buy

        Ok(())
    }
}

fn check_extensions(ext_data: &[u8], plan: &Plan) -> Result<()> {
    let mut offset = 0;
    while offset + 4 <= ext_data.len() {
        let ext_type = u16::from_le_bytes([ext_data[offset], ext_data[offset + 1]]);
        let ext_len = u16::from_le_bytes([ext_data[offset + 2], ext_data[offset + 3]]) as usize;
        offset += 4;

        if offset + ext_len > ext_data.len() {
            break;
        }

        match ext_type {
            EXT_PAUSABLE => {
                if ext_len >= 1 && ext_data[offset] == 1 {
                    return Err(ManifestError::MintPaused.into());
                }
            }
            EXT_TRANSFER_HOOK => {
                if ext_len >= 32 {
                    let hook_program = &ext_data[offset..offset + 32];
                    let is_set = hook_program.iter().any(|&b| b != 0);
                    if is_set {
                        return Err(ManifestError::TransferHookActive.into());
                    }
                }
            }
            EXT_PERMANENT_DELEGATE => {
                // Allowed but surfaced; doesn't block.
            }
            EXT_SCALED_UI_AMOUNT => {
                // ScaledUiAmountConfig: authority(32) + multiplier(8)
                if ext_len >= 40 {
                    let multiplier_bytes = &ext_data[offset + 32..offset + 40];
                    let current_multiplier = u64::from_le_bytes(
                        multiplier_bytes.try_into().unwrap()
                    );
                    if current_multiplier != plan.snapshot_multiplier {
                        return Err(ManifestError::MultiplierStale.into());
                    }
                }
            }
            _ => {}
        }

        offset += ext_len;
    }
    Ok(())
}

// ── Accounts ──

#[derive(Accounts)]
#[instruction(plan_id: u64)]
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
}

#[derive(Accounts)]
#[instruction(plan_id: u64)]
pub struct PreflightCheck<'info> {
    #[account(
        mut,
        seeds = [b"plan", authority.key().as_ref(), &plan_id.to_le_bytes()],
        bump = plan.bump,
    )]
    pub plan: Account<'info, Plan>,
    /// CHECK: Verified as Token-2022 mint by owner check in the instruction
    pub mint: AccountInfo<'info>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(plan_id: u64, nonce: u64)]
pub struct RecordRefusal<'info> {
    #[account(
        init,
        payer = caller,
        space = TapeEntry::LEN,
        seeds = [
            b"refusal",
            caller.key().as_ref(),
            &plan_id.to_le_bytes(),
            &nonce.to_le_bytes(),
        ],
        bump
    )]
    pub tape: Account<'info, TapeEntry>,
    #[account(mut)]
    pub caller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(plan_id: u64, nonce: u64)]
pub struct RecordFill<'info> {
    #[account(
        mut,
        seeds = [b"plan", authority.key().as_ref(), &plan_id.to_le_bytes()],
        bump = plan.bump,
    )]
    pub plan: Account<'info, Plan>,
    #[account(
        init,
        payer = authority,
        space = TapeEntry::LEN,
        seeds = [
            b"fill",
            authority.key().as_ref(),
            &plan_id.to_le_bytes(),
            &nonce.to_le_bytes(),
        ],
        bump
    )]
    pub tape: Account<'info, TapeEntry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
