import { FastCheck, Schema } from "effect"

import * as Numeric from "./Numeric.js"

/**
 * Schema for TransactionIndex representing a transaction index within a block.
 * CDDL: transaction_index = uint .size 2
 *
 * @since 2.0.0
 * @category schemas
 */
export const TransactionIndex = Numeric.Uint16Schema.annotations({
  identifier: "TransactionIndex"
})

export type TransactionIndex = typeof TransactionIndex.Type

/**
 * Check if a value is a valid TransactionIndex.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = Schema.is(TransactionIndex)

/**
 * FastCheck arbitrary for generating random TransactionIndex instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.bigInt({ min: 0n, max: 65535n }).map((value) => TransactionIndex.make(value))
