import { Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Numeric from "./Numeric.js"

/**
 * CDDL specification:
 * ```
 * epoch_no = uint .size 8
 * ```
 *
 */

/**
 * Schema for validating epoch numbers (0-255).
 *
 * @since 2.0.0
 * @category schemas
 */
export const EpochNoSchema = Numeric.Uint64Schema.annotations({
  identifier: "EpochNo",
  description: "Blockchain epoch number (64-bit unsigned integer)"
})

/**
 * Type alias for EpochNo representing blockchain epoch numbers.
 *
 * @since 2.0.0
 * @category model
 */
export type EpochNo = typeof EpochNoSchema.Type

/**
 * Check if a value is a valid EpochNo.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = Schema.is(EpochNoSchema)

/**
 * Compare two EpochNo values.
 *
 * @since 2.0.0
 * @category ordering
 */
export const compare = (a: EpochNo, b: EpochNo): -1 | 0 | 1 => {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/**
 * Generate a random EpochNo.
 *
 * @since 2.0.0
 * @category generators
 */
export const generator = Numeric.Uint64Arbitrary

/**
 * CDDL schema bridge for epoch_no = uint .size 8
 */
export const CDDLSchema = CBOR.Integer

export const FromCDDL = Schema.transform(CDDLSchema, Schema.typeSchema(EpochNoSchema), {
  strict: true,
  encode: (epoch) => epoch,
  decode: (n) => EpochNoSchema.make(n)
}).annotations({ identifier: "EpochNo.CDDL" })

export const arbitrary = Numeric.Uint64Arbitrary
