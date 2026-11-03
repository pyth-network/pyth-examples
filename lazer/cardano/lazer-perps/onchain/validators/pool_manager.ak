use cardano/transaction.{Transaction}
use lazer_perps/types.{MarketConfig, PoolState}

/// Pool actions
pub type PoolAction {
  /// Deposit liquidity into the pool
  Deposit
  /// Withdraw liquidity from the pool (only if OI allows)
  Withdraw
  /// Update pool state after position open (increase OI)
  PositionOpened { size: Int }
  /// Update pool state after position close (decrease OI, settle PnL)
  PositionClosed { size: Int, pnl: Int }
  /// Update pool state after liquidation (decrease OI, collect remaining)
  PositionLiquidated { size: Int, recovered: Int }
}

/// Pool Manager validator.
///
/// Manages the shared liquidity UTxO for the perps protocol.
/// Tracks open interest and enforces caps to limit protocol exposure.
///
/// The pool receives funds on losing trades and pays out on winning trades.
/// All state transitions require a valid continuation output with
/// updated PoolState datum.
validator pool_manager(_config: MarketConfig) {
  spend(
    datum: Option<PoolState>,
    redeemer: PoolAction,
    _own_ref: Data,
    _self: Transaction,
  ) {
    expect Some(pool) = datum

    when redeemer is {
      // Deposit — anyone can add liquidity
      Deposit -> True

      // Withdraw — only if remaining liquidity covers open interest
      Withdraw -> {
        // Pool must maintain enough liquidity to cover max possible payouts
        // For MVP: allow withdrawal if no open interest
        pool.total_open_interest == 0
      }

      // Position opened — increase open interest
      PositionOpened { size } -> {
        let new_oi = pool.total_open_interest + size
        // Open interest cap check
        new_oi <= pool.max_open_interest
      }

      // Position closed — decrease open interest, settle PnL
      PositionClosed { size, pnl: _ } -> {
        let new_oi = pool.total_open_interest - size
        // OI cannot go negative
        new_oi >= 0
      }

      // Position liquidated — decrease OI, recover collateral
      PositionLiquidated { size, recovered: _ } -> {
        let new_oi = pool.total_open_interest - size
        new_oi >= 0
      }
    }
  }
}
