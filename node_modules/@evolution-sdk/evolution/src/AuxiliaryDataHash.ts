/**
 * Auxiliary Data Hash module - provides an alias for Bytes32 specialized for auxiliary data hashing.
 *
 * In Cardano, auxiliary_data_hash = Bytes32, representing a 32-byte hash
 * used for auxiliary data (metadata) attached to transactions.
 *
 * @since 2.0.0
 */

import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"

/**
 * Schema for AuxiliaryDataHash representing auxiliary data hashes.
 * auxiliary_data_hash = Bytes32
 *
 * @since 2.0.0
 * @category model
 */
export class AuxiliaryDataHash extends Schema.TaggedClass<AuxiliaryDataHash>()("AuxiliaryDataHash", {
  bytes: Bytes32.BytesFromHex
}) {
  toJSON() {
    return { _tag: "AuxiliaryDataHash" as const, bytes: Bytes.toHex(this.bytes) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof AuxiliaryDataHash && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

export const FromBytes = Schema.transform(
  Schema.typeSchema(Bytes32.BytesFromHex),
  Schema.typeSchema(AuxiliaryDataHash),
  {
    strict: true,
    decode: (bytes) => new AuxiliaryDataHash({ bytes }, { disableValidation: true }),
    encode: (a) => a.bytes
  }
).annotations({
  identifier: "AuxiliaryDataHash.FromBytes"
})

export const FromHex = Schema.compose(
  Bytes32.BytesFromHex, // string -> Bytes32
  FromBytes // Bytes32 -> AuxiliaryDataHash
).annotations({
  identifier: "AuxiliaryDataHash.FromHex"
})

// Back-compat aliases used in TransactionBody and elsewhere
export const BytesSchema = FromBytes
export const HexSchema = FromHex

/**
 * Check if the given value is a valid AuxiliaryDataHash
 *
 * @since 2.0.0
 * @category predicates
 */
export const isAuxiliaryDataHash = Schema.is(AuxiliaryDataHash)

/**
 * FastCheck arbitrary for generating random AuxiliaryDataHash instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({ minLength: 32, maxLength: 32 }).map(
  (bytes) => new AuxiliaryDataHash({ bytes }, { disableValidation: true })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse AuxiliaryDataHash from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse AuxiliaryDataHash from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode AuxiliaryDataHash to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode AuxiliaryDataHash to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
