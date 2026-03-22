use types.{PoolDatum}

// Pool validator logic tests.
// We test the pure business logic rules directly since constructing
// full mock Transactions in Aiken is extremely verbose.
// The validator's on-chain behavior is tested via integration tests on testnet.

// --- Deposit logic ---

fn validate_deposit(
  datum: PoolDatum,
  deposit_amount: Int,
) -> (Bool, PoolDatum) {
  let valid = deposit_amount > 0
  let new_datum =
    PoolDatum {
      total_deposits: datum.total_deposits + deposit_amount,
      total_reserved: datum.total_reserved,
      total_premiums_earned: datum.total_premiums_earned,
    }
  (valid, new_datum)
}

test deposit_increases_total() {
  let datum =
    PoolDatum { total_deposits: 100_000_000, total_reserved: 0, total_premiums_earned: 0 }
  let (valid, new_datum) = validate_deposit(datum, 50_000_000)
  expect valid
  expect new_datum.total_deposits == 150_000_000
  expect new_datum.total_reserved == 0
  expect new_datum.total_premiums_earned == 0
  True
}

test deposit_zero_rejected() {
  let datum =
    PoolDatum { total_deposits: 100_000_000, total_reserved: 0, total_premiums_earned: 0 }
  let (valid, _) = validate_deposit(datum, 0)
  !valid
}

// --- Withdraw logic ---

fn validate_withdraw(
  datum: PoolDatum,
  withdraw_amount: Int,
) -> (Bool, PoolDatum) {
  let available = datum.total_deposits - datum.total_reserved
  let valid = withdraw_amount > 0 && withdraw_amount <= available
  let new_datum =
    PoolDatum {
      total_deposits: datum.total_deposits - withdraw_amount,
      total_reserved: datum.total_reserved,
      total_premiums_earned: datum.total_premiums_earned,
    }
  (valid, new_datum)
}

test withdraw_sufficient_unreserved() {
  let datum =
    PoolDatum {
      total_deposits: 100_000_000,
      total_reserved: 30_000_000,
      total_premiums_earned: 5_000_000,
    }
  // Available = 100M - 30M = 70M, withdrawing 50M should work
  let (valid, new_datum) = validate_withdraw(datum, 50_000_000)
  expect valid
  expect new_datum.total_deposits == 50_000_000
  expect new_datum.total_reserved == 30_000_000
  True
}

test withdraw_exact_available() {
  let datum =
    PoolDatum {
      total_deposits: 100_000_000,
      total_reserved: 30_000_000,
      total_premiums_earned: 0,
    }
  // Available = 70M, withdrawing exactly 70M
  let (valid, new_datum) = validate_withdraw(datum, 70_000_000)
  expect valid
  expect new_datum.total_deposits == 30_000_000
  True
}

test withdraw_fail_into_reserved() {
  let datum =
    PoolDatum {
      total_deposits: 100_000_000,
      total_reserved: 30_000_000,
      total_premiums_earned: 0,
    }
  // Available = 70M, trying to withdraw 80M — should fail
  let (valid, _) = validate_withdraw(datum, 80_000_000)
  !valid
}

test withdraw_fail_zero() {
  let datum =
    PoolDatum { total_deposits: 100_000_000, total_reserved: 0, total_premiums_earned: 0 }
  let (valid, _) = validate_withdraw(datum, 0)
  !valid
}

// --- Reserve accounting ---

fn validate_reserve_increase(
  datum: PoolDatum,
  amount: Int,
) -> (Bool, PoolDatum) {
  let available = datum.total_deposits - datum.total_reserved
  let valid = amount > 0 && available >= amount
  let new_datum =
    PoolDatum {
      ..datum,
      total_reserved: datum.total_reserved + amount,
    }
  (valid, new_datum)
}

fn validate_reserve_decrease(
  datum: PoolDatum,
  amount: Int,
) -> (Bool, PoolDatum) {
  let valid = amount > 0 && datum.total_reserved >= amount
  let new_datum =
    PoolDatum {
      ..datum,
      total_reserved: datum.total_reserved - amount,
    }
  (valid, new_datum)
}

test reserve_increase_sufficient_liquidity() {
  let datum =
    PoolDatum {
      total_deposits: 100_000_000,
      total_reserved: 20_000_000,
      total_premiums_earned: 0,
    }
  let (valid, new_datum) = validate_reserve_increase(datum, 50_000_000)
  expect valid
  expect new_datum.total_reserved == 70_000_000
  expect new_datum.total_deposits == 100_000_000
  True
}

test reserve_increase_fail_insufficient() {
  let datum =
    PoolDatum {
      total_deposits: 100_000_000,
      total_reserved: 80_000_000,
      total_premiums_earned: 0,
    }
  // Available = 20M, trying to reserve 30M
  let (valid, _) = validate_reserve_increase(datum, 30_000_000)
  !valid
}

test reserve_decrease_valid() {
  let datum =
    PoolDatum {
      total_deposits: 100_000_000,
      total_reserved: 50_000_000,
      total_premiums_earned: 0,
    }
  let (valid, new_datum) = validate_reserve_decrease(datum, 30_000_000)
  expect valid
  expect new_datum.total_reserved == 20_000_000
  True
}

test reserve_decrease_fail_exceeds() {
  let datum =
    PoolDatum {
      total_deposits: 100_000_000,
      total_reserved: 20_000_000,
      total_premiums_earned: 0,
    }
  let (valid, _) = validate_reserve_decrease(datum, 30_000_000)
  !valid
}

// --- Full lifecycle ---

test full_lifecycle_deposit_reserve_withdraw() {
  // 1. Start empty
  let pool =
    PoolDatum { total_deposits: 0, total_reserved: 0, total_premiums_earned: 0 }

  // 2. LP deposits 100 ADA
  let (ok1, pool) = validate_deposit(pool, 100_000_000)
  expect ok1

  // 3. Policy reserves 40 ADA
  let (ok2, pool) = validate_reserve_increase(pool, 40_000_000)
  expect ok2

  // 4. LP tries to withdraw 70 ADA — should fail (only 60 available)
  let (ok3, _) = validate_withdraw(pool, 70_000_000)
  expect !ok3

  // 5. LP withdraws 50 ADA — should succeed
  let (ok4, pool) = validate_withdraw(pool, 50_000_000)
  expect ok4
  expect pool.total_deposits == 50_000_000
  expect pool.total_reserved == 40_000_000

  // 6. Policy expires, releases reserve
  let (ok5, pool) = validate_reserve_decrease(pool, 40_000_000)
  expect ok5
  expect pool.total_reserved == 0

  // 7. LP can now withdraw everything
  let (ok6, pool) = validate_withdraw(pool, 50_000_000)
  expect ok6
  expect pool.total_deposits == 0

  True
}
