import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes4 from "./Bytes4.js"

/**
 * IPv4 model stored as 4 raw bytes (network byte order).
 *
 * @since 2.0.0
 * @category schemas
 */
export class IPv4 extends Schema.TaggedClass<IPv4>()("IPv4", {
  bytes: Bytes4.BytesFromHex
}) {
  toJSON() {
    return { _tag: "IPv4" as const, bytes: Bytes.toHex(this.bytes) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof IPv4 && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

// Transform between raw bytes (Uint8Array length 4) and IPv4
export const FromBytes = Schema.transform(Schema.typeSchema(Bytes4.BytesFromHex), Schema.typeSchema(IPv4), {
  strict: true,
  decode: (bytes) => new IPv4({ bytes }, { disableValidation: true }),
  encode: (ipv4) => ipv4.bytes
}).annotations({
  identifier: "IPv4.FromBytes"
})

export const FromHex = Schema.compose(
  Bytes4.BytesFromHex, // string -> Uint8Array(4)
  FromBytes // bytes -> IPv4
).annotations({
  identifier: "IPv4.FromHex"
})

/**
 * Predicate for IPv4 instances
 *
 * @since 2.0.0
 * @category predicates
 */
export const isIPv4 = Schema.is(IPv4)

/**
 * FastCheck arbitrary for generating random IPv4 instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({ minLength: 4, maxLength: 4 }).map(
  (bytes) => new IPv4({ bytes }, { disableValidation: true })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse IPv4 from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse IPv4 from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode IPv4 to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode IPv4 to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
