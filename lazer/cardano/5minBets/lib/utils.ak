use aiken/collection/list
use types.{Bet, BetSide, Down, Up}

/// Protocol fee in basis points (200 = 2%).
pub const fee_bps: Int = 200

/// Sum of all stakes in the pool (lovelace).
pub fn total_pool(bets: List<Bet>) -> Int {
  list.foldl(bets, 0, fn(bet, acc) { acc + bet.amount })
}

/// Sum of stakes placed on a specific side.
pub fn side_pool(bets: List<Bet>, side: BetSide) -> Int {
  bets
    |> list.filter(fn(b) { b.side == side })
    |> list.foldl(0, fn(b, acc) { acc + b.amount })
}

/// Determine the winning side from the opening and closing prices.
/// Returns None when the prices are equal (draw).
pub fn determine_winner(open_price: Int, close_price: Int) -> Option<BetSide> {
  if close_price > open_price {
    Some(Up)
  } else if close_price < open_price {
    Some(Down)
  } else {
    None
  }
}

/// Net payout for a winner after the protocol fee is deducted.
///
/// Formula: (stake × total / winner_pool) × (1 − fee_bps / 10000)
pub fn net_payout(stake: Int, winner_pool: Int, total: Int) -> Int {
  let gross = stake * total / winner_pool
  let fee = gross * fee_bps / 10000
  gross - fee
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

fn make_bet(side: BetSide, amount: Int) -> Bet {
  Bet { bettor: #"aa", side, amount }
}

// --- total_pool ---

test total_pool_empty() {
  total_pool([]) == 0
}

test total_pool_single() {
  total_pool([make_bet(Up, 1000000)]) == 1000000
}

test total_pool_multiple() {
  let bets = [make_bet(Up, 3000000), make_bet(Down, 2000000), make_bet(Up, 1000000)]
  total_pool(bets) == 6000000
}

// --- side_pool ---

test side_pool_all_up() {
  let bets = [make_bet(Up, 1000000), make_bet(Up, 2000000)]
  side_pool(bets, Up) == 3000000
}

test side_pool_all_down() {
  let bets = [make_bet(Down, 1000000), make_bet(Down, 500000)]
  side_pool(bets, Down) == 1500000
}

test side_pool_mixed_counts_correct_side() {
  let bets = [make_bet(Up, 4000000), make_bet(Down, 1000000), make_bet(Up, 2000000)]
  side_pool(bets, Up) == 6000000 && side_pool(bets, Down) == 1000000
}

test side_pool_empty_side_returns_zero() {
  let bets = [make_bet(Up, 3000000)]
  side_pool(bets, Down) == 0
}

// --- determine_winner ---

test determine_winner_price_rises() {
  determine_winner(100, 110) == Some(Up)
}

test determine_winner_price_falls() {
  determine_winner(100, 90) == Some(Down)
}

test determine_winner_price_unchanged() {
  determine_winner(100, 100) == None
}

// --- net_payout ---

test net_payout_sole_winner_takes_all_minus_fee() {
  // sole winner: gross = stake (100_000_000), fee = 2%, net = 98_000_000
  net_payout(100000000, 100000000, 100000000) == 98000000
}

test net_payout_proportional_two_sided() {
  // bettor_a: stake = 10_000_000, winner_pool = 10_000_000, total = 15_000_000
  // gross = 10_000_000 * 15_000_000 / 10_000_000 = 15_000_000
  // fee   = 15_000_000 * 200 / 10_000 = 300_000
  // net   = 14_700_000
  net_payout(10000000, 10000000, 15000000) == 14700000
}

test net_payout_partial_stake() {
  // bettor staked half the winning pool: gross = 2×stake, fee = 2%
  // stake = 5_000_000, winner_pool = 10_000_000, total = 15_000_000
  // gross = 5_000_000 * 15_000_000 / 10_000_000 = 7_500_000
  // fee   = 7_500_000 * 200 / 10_000 = 150_000
  // net   = 7_350_000
  net_payout(5000000, 10000000, 15000000) == 7350000
}
