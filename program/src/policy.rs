//! Pure policy functions — host-testable, no SBF required.
//!
//! `MintView` is a minimal representation of the Token-2022 mint extensions the guard reads.
//! In-program we parse the account bytes; in host tests we construct views directly.

use crate::GuardError;
use solana_program::pubkey::Pubkey;

#[derive(Debug, Clone)]
pub struct MintView {
    pub multiplier: u64,
    pub paused: bool,
    pub transfer_hook_program: Option<Pubkey>,
    pub permanent_delegate: Option<Pubkey>,
}

impl MintView {
    /// Parse a Token-2022 mint account. This is a stub reader.
    /// The layout in production would walk the TLV extension table starting at offset 165.
    /// For the host-testable guard we accept a small pre-encoded structure written by the program's
    /// off-chain packer, so tests focus on policy, not layout arithmetic.
    pub fn parse(data: &[u8]) -> Result<Self, GuardError> {
        if data.len() < 41 {
            return Err(GuardError::BadAccount);
        }
        // Layout: [0..8]=multiplier u64 LE, [8]=paused u8, [9]=has_hook u8, [10..42]=hook pubkey (if has_hook).
        // (This is a compact view used by the on-chain program; live parsing of the full TLV is done
        // off-chain by the truth-layer script and asserted equal in fork CI.)
        let multiplier = u64::from_le_bytes(data[0..8].try_into().unwrap());
        let paused = data[8] != 0;
        let has_hook = data[9] != 0;
        let transfer_hook_program = if has_hook {
            let mut b = [0u8; 32];
            b.copy_from_slice(&data[10..42]);
            Some(Pubkey::new_from_array(b))
        } else {
            None
        };
        Ok(MintView { multiplier, paused, transfer_hook_program, permanent_delegate: None })
    }
}

pub fn assert_identity(actual: &Pubkey, expected: &Pubkey) -> Result<(), GuardError> {
    if actual != expected { return Err(GuardError::MintIdentity); }
    Ok(())
}

pub fn assert_not_paused(v: &MintView) -> Result<(), GuardError> {
    if v.paused { return Err(GuardError::IssuerPaused); }
    Ok(())
}

pub fn assert_no_hook(v: &MintView) -> Result<(), GuardError> {
    if v.transfer_hook_program.is_some() { return Err(GuardError::TransferHookActive); }
    Ok(())
}

pub fn assert_multiplier_fresh(v: &MintView, snapshot: u64) -> Result<(), GuardError> {
    if v.multiplier != snapshot { return Err(GuardError::MultiplierStale); }
    Ok(())
}

pub fn assert_reference_fresh(age: u32, max: u32) -> Result<(), GuardError> {
    if age > max { return Err(GuardError::ReferenceStale); }
    Ok(())
}

pub fn assert_exit_within_bound(route_bps: u32, bound_bps: u32) -> Result<(), GuardError> {
    if route_bps > bound_bps { return Err(GuardError::ExitOverBound); }
    Ok(())
}

pub fn assert_policy_cap(requested: u64, cap: u64) -> Result<(), GuardError> {
    if requested > cap { return Err(GuardError::PolicyCap); }
    Ok(())
}

/// Idempotency guard: the plan-registry PDA carries the digest of every filled plan.
/// If `haystack` already contains `plan_id` the second attempt refuses.
pub fn assert_plan_unseen(haystack: &[[u8; 32]], plan_id: &[u8; 32]) -> Result<(), GuardError> {
    if haystack.iter().any(|x| x == plan_id) { return Err(GuardError::DuplicatePlan); }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn view(mult: u64, paused: bool, hook: Option<Pubkey>) -> MintView {
        MintView { multiplier: mult, paused, transfer_hook_program: hook, permanent_delegate: None }
    }

    #[test]
    fn identity_match_passes() {
        let a = Pubkey::new_unique();
        assert!(assert_identity(&a, &a).is_ok());
    }

    #[test]
    fn identity_mismatch_refuses() {
        let a = Pubkey::new_unique();
        let b = Pubkey::new_unique();
        assert!(matches!(assert_identity(&a, &b), Err(GuardError::MintIdentity)));
    }

    #[test]
    fn paused_refuses() {
        let v = view(1, true, None);
        assert!(matches!(assert_not_paused(&v), Err(GuardError::IssuerPaused)));
    }

    #[test]
    fn active_hook_refuses() {
        let v = view(1, false, Some(Pubkey::new_unique()));
        assert!(matches!(assert_no_hook(&v), Err(GuardError::TransferHookActive)));
    }

    #[test]
    fn stale_multiplier_refuses() {
        let v = view(2, false, None);
        assert!(matches!(assert_multiplier_fresh(&v, 1), Err(GuardError::MultiplierStale)));
    }

    #[test]
    fn fresh_multiplier_passes() {
        let v = view(1, false, None);
        assert!(assert_multiplier_fresh(&v, 1).is_ok());
    }

    #[test]
    fn ref_age_over_max_refuses() {
        assert!(matches!(assert_reference_fresh(3600, 300), Err(GuardError::ReferenceStale)));
    }

    #[test]
    fn exit_over_bound_refuses() {
        assert!(matches!(assert_exit_within_bound(120, 50), Err(GuardError::ExitOverBound)));
    }

    #[test]
    fn exit_within_bound_passes() {
        assert!(assert_exit_within_bound(30, 50).is_ok());
    }

    #[test]
    fn policy_cap_over_refuses() {
        assert!(matches!(assert_policy_cap(1_000_000, 500_000), Err(GuardError::PolicyCap)));
    }

    #[test]
    fn duplicate_plan_refuses() {
        let mut a = [0u8; 32]; a[0] = 7;
        let haystack = vec![a];
        assert!(matches!(assert_plan_unseen(&haystack, &a), Err(GuardError::DuplicatePlan)));
    }

    #[test]
    fn unseen_plan_passes() {
        let a = [0u8; 32]; let b = [1u8; 32];
        let haystack = vec![a];
        assert!(assert_plan_unseen(&haystack, &b).is_ok());
    }

    #[test]
    fn view_parse_roundtrip() {
        let mut d = vec![0u8; 42];
        d[0..8].copy_from_slice(&12345u64.to_le_bytes());
        d[8] = 0; d[9] = 0;
        let v = MintView::parse(&d).unwrap();
        assert_eq!(v.multiplier, 12345);
        assert!(!v.paused);
        assert!(v.transfer_hook_program.is_none());
    }
}
