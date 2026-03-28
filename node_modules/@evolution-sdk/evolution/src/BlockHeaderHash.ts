import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"

/**
 * Schema for BlockHeaderHash representing a block header hash.
 * block_header_hash = Bytes32
 * Follows the Conway-era CDDL specification.
 *
 * @since 2.0.0
 * @category model
 */
export class BlockHeaderHash extends Schema.TaggedClass<BlockHeaderHash>()("BlockHeaderHash", {
  bytes: Bytes32.BytesFromHex
}) {
  toJSON() {
    return {
      _tag: "BlockHeaderHash" as const,
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
    return that instanceof BlockHeaderHash && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

/**
 * Schema for transforming between Uint8Array and BlockHeaderHash.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(Schema.typeSchema(Bytes32.BytesFromHex), Schema.typeSchema(BlockHeaderHash), {
  strict: true,
  decode: (bytes) => new BlockHeaderHash({ bytes }, { disableValidation: true }),
  encode: (bhh) => bhh.bytes
}).annotations({
  identifier: "BlockHeaderHash.FromBytes"
})

/**
 * Schema for transforming between hex string and BlockHeaderHash.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(
  Bytes32.BytesFromHex, // string -> Bytes32
  FromBytes // Bytes32 -> BlockHeaderHash
).annotations({
  identifier: "BlockHeaderHash.FromHex"
})

/**
 * Check if the given value is a valid BlockHeaderHash
 *
 * @since 2.0.0
 * @category predicates
 */
export const isBlockHeaderHash = Schema.is(BlockHeaderHash)

/**
 * FastCheck arbitrary for generating random BlockHeaderHash instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({ minLength: 32, maxLength: 32 }).map(
  (bytes) => new BlockHeaderHash({ bytes }, { disableValidation: true })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse BlockHeaderHash from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse BlockHeaderHash from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode BlockHeaderHash to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode BlockHeaderHash to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
