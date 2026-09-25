use anchor_lang::prelude::*;

#[error_code]
pub enum ExitError {
    #[msg("the account is not owned by the Token-2022 program")]
    MintNotToken2022,

    #[msg("the reading names a different mint")]
    ReadingMintMismatch,

    #[msg("the fee in force is not the one the reading recorded")]
    ReadingFeeChanged,

    #[msg("the pending schedule is not the one the reading recorded")]
    ReadingScheduleChanged,

    #[msg("the withheld amount at this size has changed")]
    ReadingWithheldChanged,

    #[msg("what lands at this size has changed")]
    ReadingLandsChanged,

    #[msg("the maximum fee has changed")]
    ReadingMaximumFeeChanged,
}
