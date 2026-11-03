use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference}

pub type PosixTime =
  Int

pub type Direction {
  Up
  Down
}

pub type Operation {
  Buy
  Sell
}

pub type Price {
  numerator: Int,
  denominator: Int,
}

pub type OrderDatum {
  direction: Direction,
  operation: Operation,
  price: Price,
  owner: VerificationKeyHash,
  expected_tokens: Int,
}

pub type OrderRedeemer {
  Cancel
  Match
  Fill(Int)
}

pub type OrderMintRedeemer {
  Mint(OutputReference)
  Burn
}

pub type MarketDatum {
  start_price: Price,
  end_price: Option<Price>,
  remaining_shares: Int,
}

pub type MarketRedeemer {
  RecordFinalPrice
  ClaimWinnings(Int)
  ClaimLosings(Int)
  CloseMarket
  ProcessMatch
}

pub type MarketMintRedeemer {
  MintControlToken
  BurnControlToken
  MintPositionToken(Direction)
  BurnPositionToken(Direction)
}
