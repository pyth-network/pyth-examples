use aiken/math/rational.{Rational}
use aiken/option
use pyth.{Feed}

pub fn quote_price_multiplier(
  base_price: Int,
  base_exponent: Int,
  quote_price: Int,
  quote_exponent: Int,
) -> Rational {
  expect Some(multiplier) =
    rational.from_int(10) |> rational.pow(base_exponent - quote_exponent)

  expect Some(price_ratio) = rational.new(base_price, quote_price)

  rational.mul(price_ratio, multiplier)
}
