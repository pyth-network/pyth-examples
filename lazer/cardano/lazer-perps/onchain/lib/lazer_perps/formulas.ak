use aiken/math/rational.{Rational}
use lazer_perps/types.{Direction, Long, Short}

/// PnL = direction_multiplier × collateral × leverage × (exit_price - entry_price) / entry_price
///
/// direction_multiplier: +1 for Long, -1 for Short
///
/// Example (Long 5x, entry $3000, exit $3100, collateral 100):
///   PnL = +1 × 100 × 5 × (3100 - 3000) / 3000 = 16.67
pub fn compute_pnl(
  direction: Direction,
  collateral: Int,
  leverage: Int,
  entry_price: Int,
  exit_price: Int,
) -> Rational {
  // direction_multiplier × (exit_price - entry_price)
  let price_diff = when direction is {
    Long -> exit_price - entry_price
    Short -> entry_price - exit_price
  }
  // collateral × leverage × price_diff / entry_price
  expect Some(pnl) =
    rational.new(collateral * leverage * price_diff, entry_price)
  pnl
}

/// Payout = max(0, collateral + PnL)
///
/// Trader never owes more than their collateral.
pub fn compute_payout(collateral: Int, pnl: Rational) -> Rational {
  let total = rational.add(rational.from_int(collateral), pnl)
  let zero = rational.from_int(0)
  if rational.compare(total, zero) == Less {
    zero
  } else {
    total
  }
}

/// Liquidation price for Long positions:
///   liq_price = entry_price × (1 - 1/leverage + 0.01)
///
/// Simplified to integer math (all prices have 6 decimals):
///   liq_price = entry_price × (leverage - 1 + 0.01 × leverage) / leverage
///   liq_price = entry_price × (100 × leverage - 100 + leverage) / (100 × leverage)
///   liq_price = entry_price × (101 × leverage - 100) / (100 × leverage)
pub fn liquidation_price_long(
  entry_price: Int,
  leverage: Int,
) -> Rational {
  // entry_price × (101 * leverage - 100) / (100 * leverage)
  expect Some(liq) =
    rational.new(entry_price * (101 * leverage - 100), 100 * leverage)
  liq
}

/// Liquidation price for Short positions:
///   liq_price = entry_price × (1 + 1/leverage - 0.01)
///
/// Simplified:
///   liq_price = entry_price × (99 × leverage + 100) / (100 × leverage)
pub fn liquidation_price_short(
  entry_price: Int,
  leverage: Int,
) -> Rational {
  // entry_price × (99 * leverage + 100) / (100 * leverage)
  expect Some(liq) =
    rational.new(entry_price * (99 * leverage + 100), 100 * leverage)
  liq
}

/// Check if a position should be liquidated based on current price.
///   Long:  liquidate if current_price <= liq_price
///   Short: liquidate if current_price >= liq_price
pub fn is_liquidatable(
  direction: Direction,
  entry_price: Int,
  leverage: Int,
  current_price: Int,
) -> Bool {
  let current_r = rational.from_int(current_price)
  when direction is {
    Long -> {
      let liq = liquidation_price_long(entry_price, leverage)
      // current_price <= liq_price
      rational.compare(current_r, liq) != Greater
    }
    Short -> {
      let liq = liquidation_price_short(entry_price, leverage)
      // current_price >= liq_price
      rational.compare(current_r, liq) != Less
    }
  }
}
