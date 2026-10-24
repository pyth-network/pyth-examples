import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes448 from "./Bytes448.js"

/**
 * KesSignature model stored as 448 raw bytes.
 * kes_signature = bytes .size 448
 *
 * @since 2.0.0
 * @category schemas
 */
export class KesSignature extends Schema.TaggedClass<KesSignature>()("KesSignature", {
  bytes: Bytes448.BytesFromHex
}) {
  toJSON() {
    return { _tag: "KesSignature" as const, bytes: Bytes.toHex(this.bytes) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof KesSignature && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

// Transform between raw bytes (Uint8Array length 448) and KesSignature
export const FromBytes = Schema.transform(Schema.typeSchema(Bytes448.BytesFromHex), Schema.typeSchema(KesSignature), {
  strict: true,
  decode: (bytes) => new KesSignature({ bytes }, { disableValidation: true }),
  encode: (value) => value.bytes
}).annotations({
  identifier: "KesSignature.FromBytes"
})

export const FromHex = Schema.compose(
  Bytes448.BytesFromHex, // string -> Uint8Array(448)
  FromBytes // bytes -> KesSignature
).annotations({
  identifier: "KesSignature.FromHex"
})

/**
 * Predicate for KesSignature instances
 *
 * @since 2.0.0
 * @category predicates
 */
export const isKesSignature = Schema.is(KesSignature)

/**
 * FastCheck arbitrary for generating random KesSignature instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({ minLength: 448, maxLength: 448 }).map(
  (bytes) => new KesSignature({ bytes }, { disableValidation: true })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse KesSignature from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse KesSignature from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode KesSignature to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode KesSignature to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
