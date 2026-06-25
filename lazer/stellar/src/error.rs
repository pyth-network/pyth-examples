use soroban_sdk::contracterror;

use pyth_lazer_stellar_sdk::ParseError;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    PriceStale = 1,
    FeedMissing = 2,
    TimestampMissing = 3,
    PriceMissing = 4,
    ExponentMissing = 5,
    PriceNotInitialized = 6,
    Overflow = 7,
    ParseError = 8,
}

impl From<ParseError> for Error {
    fn from(_: ParseError) -> Self {
        Error::ParseError
    }
}
