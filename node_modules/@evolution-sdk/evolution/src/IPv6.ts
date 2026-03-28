import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes16 from "./Bytes16.js"

/**
 * IPv6 model stored as 16 raw bytes (network byte order).
 *
 * @since 2.0.0
 * @category schemas
 */
export class IPv6 extends Schema.TaggedClass<IPv6>()("IPv6", {
  bytes: Bytes16.BytesFromHex
}) {
  toJSON() {
    return { _tag: "IPv6" as const, bytes: Bytes.toHex(this.bytes) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof IPv6 && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

// Transform between raw bytes (Uint8Array length 16) and IPv6
export const FromBytes = Schema.transform(Schema.typeSchema(Bytes16.BytesFromHex), Schema.typeSchema(IPv6), {
  strict: true,
  decode: (bytes) => new IPv6({ bytes }, { disableValidation: true }),
  encode: (ipv6) => ipv6.bytes
}).annotations({
  identifier: "IPv6.FromBytes"
})

export const FromHex = Schema.compose(
  Bytes16.BytesFromHex, // string -> Uint8Array(16)
  FromBytes // bytes -> IPv6
).annotations({
  identifier: "IPv6.FromHex"
})

/**
 * Predicate for IPv6 instances
 *
 * @since 2.0.0
 * @category predicates
 */
export const isIPv6 = Schema.is(IPv6)

/**
 * FastCheck arbitrary for generating random IPv6 instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({ minLength: 16, maxLength: 16 }).map(
  (bytes) => new IPv6({ bytes }, { disableValidation: true })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse IPv6 from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse IPv6 from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode IPv6 to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode IPv6 to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
