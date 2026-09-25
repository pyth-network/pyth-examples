import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"

/**
 * VrfKeyHash is a 32-byte hash representing a VRF verification key.
 * vrf_keyhash = Bytes32
 *
 * @since 2.0.0
 * @category schemas
 */
export class VrfKeyHash extends Schema.TaggedClass<VrfKeyHash>()("VrfKeyHash", {
  hash: Bytes32.BytesFromHex
}) {
  toJSON() {
    return {
      _tag: "VrfKeyHash" as const,
      hash: Bytes.toHex(this.hash)
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof VrfKeyHash && Bytes.equals(this.hash, that.hash)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.array(Array.from(this.hash)))
  }
}

export const FromBytes = Schema.transform(Schema.typeSchema(Bytes32.BytesFromHex), Schema.typeSchema(VrfKeyHash), {
  strict: true,
  decode: (bytes) => new VrfKeyHash({ hash: bytes }, { disableValidation: true }), // Disable validation since we already check length in Bytes32
  encode: (vrfKeyHash) => vrfKeyHash.hash
}).annotations({
  identifier: "VrfKeyHash.FromBytes"
})

export const FromHex = Schema.compose(
  Bytes32.BytesFromHex, // string -> hex string
  FromBytes // hex string -> VrfKeyHash
).annotations({
  identifier: "VrfKeyHash.FromHex"
})

/**
 * FastCheck arbitrary for generating random VrfKeyHash instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({
  minLength: Bytes32.BYTES_LENGTH,
  maxLength: Bytes32.BYTES_LENGTH
}).map((bytes) => new VrfKeyHash({ hash: bytes }, { disableValidation: true }))

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse VrfKeyHash from raw bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse VrfKeyHash from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode VrfKeyHash to raw bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode VrfKeyHash to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
