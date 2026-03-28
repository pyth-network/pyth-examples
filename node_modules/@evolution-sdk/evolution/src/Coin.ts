import { FastCheck, Schema } from "effect"

/**
 * Maximum value for a coin amount (maxWord64).
 *
 * @since 2.0.0
 * @category constants
 */
export const MAX_COIN_VALUE = 18446744073709551615n

/**
 * Schema for validating coin amounts as unsigned 64-bit integers.
 * coin = uint
 *
 * @since 2.0.0
 * @category schemas
 */
export const Coin = Schema.BigInt.pipe(Schema.filter((value) => value >= 0n && value <= MAX_COIN_VALUE)).annotations({
  message: (issue) => `Coin must be between 0 and ${MAX_COIN_VALUE}, but got ${issue.actual}`,
  identifier: "Coin"
})

/**
 * Type alias for Coin representing ADA amounts in lovelace.
 * 1 ADA = 1,000,000 lovelace
 *
 * @since 2.0.0
 * @category model
 */
export type Coin = typeof Coin.Type

/**
 * Check if a value is a valid Coin.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = Schema.is(Coin)

/**
 * Add two coin amounts safely.
 *
 * @since 2.0.0
 * @category transformation
 */
export const add = (a: Coin, b: Coin): Coin => {
  const result = a + b
  if (result > MAX_COIN_VALUE) {
    throw new Error(`Addition overflow: ${a} + ${b} exceeds maximum coin value`)
  }
  return Coin.make(result)
}

/**
 * Subtract two coin amounts safely.
 *
 * @since 2.0.0
 * @category transformation
 */
export const subtract = (a: Coin, b: Coin): Coin => {
  const result = a - b
  if (result < 0n) {
    throw new Error(`Subtraction underflow: ${a} - ${b} results in negative value`)
  }
  return Coin.make(result)
}

/**
 * Compare two coin amounts.
 *
 * @since 2.0.0
 * @category ordering
 */
export const compare = (a: Coin, b: Coin): -1 | 0 | 1 => {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/**
 * Generate a random Coin value.
 *
 * @since 2.0.0
 * @category generators
 */
export const arbitrary = FastCheck.bigInt({
  min: 0n,
  max: MAX_COIN_VALUE
}).map(Coin.make)
