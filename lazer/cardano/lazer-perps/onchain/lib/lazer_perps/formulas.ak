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

// ─── Tests ───────────────────────────────────────────────────────────

// PnL: Long 5x, entry 3000, exit 3100, collateral 100
// PnL = 100 * 5 * (3100 - 3000) / 3000 = 500 * 100 / 3000 = 16.67
test pnl_long_profit() {
  let pnl = compute_pnl(Long, 100, 5, 3000, 3100)
  rational.round(pnl) == 17
}

// PnL: Long 5x, entry 3000, exit 2900, collateral 100
// PnL = 100 * 5 * (2900 - 3000) / 3000 = -16.67
test pnl_long_loss() {
  let pnl = compute_pnl(Long, 100, 5, 3000, 2900)
  rational.round(pnl) == -17
}

// PnL: Short 5x, entry 3000, exit 2900, collateral 100
// PnL = 100 * 5 * (3000 - 2900) / 3000 = 16.67
test pnl_short_profit() {
  let pnl = compute_pnl(Short, 100, 5, 3000, 2900)
  rational.round(pnl) == 17
}

// PnL: Short 5x, entry 3000, exit 3100, collateral 100
// PnL = 100 * 5 * (3000 - 3100) / 3000 = -16.67
test pnl_short_loss() {
  let pnl = compute_pnl(Short, 100, 5, 3000, 3100)
  rational.round(pnl) == -17
}

// Payout: collateral 100 + PnL 50 = 150
test payout_positive() {
  let pnl = rational.from_int(50)
  let payout = compute_payout(100, pnl)
  rational.round(payout) == 150
}

// Payout floor: collateral 100 + PnL -200 → max(0, -100) = 0
test payout_zero_floor() {
  let pnl = rational.from_int(-200)
  let payout = compute_payout(100, pnl)
  rational.round(payout) == 0
}

// Liq price Long 10x, entry 3000:
// liq = 3000 * (101*10 - 100) / (100*10) = 3000 * 910 / 1000 = 2730
test liq_price_long_10x() {
  let liq = liquidation_price_long(3000, 10)
  rational.round(liq) == 2730
}

// Liq price Short 10x, entry 3000:
// liq = 3000 * (99*10 + 100) / (100*10) = 3000 * 1090 / 1000 = 3270
test liq_price_short_10x() {
  let liq = liquidation_price_short(3000, 10)
  rational.round(liq) == 3270
}

// Long at 2700 (below liq 2730) → liquidatable
test liquidatable_long_yes() {
  is_liquidatable(Long, 3000, 10, 2700) == True
}

// Long at 2800 (above liq 2730) → safe
test liquidatable_long_no() {
  is_liquidatable(Long, 3000, 10, 2800) == False
}

// Short at 3300 (above liq 3270) → liquidatable
test liquidatable_short_yes() {
  is_liquidatable(Short, 3000, 10, 3300) == True
}

// Short at 3200 (below liq 3270) → safe
test liquidatable_short_no() {
  is_liquidatable(Short, 3000, 10, 3200) == False
}
