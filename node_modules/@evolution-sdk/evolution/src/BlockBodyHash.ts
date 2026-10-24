import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"

/**
 * Schema for BlockBodyHash representing a block body hash.
 * block_body_hash = Bytes32
 * Follows the Conway-era CDDL specification.
 *
 * @since 2.0.0
 * @category model
 */
export class BlockBodyHash extends Schema.TaggedClass<BlockBodyHash>()("BlockBodyHash", {
  bytes: Bytes32.BytesFromHex
}) {
  toJSON() {
    return {
      _tag: "BlockBodyHash" as const,
      bytes: Bytes.toHex(this.bytes)
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof BlockBodyHash && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

/**
 * Schema for transforming between Uint8Array and BlockBodyHash.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(Schema.typeSchema(Bytes32.BytesFromHex), Schema.typeSchema(BlockBodyHash), {
  strict: true,
  decode: (bytes) => new BlockBodyHash({ bytes }, { disableValidation: true }),
  encode: (bbh) => bbh.bytes
}).annotations({
  identifier: "BlockBodyHash.FromBytes"
})

/**
 * Schema for transforming between hex string and BlockBodyHash.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(
  Bytes32.BytesFromHex, // string -> Bytes32
  FromBytes // Bytes32 -> BlockBodyHash
).annotations({
  identifier: "BlockBodyHash.FromHex"
})

/**
 * Check if the given value is a valid BlockBodyHash
 *
 * @since 2.0.0
 * @category predicates
 */
export const isBlockBodyHash = Schema.is(BlockBodyHash)

/**
 * FastCheck arbitrary for generating random BlockBodyHash instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({ minLength: 32, maxLength: 32 }).map(
  (bytes) => new BlockBodyHash({ bytes }, { disableValidation: true })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse BlockBodyHash from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse BlockBodyHash from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode BlockBodyHash to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode BlockBodyHash to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
