use aiken/crypto.{VerificationKeyHash}

/// Pyth Lazer feed ID for XAU/USD (gold priced in US dollars).
/// Verify this against https://pyth.network/developers/price-feed-ids before deploying.
pub const xau_usd_feed_id: Int = 6

/// Minimum bet size in lovelace (2 ADA).
/// Prevents spam bets that bloat the on-chain datum.
pub const min_bet_lovelace: Int = 2000000

pub type BetSide {
  Up
  Down
}

pub type RoundStatus {
  Open
  Settled { winner: BetSide }
  Draw
  Void
}

pub type Bet {
  bettor: VerificationKeyHash,
  side: BetSide,
  amount: Int,
}

/// On-chain datum for a betting round.
///
/// A round is opened by the relayer, who also closes it by submitting
/// the Pyth Lazer closing price for the configured feed. Winners claim
/// their proportional share of the pool minus a 2% protocol fee.
pub type RoundDatum {
  /// Pyth Lazer feed ID that this round tracks (must equal xau_usd_feed_id).
  feed_id: Int,
  /// Key hash of the trusted relayer who opens and settles rounds.
  relayer: VerificationKeyHash,
  /// Pyth XAU/USD price at round open (scaled integer, e.g. price × 10^8).
  open_price: Int,
  /// Pyth XAU/USD price at round close — None while the round is open.
  close_price: Option<Int>,
  /// Current lifecycle state of the round.
  status: RoundStatus,
  /// POSIX time in milliseconds when the betting window closes.
  deadline_ms: Int,
  /// All bets placed in this round.
  bets: List<Bet>,
  /// Bettors who have already collected their winnings or refunds.
  claimed: List<VerificationKeyHash>,
}

pub type Action {
  /// A user places a bet on a price direction before the deadline.
  PlaceBet { bettor: VerificationKeyHash, side: BetSide }
  /// The relayer submits the Pyth closing price to resolve the round.
  Settle { close_price: Int }
  /// A winner claims their proportional share of the pool (minus fee).
  Claim { bettor: VerificationKeyHash }
  /// A bettor recovers their full stake from a drawn or voided round.
  Refund { bettor: VerificationKeyHash }
}
