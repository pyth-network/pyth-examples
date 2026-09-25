import * as Data from "../Data.js"
import * as TSchema from "../TSchema.js"

/**
 * Transaction ID (32 bytes hash)
 */
export const TransactionId = TSchema.ByteArray

/**
 * Output Reference - Uniquely identifies a UTxO
 */
export const OutputReference = TSchema.Struct({
  transaction_id: TransactionId,
  output_index: TSchema.Integer
})

// Export codec objects with all conversion functions
export const Codec = Data.withSchema(OutputReference)
export const TransactionIdCodec = Data.withSchema(TransactionId)

// Type exports
export type OutputReference = typeof OutputReference.Type
export type TransactionId = typeof TransactionId.Type
