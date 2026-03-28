import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"

/**
 * Schema for AssetName representing a native asset identifier.
 * Asset names are limited to 32 bytes (0-64 hex characters).
 *
 * @since 2.0.0
 * @category model
 */
export class AssetName extends Schema.TaggedClass<AssetName>()("AssetName", {
  bytes: Bytes32.VariableBytesFromHex
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    return {
      _tag: "AssetName",
      bytes: Bytes.toHex(this.bytes)
    }
  }

  /**
   * Convert to string representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * Custom inspect for Node.js REPL.
   *
   * @since 2.0.0
   * @category conversions
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * Structural equality check.
   *
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    return that instanceof AssetName && Bytes.equals(this.bytes, that.bytes)
  }

  /**
   * Content-based hash for optimization of Equal.equals.
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    return Hash.cached(this, Hash.array(Array.from(this.bytes)))
  }
}

/**
 * Schema for encoding/decoding AssetName as bytes.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(
  Schema.typeSchema(Bytes32.VariableBytesFromHex),
  Schema.typeSchema(AssetName),
  {
    strict: true,
    decode: (bytes) => new AssetName({ bytes }, { disableValidation: true }),
    encode: (assetName) => assetName.bytes
  }
).annotations({
  identifier: "AssetName.FromBytes"
})

/**
 * Schema for encoding/decoding AssetName as hex strings.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(
  Bytes32.VariableBytesFromHex, // string -> Bytes32
  FromBytes // Bytes32 -> AssetName
).annotations({
  identifier: "AssetName.FromHex"
})

/**
 * Check if the given value is a valid AssetName
 *
 * @since 2.0.0
 * @category predicates
 */
export const isAssetName = Schema.is(AssetName)

/**
 * FastCheck arbitrary for generating random AssetName instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({
  minLength: 0,
  maxLength: 32
}).map((bytes) => new AssetName({ bytes }, { disableValidation: true }))

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse AssetName from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = (bytes: Uint8Array) => Schema.decodeSync(FromBytes)(bytes)

/**
 * Parse AssetName from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = (hex: string) => Schema.decodeSync(FromHex)(hex)

/**
 * Encode AssetName to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = (assetName: AssetName) => Schema.encodeSync(FromBytes)(assetName)

/**
 * Encode AssetName to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = (assetName: AssetName) => Schema.encodeSync(FromHex)(assetName)
