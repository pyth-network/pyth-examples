use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference}

// ── Market types ─────────────────────────────────────────────────────────────

pub type BetDirection {
  Yes
  No
}

pub type MarketDatum {
  creator: ByteArray,
  pyth_id: PolicyId,
  feed_id: Int,
  target_price: Int,
  resolution_time: Int,
  token_policy: PolicyId,
  yes_reserve: Int,
  no_reserve: Int,
  k: Int,
  total_yes_minted: Int,
  total_no_minted: Int,
  total_ada: Int,
  resolved: Bool,
  winning_side: Option<BetDirection>,
}

// ── Redeemers ────────────────────────────────────────────────────────────────

pub type MarketAction {
  Bet { direction: BetDirection, amount: Int }
  Resolve
  Claim { burn_amount: Int }
}

pub type MintAction {
  MintTokens
  BurnTokens
}

// ── One-shot parameter ───────────────────────────────────────────────────────

/// Parameter for the market validator (makes each market's policy ID unique)
pub type MarketParams {
  one_shot: OutputReference,
}
