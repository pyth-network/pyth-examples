use pyth_oracle
use types.{Active, Claimed, PolicyDatum, PoolDatum}

// Policy validator business logic tests.

const test_owner: ByteArray =
  #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd"

fn make_policy(
  strike_price: Int,
  threshold_bps: Int,
  premium_paid: Int,
  payout_amount: Int,
  expiry_slot: Int,
  status: types.PolicyStatus,
) -> PolicyDatum {
  PolicyDatum {
    owner: test_owner,
    strike_price: strike_price,
    strike_exponent: -8,
    threshold_bps: threshold_bps,
    premium_paid: premium_paid,
    payout_amount: payout_amount,
    expiry_slot: expiry_slot,
    feed_id: 2582,
    status: status,
  }
}

fn make_pool(deposits: Int, reserved: Int, premiums: Int) -> PoolDatum {
  PoolDatum {
    total_deposits: deposits,
    total_reserved: reserved,
    total_premiums_earned: premiums,
  }
}

// --- Subscribe logic ---

fn validate_subscribe_logic(
  datum: PolicyDatum,
  pool: PoolDatum,
  payout_multiplier: Int,
  current_price: Int,
  current_exponent: Int,
) -> (Bool, PoolDatum) {
  let datum_ok =
    datum.status == Active && datum.threshold_bps > 0 && datum.threshold_bps <= 10_000 && datum.premium_paid > 0 && datum.payout_amount == datum.premium_paid * payout_multiplier && datum.strike_price == current_price && datum.strike_exponent == current_exponent

  let available = pool.total_deposits - pool.total_reserved
  let liquidity_ok = available >= datum.payout_amount

  let new_pool =
    PoolDatum {
      total_deposits: pool.total_deposits,
      total_reserved: pool.total_reserved + datum.payout_amount,
      total_premiums_earned: pool.total_premiums_earned + datum.premium_paid,
    }

  (datum_ok && liquidity_ok, new_pool)
}

test subscribe_creates_policy() {
  let datum = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Active)
  let pool = make_pool(200_000_000, 50_000_000, 10_000_000)
  let (ok, new_pool) =
    validate_subscribe_logic(datum, pool, 10, 120000000000, -8)
  expect ok
  expect new_pool.total_reserved == 100_000_000
  expect new_pool.total_premiums_earned == 15_000_000
  True
}

test subscribe_fail_insufficient_liquidity() {
  let datum = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Active)
  let pool = make_pool(60_000_000, 50_000_000, 0)
  let (ok, _) = validate_subscribe_logic(datum, pool, 10, 120000000000, -8)
  !ok
}

test subscribe_fail_wrong_payout() {
  let datum = make_policy(120000000000, 1000, 5_000_000, 99_000_000, 999_999, Active)
  let pool = make_pool(200_000_000, 0, 0)
  let (ok, _) = validate_subscribe_logic(datum, pool, 10, 120000000000, -8)
  !ok
}

// --- Claim logic ---

fn validate_claim_logic(
  datum: PolicyDatum,
  pool: PoolDatum,
  current_price: Int,
  current_exponent: Int,
  current_time_ms: Int,
) -> (Bool, PoolDatum) {
  let active_ok = datum.status == Active
  let expiry_ok = current_time_ms <= datum.expiry_slot
  let exponent_ok = current_exponent == datum.strike_exponent
  let devalued =
    pyth_oracle.is_devalued(
      current_price,
      datum.strike_price,
      datum.threshold_bps,
    )

  let new_pool =
    PoolDatum {
      total_deposits: pool.total_deposits - datum.payout_amount,
      total_reserved: pool.total_reserved - datum.payout_amount,
      total_premiums_earned: pool.total_premiums_earned,
    }

  (active_ok && expiry_ok && exponent_ok && devalued, new_pool)
}

test claim_succeeds_above_threshold() {
  let datum = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Active)
  let pool = make_pool(200_000_000, 50_000_000, 5_000_000)
  // Current price 1380 (15% devaluation from 1200)
  let (ok, new_pool) =
    validate_claim_logic(datum, pool, 138000000000, -8, 500_000)
  expect ok
  expect new_pool.total_deposits == 150_000_000
  expect new_pool.total_reserved == 0
  True
}

test claim_fails_below_threshold() {
  let datum = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Active)
  let pool = make_pool(200_000_000, 50_000_000, 5_000_000)
  // Current price 1260 (5% devaluation, threshold is 10%)
  let (ok, _) = validate_claim_logic(datum, pool, 126000000000, -8, 500_000)
  !ok
}

test claim_fails_after_expiry() {
  let datum = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Active)
  let pool = make_pool(200_000_000, 50_000_000, 5_000_000)
  let (ok, _) =
    validate_claim_logic(datum, pool, 138000000000, -8, 1_000_000)
  !ok
}

test claim_fails_already_claimed() {
  let datum = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Claimed)
  let pool = make_pool(200_000_000, 50_000_000, 5_000_000)
  let (ok, _) = validate_claim_logic(datum, pool, 138000000000, -8, 500_000)
  !ok
}

// --- Expire logic ---

fn validate_expire_logic(
  datum: PolicyDatum,
  pool: PoolDatum,
  current_time_ms: Int,
) -> (Bool, PoolDatum) {
  let active_ok = datum.status == Active
  let expired_ok = current_time_ms > datum.expiry_slot

  let new_pool =
    PoolDatum {
      total_deposits: pool.total_deposits,
      total_reserved: pool.total_reserved - datum.payout_amount,
      total_premiums_earned: pool.total_premiums_earned,
    }

  (active_ok && expired_ok, new_pool)
}

test expire_succeeds_after_expiry() {
  let datum = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Active)
  let pool = make_pool(200_000_000, 50_000_000, 5_000_000)
  let (ok, new_pool) = validate_expire_logic(datum, pool, 1_000_000)
  expect ok
  expect new_pool.total_reserved == 0
  expect new_pool.total_deposits == 200_000_000
  True
}

test expire_fails_before_expiry() {
  let datum = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Active)
  let pool = make_pool(200_000_000, 50_000_000, 5_000_000)
  let (ok, _) = validate_expire_logic(datum, pool, 500_000)
  !ok
}

// --- Full lifecycle ---

test full_subscribe_claim_flow() {
  let pool = make_pool(500_000_000, 0, 0)
  let policy = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Active)

  let (sub_ok, pool) =
    validate_subscribe_logic(policy, pool, 10, 120000000000, -8)
  expect sub_ok
  expect pool.total_reserved == 50_000_000

  // ARS devalues 15% → claim
  let (claim_ok, pool) =
    validate_claim_logic(policy, pool, 138000000000, -8, 500_000)
  expect claim_ok
  expect pool.total_deposits == 450_000_000
  expect pool.total_reserved == 0
  True
}

test full_subscribe_expire_flow() {
  let pool = make_pool(500_000_000, 0, 0)
  let policy = make_policy(120000000000, 1000, 5_000_000, 50_000_000, 999_999, Active)

  let (sub_ok, pool) =
    validate_subscribe_logic(policy, pool, 10, 120000000000, -8)
  expect sub_ok

  // No devaluation, policy expires
  let (exp_ok, pool) = validate_expire_logic(policy, pool, 1_000_000)
  expect exp_ok
  expect pool.total_reserved == 0
  expect pool.total_deposits == 500_000_000
  expect pool.total_premiums_earned == 5_000_000
  True
}
