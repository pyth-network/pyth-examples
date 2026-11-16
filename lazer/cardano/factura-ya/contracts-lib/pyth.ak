use aiken/collection/list
use aiken/collection/pairs
use aiken/crypto.{ScriptHash}
use cardano/address.{Script}
use cardano/assets.{PolicyId}
use cardano/transaction.{InlineDatum, Transaction, ValidityRange, Withdraw}
use parser.{Parser, parse}
use pyth/message.{TrustedSigners}
use types/i16
use types/i64
use types/u16.{U16}
use types/u32.{U32}
use types/u64.{U64}
use types/u8.{U8}

const price_update_magic_le = #"75d3c793"

pub type Governance {
  wormhole: PolicyId,
  emitter_chain: Int,
  emitter_address: ByteArray,
  seen_sequence: Int,
}

pub type Pyth {
  governance: Governance,
  trusted_signers: TrustedSigners,
  deprecated_withdraw_scripts: Pairs<ValidityRange, ScriptHash>,
  withdraw_script: ScriptHash,
}

pub type PriceUpdate {
  timestamp_us: U64,
  channel_id: U8,
  feeds: List<Feed>,
}

pub fn get_updates(pyth_id: PolicyId, self: Transaction) -> List<PriceUpdate> {
  expect Some(state) =
    list.find_map(
      self.reference_inputs,
      fn(input) {
        if assets.has_nft_strict(input.output.value, pyth_id, "Pyth State") {
          // state token outside of script address would imply a bug
          expect Script(_) = input.output.address.payment_credential
          expect InlineDatum(state) = input.output.datum
          expect state: Pyth = state
          Some(state)
        } else {
          None
        }
      },
    )
  expect Some(redeemer) =
    pairs.get_first(self.redeemers, Withdraw(Script(state.withdraw_script)))
  expect updates: List<ByteArray> = redeemer
  list.map(
    updates,
    fn(message) {
      let message = message.parse_without_verification(message)
      parse_update(message.payload)
    },
  )
}

fn parse_update(payload: ByteArray) -> PriceUpdate {
  parser.run(price_update, payload)
}

pub type Feed {
  feed_id: U32,
  price: Option<Option<Int>>,
  best_bid_price: Option<Option<Int>>,
  best_ask_price: Option<Option<Int>>,
  publisher_count: Option<U16>,
  exponent: Option<Int>,
  confidence: Option<Option<Int>>,
  funding_rate: Option<Option<Int>>,
  funding_timestamp: Option<Option<U64>>,
  funding_rate_interval: Option<Option<U64>>,
  market_session: Option<MarketSession>,
  ema_price: Option<Option<Int>>,
  ema_confidence: Option<Option<Int>>,
  feed_update_timestamp: Option<Option<U64>>,
}

fn empty(feed_id: U32) -> Feed {
  Feed {
    feed_id,
    price: None,
    best_bid_price: None,
    best_ask_price: None,
    publisher_count: None,
    exponent: None,
    confidence: None,
    funding_rate: None,
    funding_timestamp: None,
    funding_rate_interval: None,
    market_session: None,
    ema_price: None,
    ema_confidence: None,
    feed_update_timestamp: None,
  }
}

type FeedProperty {
  Price(Option<Int>)
  BestBidPrice(Option<Int>)
  BestAskPrice(Option<Int>)
  PublisherCount(U16)
  Exponent(Int)
  Confidence(Option<Int>)
  FundingRate(Option<Int>)
  FundingTimestamp(Option<U64>)
  FundingRateInterval(Option<U64>)
  MarketSession(MarketSession)
  EmaPrice(Option<Int>)
  EmaConfidence(Option<Int>)
  FeedUpdateTimestamp(Option<U64>)
}

