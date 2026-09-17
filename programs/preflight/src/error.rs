use anchor_lang::prelude::*;

#[error_code]
pub enum ManifestError {
    #[msg("Not authorized to modify this plan")]
    Unauthorized,
    #[msg("Plan is not in an active state")]
    PlanInactive,
    #[msg("Plan is not yet preflight-cleared")]
    PlanNotReady,
    #[msg("Scaled UI Amount multiplier mismatch - plan snapshot is stale")]
    MultiplierStale,
    #[msg("Mint is currently paused")]
    MintPaused,
    #[msg("Mint has an active permanent delegate")]
    PermanentDelegateActive,
    #[msg("Mint has an active transfer hook")]
    TransferHookActive,
    #[msg("Reference price is too old - market may be closed")]
    StaleReferencePrice,
    #[msg("Plan has already been executed, cannot replay")]
    PlanAlreadyFilled,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Arithmetic overflow")]
    Overflow,
}