//// Iron Pig — shared types & valuation helpers for the vault validator.
////
//// ## Units
//// - **micro-USD**: 1 USD = 1_000_000 micro-USD (fixed-point, off-chain convention).
//// - **Stablecoins**: each ledger unit of a configured `(PolicyId, AssetName)` counts as **1 micro-USD**
////   (demo simplification; map decimals off-chain for real USDC/iUSD).
//// - **ADA / Pyth Lazer**: uses `pyth.get_updates` to read `(price, exponent)` for the ADA/USD feed.
////   On-chain: `micro_usd_for_ada = lovelace * price * 10^exponent`.

use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Address}
use cardano/assets.{
  AssetName, PolicyId, Value, ada_asset_name, ada_policy_id, flatten,
  merge, quantity_of, zero,
}
use cardano/transaction.{Output}

/// Vault rules (set at lock time, preserved on every `Deposit`).
pub type IronPigDatum {
  /// Target portfolio value in micro-USD.
  goal_micro_usd: Int,
  /// Only this key hash may sign `Withdraw` once the goal is met.
  owner: VerificationKeyHash,
  /// Pyth deployment policy ID (locates the "Pyth State" NFT in reference inputs).
  pyth_policy_id: PolicyId,
  /// Numeric Pyth Lazer feed ID (e.g. 16 for ADA/USD).
  ada_usd_feed_id: Int,
}

pub type PigRedeemer {
  Deposit
  Withdraw
}

/// 10^e for small non-negative e (sufficient for typical Pyth exponents).
fn pow10_pos(e: Int) -> Int {
  if e <= 0 {
    1
  } else {
    10 * pow10_pos(e - 1)
  }
}

/// Micro-USD contributed by locked ADA given Pyth price + exponent.
pub fn ada_value_micro_usd(lovelace: Int, price: Int, expo: Int) -> Int {
  let n = lovelace * price
  if expo >= 0 {
    n * pow10_pos(expo)
  } else {
    n / pow10_pos(-expo)
  }
}

/// Sum configured stable balances; **1 token unit == 1 micro-USD** (demo).
pub fn stable_micro_usd(
  value: Value,
  stables: List<(PolicyId, AssetName)>,
) -> Int {
  list.foldr(
    stables,
    0,
    fn(pair, acc) {
      let (p, n) = pair
      acc + quantity_of(value, p, n)
    },
  )
}

pub fn vault_total_micro_usd(
  value: Value,
  stables: List<(PolicyId, AssetName)>,
  ada_price: Int,
  ada_expo: Int,
) -> Int {
  let ada_qty = quantity_of(value, ada_policy_id, ada_asset_name)
  let ada_part = ada_value_micro_usd(ada_qty, ada_price, ada_expo)
  let stable_part = stable_micro_usd(value, stables)
  ada_part + stable_part
}

/// Every asset present in `inner` must appear in `outer` with >= quantity.
pub fn value_covers(inner: Value, outer: Value) -> Bool {
  flatten(inner)
    |> list.all(
        fn(triple) {
          let (p, n, q) = triple
          quantity_of(outer, p, n) >= q
        },
      )
}

/// Sum of `value` on all outputs paid to `recipient`.
pub fn value_paid_to(outputs: List<Output>, recipient: Address) -> Value {
  list.foldr(
    outputs,
    zero,
    fn(o, acc) {
      if o.address == recipient {
        merge(acc, o.value)
      } else {
        acc
      }
    },
  )
}
