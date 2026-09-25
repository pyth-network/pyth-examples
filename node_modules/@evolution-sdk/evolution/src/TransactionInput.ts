import { Either as E, Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Numeric from "./Numeric.js"
import * as TransactionHash from "./TransactionHash.js"

/**
 * Schema for TransactionInput representing a transaction input with transaction id and index.
 *
 * ```
 * transaction_input = [transaction_id : transaction_id, index : uint .size 2]
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class TransactionInput extends Schema.TaggedClass<TransactionInput>()("TransactionInput", {
  transactionId: TransactionHash.TransactionHash,
  index: Numeric.Uint16Schema
}) {
  toJSON() {
    return {
      _tag: this._tag,
      transactionId: this.transactionId.toJSON(),
      index: this.index.toString()
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof TransactionInput &&
      this.index === that.index &&
      Equal.equals(this.transactionId, that.transactionId)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.transactionId))(Hash.number(Number(this.index))))
  }
}

/**
 * Check if the given value is a valid TransactionInput.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isTransactionInput = Schema.is(TransactionInput)

export const CDDLSchema = Schema.Tuple(
  Schema.Uint8ArrayFromSelf, // transaction_id as bytes
  CBOR.Integer // index as bigint
)

/**
 * CDDL schema for TransactionInput.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(TransactionInput), {
  strict: true,
  encode: (toA) => E.right([toA.transactionId.hash, toA.index] as const),
  decode: ([txHashBytes, indexBigInt]) =>
    E.right(
      new TransactionInput({
        transactionId: new TransactionHash.TransactionHash({ hash: txHashBytes }),
        index: indexBigInt
      })
    )
}).annotations({
  identifier: "TransactionInput.FromCDDL",
  description: "Transforms CBOR structure to TransactionInput"
})

/**
 * CBOR bytes transformation schema for TransactionInput.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → TransactionInput
  ).annotations({
    identifier: "TransactionInput.FromCBORBytes",
    description: "Transforms CBOR bytes to TransactionInput"
  })

/**
 * CBOR hex transformation schema for TransactionInput.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → TransactionInput
  ).annotations({
    identifier: "TransactionInput.FromCBORHex",
    description: "Transforms CBOR hex string to TransactionInput"
  })

/**
 * FastCheck arbitrary for TransactionInput instances.
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = FastCheck.tuple(TransactionHash.arbitrary, Numeric.Uint16Arbitrary).map(
  ([transactionId, index]) =>
    new TransactionInput({
      transactionId,
      index
    })
)

/**
 * Convert CBOR bytes to TransactionInput.
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Convert CBOR hex string to TransactionInput.
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Convert TransactionInput to CBOR bytes.
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORBytes = (data: TransactionInput, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Convert TransactionInput to CBOR hex string.
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORHex = (data: TransactionInput, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)
