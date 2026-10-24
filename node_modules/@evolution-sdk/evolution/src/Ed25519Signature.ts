import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes64 from "./Bytes64.js"

/**
 * Class-based Ed25519Signature with compile-time and runtime safety.
 * ed25519_signature = bytes .size 64
 * Follows the Conway-era CDDL specification.
 *
 * @since 2.0.0
 * @category model
 */
export class Ed25519Signature extends Schema.Class<Ed25519Signature>("Ed25519Signature")({
  bytes: Bytes64.BytesFromHex
}) {
  toJSON() {
    return { _tag: "Ed25519Signature" as const, bytes: Bytes.toHex(this.bytes) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof Ed25519Signature && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

/**
 * Schema transformer from bytes to Ed25519Signature.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(
  Schema.typeSchema(Bytes64.BytesFromHex),
  Schema.typeSchema(Ed25519Signature),
  {
    strict: true,
    decode: (bytes) =>
      new Ed25519Signature(
        { bytes },
        { disableValidation: true } // Disable validation since we already check length in Bytes64
      ),
    encode: (signature) => new Uint8Array(signature.bytes)
  }
).annotations({
  identifier: "Ed25519Signature.FromBytes"
})

/**
 * Schema transformer from hex string to Ed25519Signature.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(
  Bytes64.BytesFromHex, // string -> Bytes64
  FromBytes
).annotations({
  identifier: "Ed25519Signature.FromHex"
})

// ============================================================================
// Core Functions (functional interface)
// ============================================================================

/**
 * Parse Ed25519Signature from bytes (unsafe - throws on error).
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse Ed25519Signature from hex string (unsafe - throws on error).
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Convert to hex string using optimized lookup table.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)

/**
 * Get the underlying bytes (returns a copy for safety).
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Check if value is an Ed25519Signature instance.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = Schema.is(Ed25519Signature)

/**
 * FastCheck arbitrary for generating random Ed25519Signature instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<Ed25519Signature> = FastCheck.uint8Array({
  minLength: 64,
  maxLength: 64
}).map((bytes) => new Ed25519Signature({ bytes }, { disableValidation: true }))
