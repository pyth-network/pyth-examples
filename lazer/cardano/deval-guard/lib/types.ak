use aiken/crypto.{ScriptHash, VerificationKeyHash}
use cardano/assets.{PolicyId}

// --- Protocol Configuration (validator parameter) ---

pub type ProtocolConfig {
  pyth_policy_id: PolicyId,
  pool_validator_hash: ScriptHash,
  feed_id: Int,
  payout_multiplier: Int,
}

// --- Price Data (extracted from Pyth feed) ---

pub type PriceData {
  feed_id: Int,
  price: Int,
  exponent: Int,
  timestamp_us: Int,
}

// --- Policy (insurance contract) ---

pub type PolicyStatus {
  Active
  Claimed
  Expired
}

pub type PolicyDatum {
  owner: VerificationKeyHash,
  strike_price: Int,
  strike_exponent: Int,
  threshold_bps: Int,
  premium_paid: Int,
  payout_amount: Int,
  expiry_slot: Int,
  feed_id: Int,
  status: PolicyStatus,
}

pub type PolicyRedeemer {
  Subscribe
  Claim
  Expire
}

// --- Liquidity Pool ---

pub type PoolDatum {
  total_deposits: Int,
  total_reserved: Int,
  total_premiums_earned: Int,
}

pub type PoolRedeemer {
  Deposit
  Withdraw
  ReserveIncrease { amount: Int }
  ReserveDecrease { amount: Int }
}
