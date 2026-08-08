import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"

/**
 * Schema for KESVkey representing a KES verification key.
 * kes_vkey = bytes .size 32
 * Follows the Conway-era CDDL specification.
 *
 * @since 2.0.0
 * @category model
 */
export class KESVkey extends Schema.TaggedClass<KESVkey>()("KESVkey", {
  bytes: Bytes32.BytesFromHex
}) {
  toJSON() {
    return { _tag: "KESVkey" as const, bytes: Bytes.toHex(this.bytes) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof KESVkey && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

/**
 * Schema for transforming between Uint8Array and KESVkey.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(Schema.typeSchema(Bytes32.BytesFromHex), Schema.typeSchema(KESVkey), {
  strict: true,
  decode: (bytes) => new KESVkey({ bytes }, { disableValidation: true }),
  encode: (k) => k.bytes
}).annotations({
  identifier: "KESVkey.FromBytes"
})

/**
 * Schema for transforming between hex string and KESVkey.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(
  Bytes32.BytesFromHex, // string -> Bytes32
  FromBytes // Bytes32 -> KESVkey
).annotations({
  identifier: "KESVkey.FromHex"
})

/**
 * Check if the given value is a valid KESVkey
 *
 * @since 2.0.0
 * @category predicates
 */
export const isKESVkey = Schema.is(KESVkey)

/**
 * FastCheck arbitrary for generating random KESVkey instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({ minLength: 32, maxLength: 32 }).map(
  (bytes) => new KESVkey({ bytes }, { disableValidation: true })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse KESVkey from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse KESVkey from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode KESVkey to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode KESVkey to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
