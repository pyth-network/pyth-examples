library;

pub struct Price {
    // Confidence interval around the price
    pub confidence: u64,
    // Price exponent
    // This value represents the absolute value of an i32 in the range -255 to 0. Values other than 0, should be considered negative:
    // exponent of 5 means the Pyth Price exponent was -5
    pub exponent: u32,
    // Price
    pub price: u64,
    // The TAI64 timestamp describing when the price was published
    pub publish_time: u64,
}

impl Price {
    pub fn new(
        confidence: u64,
        exponent: u32,
        price: u64,
        publish_time: u64,
    ) -> Self {
        Self {
            confidence,
            exponent,
            price,
            publish_time,
        }
    }
}
