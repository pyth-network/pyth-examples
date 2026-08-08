import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"

/**
 * Schema for VrfVkey representing a VRF verification key.
 * vrf_vkey = bytes .size 32
 * Follows the Conway-era CDDL specification.
 *
 * @since 2.0.0
 * @category schemas
 */
export class VrfVkey extends Schema.TaggedClass<VrfVkey>()("VrfVkey", {
  bytes: Bytes32.BytesFromHex
}) {
  toJSON() {
    return { _tag: "VrfVkey" as const, bytes: Bytes.toHex(this.bytes) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof VrfVkey && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

export const FromBytes = Schema.transform(Schema.typeSchema(Bytes32.BytesFromHex), Schema.typeSchema(VrfVkey), {
  strict: true,
  decode: (bytes) => new VrfVkey({ bytes }),
  encode: (vrfVkey) => vrfVkey.bytes
}).annotations({
  identifier: "VrfVkey.FromBytes"
})

export const FromHex = Schema.compose(
  Bytes32.BytesFromHex, // string -> Bytes32
  FromBytes // Bytes32 -> VrfVkey
).annotations({
  identifier: "VrfVkey.FromHex"
})

/**
 * Check if the given value is a valid VrfVkey
 *
 * @since 2.0.0
 * @category predicates
 */
export const isVrfVkey = Schema.is(VrfVkey)

/**
 * FastCheck arbitrary for generating random VrfVkey instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({
  minLength: Bytes32.BYTES_LENGTH,
  maxLength: Bytes32.BYTES_LENGTH
}).map((bytes) => new VrfVkey({ bytes }))

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse VrfVkey from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse VrfVkey from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode VrfVkey to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode VrfVkey to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
