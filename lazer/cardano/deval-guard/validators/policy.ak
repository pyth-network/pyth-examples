use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval.{Finite, IntervalBound}
use cardano/address.{Script}
use cardano/assets
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use pyth_oracle
use types.{
  Active, Claim, Expire, PolicyDatum, PolicyRedeemer, PoolDatum,
  ProtocolConfig, Subscribe,
}

/// Pool NFT token name (must match liquidity_pool.ak).
const pool_nft_name: ByteArray = "DevalGuard Pool"

// --- Validator ---

validator policy(config: ProtocolConfig) {
  spend(
    datum: Option<PolicyDatum>,
    redeemer: PolicyRedeemer,
    _utxo: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = datum

    when redeemer is {
      Subscribe -> validate_subscribe(config, datum, self)
      Claim -> validate_claim(config, datum, self)
      Expire -> validate_expire(config, datum, self)
    }
  }

  else(_) {
    fail
  }
}

// --- Subscribe ---

fn validate_subscribe(
  config: ProtocolConfig,
  datum: PolicyDatum,
  tx: Transaction,
) -> Bool {
  // The policy UTxO being spent here is a "template" — the real logic is:
  // verify the NEW policy UTxO created in outputs has correct datum.

  // 1. Verify the policy datum is well-formed
  expect datum.status == Active
  expect datum.threshold_bps > 0
  expect datum.threshold_bps <= 10_000
  expect datum.premium_paid > 0
  expect datum.payout_amount == datum.premium_paid * config.payout_multiplier

  // 2. Verify Pyth price was read and matches strike_price
  let tx_time_us = get_tx_time_us(tx)
  let price_data =
    pyth_oracle.get_price(config.pyth_policy_id, tx, config.feed_id, tx_time_us)
  expect datum.strike_price == price_data.price
  expect datum.strike_exponent == price_data.exponent

  // 3. Verify pool interaction: pool UTxO must be spent with ReserveIncrease
  let (pool_in_datum, pool_out_datum) = get_pool_datums(tx, config)
  expect
    pool_out_datum.total_reserved == pool_in_datum.total_reserved + datum.payout_amount
  // Pool must have received the premium
  expect
    pool_out_datum.total_premiums_earned == pool_in_datum.total_premiums_earned + datum.premium_paid

  // 4. Verify sufficient liquidity existed before reservation
  let available_before =
    pool_in_datum.total_deposits - pool_in_datum.total_reserved
  expect available_before >= datum.payout_amount

  True
}

// --- Claim ---

fn validate_claim(
  config: ProtocolConfig,
  datum: PolicyDatum,
  tx: Transaction,
) -> Bool {
  // 1. Policy must be Active
  expect datum.status == Active

  // 2. Must be within coverage period
  expect is_before_expiry(tx, datum.expiry_slot)

  // 3. Read current Pyth price
  let tx_time_us = get_tx_time_us(tx)
  let price_data =
    pyth_oracle.get_price(config.pyth_policy_id, tx, config.feed_id, tx_time_us)

  // 4. Exponents must match (same feed, should always be true)
  expect price_data.exponent == datum.strike_exponent

  // 5. Check devaluation threshold is met
  expect
    pyth_oracle.is_devalued(
      price_data.price,
      datum.strike_price,
      datum.threshold_bps,
    )

  // 6. Verify payout goes to the policy owner
  expect is_paid_to(tx.outputs, datum.owner, datum.payout_amount)

  // 7. Verify pool reserve decrease
  let (pool_in_datum, pool_out_datum) = get_pool_datums(tx, config)
  expect
    pool_out_datum.total_reserved == pool_in_datum.total_reserved - datum.payout_amount
  expect
    pool_out_datum.total_deposits == pool_in_datum.total_deposits - datum.payout_amount

  True
}

// --- Expire ---

fn validate_expire(
  config: ProtocolConfig,
  datum: PolicyDatum,
  tx: Transaction,
) -> Bool {
  // 1. Policy must be Active
  expect datum.status == Active

  // 2. Must be past the expiry slot
  expect is_after_expiry(tx, datum.expiry_slot)

  // 3. Verify pool reserve decrease (funds freed, premium kept as yield)
  let (pool_in_datum, pool_out_datum) = get_pool_datums(tx, config)
  expect
    pool_out_datum.total_reserved == pool_in_datum.total_reserved - datum.payout_amount
  // Deposits stay the same (premium was already counted at subscribe time)
  expect pool_out_datum.total_deposits == pool_in_datum.total_deposits

  True
}

// --- Helpers ---

/// Extract pool input and output datums from the transaction.
fn get_pool_datums(
  tx: Transaction,
  config: ProtocolConfig,
) -> (PoolDatum, PoolDatum) {
  // Find pool input
  expect Some(pool_input) =
    list.find(
      tx.inputs,
      fn(inp) {
        when inp.output.address.payment_credential is {
          Script(hash) ->
            hash == config.pool_validator_hash && assets.quantity_of(
              inp.output.value,
              config.pool_validator_hash,
              pool_nft_name,
            ) == 1
          _ -> False
        }
      },
    )
  expect InlineDatum(in_raw) = pool_input.output.datum
  expect in_datum: PoolDatum = in_raw

  // Find pool output
  expect Some(pool_output) =
    list.find(
      tx.outputs,
      fn(out) {
        when out.address.payment_credential is {
          Script(hash) ->
            hash == config.pool_validator_hash && assets.quantity_of(
              out.value,
              config.pool_validator_hash,
              pool_nft_name,
            ) == 1
          _ -> False
        }
      },
    )
  expect InlineDatum(out_raw) = pool_output.datum
  expect out_datum: PoolDatum = out_raw

  (in_datum, out_datum)
}

/// Check that an output pays at least `amount` lovelace to a given pubkey.
fn is_paid_to(
  outputs: List<Output>,
  owner: VerificationKeyHash,
  amount: Int,
) -> Bool {
  list.any(
    outputs,
    fn(out) {
      when out.address.payment_credential is {
        address.VerificationKey(hash) ->
          hash == owner && assets.lovelace_of(out.value) >= amount
        _ -> False
      }
    },
  )
}

/// Get the transaction validity start time in microseconds.
/// Extracts the lower bound of the validity interval and converts ms → us.
fn get_tx_time_us(tx: Transaction) -> Int {
  let IntervalBound { bound_type, .. } = tx.validity_range.lower_bound
  expect Finite(lower_ms) = bound_type
  lower_ms * 1000
}

/// Check that the entire transaction validity range is before the expiry time.
/// expiry_time is in POSIX milliseconds (same unit as validity_range).
fn is_before_expiry(tx: Transaction, expiry_time: Int) -> Bool {
  let IntervalBound { bound_type, .. } = tx.validity_range.upper_bound
  expect Finite(upper_ms) = bound_type
  upper_ms <= expiry_time
}

/// Check that the entire transaction validity range is after the expiry time.
fn is_after_expiry(tx: Transaction, expiry_time: Int) -> Bool {
  let IntervalBound { bound_type, .. } = tx.validity_range.lower_bound
  expect Finite(lower_ms) = bound_type
  lower_ms > expiry_time
}
