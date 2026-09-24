use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use pyth
use types.{PriceData}
use types/u32.{U32}
use types/u64

/// Maximum age of a price update in microseconds (60 seconds).
pub const max_age_us: Int = 60_000_000

/// Extract the price for a specific feed from a Pyth price update within a transaction.
///
/// Calls `pyth.get_updates` to retrieve all verified price updates from the
/// Pyth withdraw-script redeemer, then finds the feed matching `target_feed_id`.
///
/// Fails if:
/// - No Pyth updates are present in the transaction
/// - The target feed is not found in any update
/// - The feed has no price or exponent
/// - The price update is stale (older than `max_age_us` relative to `current_time_us`)
pub fn get_price(
  pyth_id: PolicyId,
  tx: Transaction,
  target_feed_id: U32,
  current_time_us: Int,
) -> PriceData {
  let updates = pyth.get_updates(pyth_id, tx)

  expect Some(found) =
    list.find_map(
      updates,
      fn(update) {
        list.find(
          update.feeds,
          fn(feed) { feed.feed_id == target_feed_id },
        )
          |> option_map(fn(feed) { (update.timestamp_us, feed) })
      },
    )

  let (timestamp_us, feed) = found

  // Validate freshness
  let age_us = current_time_us - u64.as_int(timestamp_us)
  expect age_us >= 0
  expect age_us <= max_age_us

  // Extract price and exponent (must be present)
  expect Some(Some(price)) = feed.price
  expect Some(exponent) = feed.exponent

  PriceData {
    feed_id: feed.feed_id,
    price,
    exponent,
    timestamp_us,
  }
}

/// Convert a USD amount to lovelace using an ADA/USD price.
///
/// ADA/USD price means: 1 ADA = (ada_usd_price * 10^exponent) USD
/// lovelace = (usd_amount * 10^(6 - exponent)) / ada_usd_price
///
/// Invoices are denominated in USD, matching the available Pyth ADA/USD feed (feed 16).
pub fn usd_to_lovelace(
  usd_amount: Int,
  ada_usd_price: Int,
  ada_usd_exponent: Int,
) -> Int {
  let power = 6 - ada_usd_exponent
  let numerator = usd_amount * pow10(power)
  numerator / ada_usd_price
}

/// Integer power of 10. Only supports non-negative exponents.
pub fn pow10(n: Int) -> Int {
  do_pow10(n, 1)
}

fn do_pow10(n: Int, acc: Int) -> Int {
  if n <= 0 {
    acc
  } else {
    do_pow10(n - 1, acc * 10)
  }
}

// --- Helpers ---

fn option_map(opt: Option<a>, f: fn(a) -> b) -> Option<b> {
  when opt is {
    Some(x) -> Some(f(x))
    None -> None
  }
}

// --- Tests ---

test pow10_zero() {
  pow10(0) == 1
}

test pow10_positive() {
  pow10(8) == 100_000_000
}

test usd_to_lovelace_basic() {
  // 1 ADA = $0.50 (price = 50000000, exponent = -8)
  // $100 USD → 200 ADA → 200_000_000 lovelace
  usd_to_lovelace(100, 50_000_000, -8) == 200_000_000
}

test usd_to_lovelace_realistic() {
  // 1 ADA = $0.695087 (price = 69508700, exponent = -8)
  // $1000 USD → ~1438.68 ADA → 1_438_676_157 lovelace (truncated)
  let result = usd_to_lovelace(1000, 69_508_700, -8)
  result > 1_400_000_000 && result < 1_500_000_000
}

test usd_to_lovelace_one_dollar() {
  // 1 ADA = $1.00 (price = 100000000, exponent = -8)
  // $1 USD → 1 ADA → 1_000_000 lovelace
  usd_to_lovelace(1, 100_000_000, -8) == 1_000_000
}

test usd_to_lovelace_small_amount() {
  // 1 ADA = $0.50, $10 → 20 ADA → 20_000_000 lovelace
  usd_to_lovelace(10, 50_000_000, -8) == 20_000_000
}

test usd_to_lovelace_large_invoice() {
  // 1 ADA = $0.70 (price = 70000000, exponent = -8)
  // $100_000 USD → ~142857 ADA
  let result = usd_to_lovelace(100_000, 70_000_000, -8)
  result > 142_000_000_000 && result < 143_000_000_000
}

test max_age_is_60_seconds() {
  max_age_us == 60_000_000
}

test pow10_large() {
  pow10(14) == 100_000_000_000_000
}
