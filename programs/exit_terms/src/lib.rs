//! Exit terms, read from the mint on-chain.
//!
//! The web app reads a mint and prices an exit. This program does the same work
//! on-chain and writes the result to a PDA, so a published number is a record
//! with a slot rather than a claim in a screenshot. `verify_reading` recomputes
//! it from the mint and fails if the two disagree.
//!
//! The fee fields come from the account bytes. A u64 maximum fee can be
//! 2^64-1, which a JSON number cannot hold, so the bytes are the only honest
//! source for those fields.

use anchor_lang::prelude::*;

declare_id!("pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA");

pub mod error;
pub mod state;

#[cfg(test)]
mod fixture;
#[cfg(test)]
mod tests;

use error::*;
use state::*;

/// Token-2022 program.
const TOKEN_2022_PROGRAM: Pubkey = pubkey!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

/// A Token-2022 mint is 82 bytes of base state, then an account type byte at
/// 165, then the TLV region.
const MINT_TLV_START: usize = 166;
const EXT_TRANSFER_FEE_CONFIG: u16 = 1;
const TRANSFER_FEE_CONFIG_LEN: usize = 108;

/// One of the two schedules a mint carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Schedule {
    pub epoch: u64,
    pub maximum_fee: u64,
    pub bps: u16,
}

/// Both schedules, plus the amount the mint has already withheld.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FeeConfig {
    pub withheld_amount: u64,
    pub older: Schedule,
    pub newer: Schedule,
}

/// Walk the TLV region and lift the fee config out of the bytes.
///
/// Body layout, 108 bytes:
///   [  0: 32] transfer fee config authority
///   [ 32: 64] withdraw withheld authority
///   [ 64: 72] withheld amount          u64
///   [ 72: 90] older epoch u64, maximum fee u64, basis points u16
///   [ 90:108] newer epoch u64, maximum fee u64, basis points u16
pub fn read_fee_config(data: &[u8]) -> Option<FeeConfig> {
    if data.len() < MINT_TLV_START || data[165] != 1 {
        return None;
    }
    let mut p = MINT_TLV_START;
    while p + 4 <= data.len() {
        let ext_type = u16::from_le_bytes([data[p], data[p + 1]]);
        let ext_len = u16::from_le_bytes([data[p + 2], data[p + 3]]) as usize;
        if ext_type == 0 && ext_len == 0 {
            return None;
        }
        if ext_type == EXT_TRANSFER_FEE_CONFIG && ext_len >= TRANSFER_FEE_CONFIG_LEN {
            let b = &data[p + 4..p + 4 + TRANSFER_FEE_CONFIG_LEN];
            return Some(FeeConfig {
                withheld_amount: u64::from_le_bytes(b[64..72].try_into().unwrap()),
                older: Schedule {
                    epoch: u64::from_le_bytes(b[72..80].try_into().unwrap()),
                    maximum_fee: u64::from_le_bytes(b[80..88].try_into().unwrap()),
                    bps: u16::from_le_bytes(b[88..90].try_into().unwrap()),
                },
                newer: Schedule {
                    epoch: u64::from_le_bytes(b[90..98].try_into().unwrap()),
                    maximum_fee: u64::from_le_bytes(b[98..106].try_into().unwrap()),
                    bps: u16::from_le_bytes(b[106..108].try_into().unwrap()),
                },
            });
        }
        p += 4 + ext_len;
    }
    None
}

/// The schedule in force at an epoch, and the one that is not yet.
pub fn select_schedule(cfg: &FeeConfig, epoch: u64) -> (Schedule, Option<Schedule>) {
    if epoch >= cfg.newer.epoch {
        (cfg.newer, None)
    } else {
        (cfg.older, Some(cfg.newer))
    }
}

/// The fee charged on an amount, capped at the schedule's maximum.
///
/// Widened to u128 first: an amount near u64::MAX times a four-digit basis
/// points value overflows u64, and a fee that wraps is worse than no fee.
pub fn fee_for(amount: u64, bps: u16, maximum_fee: u64) -> u64 {
    if bps == 0 {
        return 0;
    }
    let raw = (amount as u128) * (bps as u128) / 10_000u128;
    raw.min(maximum_fee as u128) as u64
}

/// Everything the app shows, derived from the mint alone.
pub struct Quote {
    pub has_fee_config: bool,
    pub in_force: Schedule,
    pub pending: Option<Schedule>,
    pub withheld: u64,
    pub lands: u64,
}

pub fn quote_exit(cfg: Option<FeeConfig>, size: u64, epoch: u64) -> Quote {
    match cfg {
        // A mint with no fee extension is a different statement from a fee of
        // zero that someone intends to raise later.
        None => Quote {
            has_fee_config: false,
            in_force: Schedule { epoch: 0, maximum_fee: 0, bps: 0 },
            pending: None,
            withheld: 0,
            lands: size,
        },
        Some(c) => {
            let (in_force, pending) = select_schedule(&c, epoch);
            let withheld = fee_for(size, in_force.bps, in_force.maximum_fee);
            Quote {
                has_fee_config: true,
                in_force,
                pending,
                withheld,
                lands: size.saturating_sub(withheld),
            }
        }
    }
}

