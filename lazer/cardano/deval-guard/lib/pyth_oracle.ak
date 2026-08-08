use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use pyth
use types.{PriceData}
use types/u32
use types/u64

/// Maximum age of a price update in microseconds (60 seconds).
pub const max_age_us: Int = 60_000_000

/// Extract the price for a specific feed from a Pyth price update within a transaction.
///
/// Calls `pyth.get_updates` to retrieve all verified price updates from the
/// Pyth withdraw-script redeemer, then finds the feed matching `target_feed_id`.
///
/// `target_feed_id` is a plain Int (converted to U32 internally) so that
/// it can be used as a validator parameter without opaque-type issues.
///
/// Fails if:
/// - No Pyth updates are present in the transaction
/// - The target feed is not found in any update
/// - The feed has no price or exponent
/// - The price update is stale (older than `max_age_us` relative to `current_time_us`)
pub fn get_price(
  pyth_id: PolicyId,
  tx: Transaction,
  target_feed_id: Int,
  current_time_us: Int,
) -> PriceData {
  let target_u32 = u32.from_int(target_feed_id)
  let updates = pyth.get_updates(pyth_id, tx)

  expect Some(found) =
    list.find_map(
      updates,
      fn(update) {
        list.find(
          update.feeds,
          fn(feed) { feed.feed_id == target_u32 },
        )
          |> option_map(fn(feed) { (update.timestamp_us, feed) })
      },
    )

  let (timestamp_us, feed) = found
  let timestamp_us_int = u64.as_int(timestamp_us)

  // Validate freshness
  let age_us = current_time_us - timestamp_us_int
  expect age_us >= 0
  expect age_us <= max_age_us

  // Extract price and exponent (must be present)
  expect Some(Some(price)) = feed.price
  expect Some(exponent) = feed.exponent

  PriceData {
    feed_id: target_feed_id,
    price,
    exponent,
    timestamp_us: timestamp_us_int,
  }
}

/// Check if a devaluation has occurred.
///
/// For a currency pair like ARS/USD where price going UP means devaluation
/// (more ARS per USD), we check if the current price exceeds the strike
/// price by at least `threshold_bps` basis points.
///
/// Returns True if: (current_price - strike_price) * 10000 / strike_price >= threshold_bps
///
/// Both prices must share the same exponent (enforced at subscription time).
pub fn is_devalued(
  current_price: Int,
  strike_price: Int,
  threshold_bps: Int,
) -> Bool {
  // Avoid division: (current - strike) * 10000 >= threshold * strike
  let delta = current_price - strike_price
  delta * 10_000 >= threshold_bps * strike_price
}

// --- Helpers ---

fn option_map(opt: Option<a>, f: fn(a) -> b) -> Option<b> {
  when opt is {
    Some(x) -> Some(f(x))
    None -> None
  }
}

// --- Tests ---

test is_devalued_above_threshold() {
  // Strike: 1000 ARS/USD, current: 1150 ARS/USD → 15% devaluation
  // threshold: 1000 bps (10%)
  is_devalued(1150, 1000, 1000)
}

test is_devalued_exact_threshold() {
  // Strike: 1000, current: 1100 → exactly 10%
  // threshold: 1000 bps (10%)
  is_devalued(1100, 1000, 1000)
}

test is_devalued_below_threshold() {
  // Strike: 1000, current: 1050 → 5% (below 10% threshold)
  !is_devalued(1050, 1000, 1000)
}

test is_devalued_no_change() {
  // No devaluation at all
  !is_devalued(1000, 1000, 1000)
}

test is_devalued_appreciation() {
  // Price went DOWN (appreciation) — not devalued
  !is_devalued(900, 1000, 1000)
}

test is_devalued_large_numbers() {
  // Realistic Pyth prices with exponent -8
  // Strike: 120000000000 (1200.00 ARS/USD), current: 136800000000 (1368.00 → 14%)
  is_devalued(136_800_000_000, 120_000_000_000, 1000)
}

test is_devalued_small_threshold() {
  // 5% threshold (500 bps)
  // Strike: 1000, current: 1051 → 5.1%
  is_devalued(1051, 1000, 500)
}
