import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as CBOR from "./CBOR.js"
import * as Url from "./Url.js"

/**
 * Schema for PoolMetadata representing pool metadata information.
 * pool_metadata = [url, bytes]
 *
 * @since 2.0.0
 * @category model
 */
export class PoolMetadata extends Schema.TaggedClass<PoolMetadata>()("PoolMetadata", {
  url: Url.Url,
  hash: Schema.Uint8ArrayFromSelf
}) {
  /**
   * Convert to JSON-serializable object.
   *
   * @since 2.0.0
   * @category encoding
   */
  toJSON() {
    return {
      _tag: "PoolMetadata" as const,
      url: this.url.href,
      hash: Bytes.toHex(this.hash)
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
    return that instanceof PoolMetadata && Equal.equals(this.url, that.url) && Equal.equals(this.hash, that.hash)
  }

  /**
   * Hash code generation.
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.url))(Hash.hash(this.hash)))
  }
}

/**
 * CDDL schema for PoolMetadata as defined in the specification:
 * pool_metadata = [url, bytes]
 *
 * Transforms between CBOR tuple structure and PoolMetadata model.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transform(
  Schema.Tuple(
    CBOR.Text, // url as CBOR text string
    CBOR.ByteArray // hash as CBOR byte string
  ),
  Schema.typeSchema(PoolMetadata),
  {
    strict: true,
    encode: (poolMetadata) => [poolMetadata.url.href, poolMetadata.hash] as const,
    decode: ([urlText, hash]) => {
      const url = Url.Url.make({
        href: urlText
      })
      return new PoolMetadata({ url, hash })
    }
  }
).annotations({
  identifier: "PoolMetadata.FromCDDL",
  description: "Transforms CBOR structure to PoolMetadata"
})

/**
 * FastCheck arbitrary for generating random PoolMetadata instances
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = FastCheck.record({
  url: Url.arbitrary,
  hash: FastCheck.uint8Array({ minLength: 32, maxLength: 32 })
}).map((props) => new PoolMetadata(props))

/**
 * CBOR bytes transformation schema for PoolMetadata.
 * Transforms between Uint8Array and PoolMetadata using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → PoolMetadata
  ).annotations({
    identifier: "PoolMetadata.FromCBORBytes",
    description: "Transforms CBOR bytes to PoolMetadata"
  })

/**
 * CBOR hex transformation schema for PoolMetadata.
 * Transforms between hex string and PoolMetadata using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → PoolMetadata
  ).annotations({
    identifier: "PoolMetadata.FromCBORHex",
    description: "Transforms CBOR hex string to PoolMetadata"
  })

/**
 * Convert CBOR bytes to PoolMetadata (unsafe)
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Convert CBOR hex string to PoolMetadata (unsafe)
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Convert PoolMetadata to CBOR bytes (unsafe)
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORBytes = (poolMetadata: PoolMetadata, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(poolMetadata)

/**
 * Convert PoolMetadata to CBOR hex string (unsafe)
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORHex = (poolMetadata: PoolMetadata, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(poolMetadata)