#[program]
pub mod manifest_exit_terms {
    use super::*;

    /// Read a mint's exit terms and write them down, with the slot they were
    /// read at. Anyone can re-run this; the record is what someone claimed.
    pub fn record_reading(ctx: Context<RecordReading>, size: u64, nonce: u64) -> Result<()> {
        let clock = Clock::get()?;
        let mint_info = &ctx.accounts.mint;

        require!(
            mint_info.owner == &TOKEN_2022_PROGRAM,
            ExitError::MintNotToken2022
        );

        let data = mint_info.data.borrow();
        let cfg = read_fee_config(&data);
        let q = quote_exit(cfg, size, clock.epoch);

        let reading = &mut ctx.accounts.reading;
        reading.authority = ctx.accounts.authority.key();
        reading.mint = ctx.accounts.mint.key();
        reading.nonce = nonce;
        reading.slot = clock.slot;
        reading.epoch = clock.epoch;
        reading.size = size;
        reading.has_fee_config = if q.has_fee_config { 1 } else { 0 };
        reading.bps_in_force = q.in_force.bps;
        reading.epoch_in_force = q.in_force.epoch;
        reading.maximum_fee = q.in_force.maximum_fee;
        reading.bps_pending = q.pending.map(|s| s.bps).unwrap_or(0);
        reading.epoch_pending = q.pending.map(|s| s.epoch).unwrap_or(0);
        reading.withheld = q.withheld;
        reading.lands = q.lands;
        reading.withheld_amount = cfg.map(|c| c.withheld_amount).unwrap_or(0);
        reading.created_ts = clock.unix_timestamp;
        reading.bump = ctx.bumps.reading;

        emit!(ReadingRecorded {
            mint: reading.mint,
            nonce,
            slot: reading.slot,
            epoch: reading.epoch,
            bps_in_force: reading.bps_in_force,
            bps_pending: reading.bps_pending,
            withheld: reading.withheld,
            lands: reading.lands,
        });

        Ok(())
    }

    /// Recompute a stored reading from the mint and refuse if it no longer
    /// reproduces. This is the whole point of putting a reading on-chain: a
    /// third party checks it without trusting whoever wrote it.
    pub fn verify_reading(ctx: Context<VerifyReading>, _nonce: u64) -> Result<()> {
        let clock = Clock::get()?;
        let mint_info = &ctx.accounts.mint;
        require!(
            mint_info.owner == &TOKEN_2022_PROGRAM,
            ExitError::MintNotToken2022
        );

        let data = mint_info.data.borrow();
        let cfg = read_fee_config(&data);
        let stored = &ctx.accounts.reading;

        // The mint the reading names must be the mint being checked.
        require!(
            stored.mint == ctx.accounts.mint.key(),
            ExitError::ReadingMintMismatch
        );

        let q = quote_exit(cfg, stored.size, clock.epoch);

        require!(
            q.in_force.bps == stored.bps_in_force,
            ExitError::ReadingFeeChanged
        );
        require!(
            q.pending.map(|s| s.bps).unwrap_or(0) == stored.bps_pending,
            ExitError::ReadingScheduleChanged
        );
        require!(
            q.withheld == stored.withheld,
            ExitError::ReadingWithheldChanged
        );
        require!(q.lands == stored.lands, ExitError::ReadingLandsChanged);
        require!(
            q.in_force.maximum_fee == stored.maximum_fee,
            ExitError::ReadingMaximumFeeChanged
        );

        emit!(ReadingVerified {
            mint: stored.mint,
            nonce: stored.nonce,
            recorded_slot: stored.slot,
            verified_slot: clock.slot,
        });

        Ok(())
    }
}

#[event]
pub struct ReadingRecorded {
    pub mint: Pubkey,
    pub nonce: u64,
    pub slot: u64,
    pub epoch: u64,
    pub bps_in_force: u16,
    pub bps_pending: u16,
    pub withheld: u64,
    pub lands: u64,
}

#[event]
pub struct ReadingVerified {
    pub mint: Pubkey,
    pub nonce: u64,
    pub recorded_slot: u64,
    pub verified_slot: u64,
}

#[derive(Accounts)]
#[instruction(size: u64, nonce: u64)]
pub struct RecordReading<'info> {
    #[account(
        init,
        payer = authority,
        space = Reading::LEN,
        seeds = [b"reading", mint.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub reading: Account<'info, Reading>,
    /// CHECK: owner is checked against the Token-2022 program in the instruction
    pub mint: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct VerifyReading<'info> {
    #[account(
        seeds = [b"reading", mint.key().as_ref(), &nonce.to_le_bytes()],
        bump = reading.bump,
    )]
    pub reading: Account<'info, Reading>,
    /// CHECK: owner is checked against the Token-2022 program in the instruction
    pub mint: AccountInfo<'info>,
}
