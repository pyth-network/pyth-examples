import { FastCheck, Schema } from "effect"

/**
 * Natural number schema for positive integers.
 * Used for validating non-negative integers greater than 0.
 *
 * @since 2.0.0
 * @category schemas
 */
export const Natural = Schema.Positive.annotations({
  identifier: "Natural",
  title: "Natural Number",
  description: "A positive integer greater than 0"
})

/**
 * Type alias for Natural representing positive integers.
 *
 * @since 2.0.0
 * @category model
 */
export type Natural = typeof Natural.Type

/**
 * Check if the given value is a valid Natural
 *
 * @since 2.0.0
 * @category predicates
 */
export const isNatural = Schema.is(Natural)

/**
 * FastCheck arbitrary for generating random Natural instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.integer({
  min: 1,
  max: Number.MAX_SAFE_INTEGER
}).map((number) => number as Natural)