fn apply_properties(self: Feed, properties: List<FeedProperty>) -> Feed {
  list.foldl(
    properties,
    self,
    fn(f, self) {
      when f is {
        Price(p) -> Feed { ..self, price: Some(p) }
        BestBidPrice(p) -> Feed { ..self, best_bid_price: Some(p) }
        BestAskPrice(p) -> Feed { ..self, best_ask_price: Some(p) }
        PublisherCount(p) -> Feed { ..self, publisher_count: Some(p) }
        Exponent(p) -> Feed { ..self, exponent: Some(p) }
        Confidence(p) -> Feed { ..self, confidence: Some(p) }
        FundingRate(p) -> Feed { ..self, funding_rate: Some(p) }
        FundingTimestamp(p) -> Feed { ..self, funding_timestamp: Some(p) }
        FundingRateInterval(p) ->
          Feed { ..self, funding_rate_interval: Some(p) }
        MarketSession(p) -> Feed { ..self, market_session: Some(p) }
        EmaPrice(p) -> Feed { ..self, ema_price: Some(p) }
        EmaConfidence(p) -> Feed { ..self, ema_confidence: Some(p) }
        FeedUpdateTimestamp(p) ->
          Feed { ..self, feed_update_timestamp: Some(p) }
      }
    },
  )
}

pub type MarketSession {
  Regular
  PreMarket
  PostMarket
  OverNight
  Closed
}

fn nonzero_i64_property(
  property: fn(Option<Int>) -> FeedProperty,
) -> Parser<FeedProperty> {
  let i <- parser.map(i64.from_le)
  let i = i64.as_int(i)
  property(
    if i == 0 {
      None
    } else {
      Some(i)
    },
  )
}

fn optional_property(
  property: fn(Option<a>) -> FeedProperty,
  parser: Parser<a>,
) -> Parser<FeedProperty> {
  let present <- parse(u8.from)
  if present != u8.zero {
    parser.map(parser, fn(p) { property(Some(p)) })
  } else {
    property(None) |> parser.return
  }
}

fn market_session() -> Parser<MarketSession> {
  let s <- parser.map(u16.from_le)
  when u16.as_int(s) is {
    0 -> Regular
    1 -> PreMarket
    2 -> PostMarket
    3 -> OverNight
    4 -> Closed
    _ -> fail @"MarketSession value out of range"
  }
}

fn feed_property() -> Parser<FeedProperty> {
  let property_id <- parse(u8.from)
  when u8.as_int(property_id) is {
    0 -> nonzero_i64_property(Price)
    1 -> nonzero_i64_property(BestBidPrice)
    2 -> nonzero_i64_property(BestAskPrice)
    3 -> parser.map(u16.from_le, PublisherCount)
    4 -> parser.map(i16.from_le, fn(i) { Exponent(i16.as_int(i)) })
    5 -> nonzero_i64_property(Confidence)
    6 -> optional_property(FundingRate, parser.map(i64.from_le, i64.as_int))
    7 -> optional_property(FundingTimestamp, u64.from_le)
    8 -> optional_property(FundingRateInterval, u64.from_le)
    9 -> parser.map(market_session(), MarketSession)
    10 -> nonzero_i64_property(EmaPrice)
    11 -> nonzero_i64_property(EmaConfidence)
    12 -> optional_property(FeedUpdateTimestamp, u64.from_le)
    _ -> fail @"FeedProperty ID out of range"
  }
}

const feed: Parser<Feed> = {
    let feed_id <- parse(u32.from_le)
    let properties_len <- parse(u8.from)
    let properties <-
      parse(parser.repeat(feed_property(), u8.as_int(properties_len)))
    apply_properties(empty(feed_id), properties) |> parser.return
  }

const price_update: Parser<PriceUpdate> = {
    let magic <- parse(parser.bytes(4))
    expect magic == price_update_magic_le
    let timestamp_us <- parse(u64.from_le)
    let channel_id <- parse(u8.from)
    let feeds_len <- parse(u8.from)
    let feeds <- parse(parser.repeat(feed, u8.as_int(feeds_len)))
    PriceUpdate { timestamp_us, channel_id, feeds } |> parser.return
  }

