import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"
import * as CBOR from "./CBOR.js"
import * as Url from "./Url.js"

/**
 * Schema for Anchor representing an anchor with URL and data hash.
 * ```
 * anchor = [anchor_url: url, anchor_data_hash: Bytes32]
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export class Anchor extends Schema.TaggedClass<Anchor>()("Anchor", {
  anchorUrl: Url.Url,
  anchorDataHash: Bytes32.BytesFromHex
}) {
  toJSON() {
    return {
      _tag: "Anchor" as const,
      anchorUrl: this.anchorUrl.href,
      anchorDataHash: Bytes.toHex(this.anchorDataHash)
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof Anchor &&
      Equal.equals(this.anchorUrl, that.anchorUrl) &&
      Bytes.equals(this.anchorDataHash, that.anchorDataHash)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(Hash.hash("Anchor"))(
        Hash.combine(Hash.hash(this.anchorUrl))(Hash.array(Array.from(this.anchorDataHash)))
      )
    )
  }
}

export const CDDLSchema = Schema.Tuple(
  CBOR.Text, // anchor_url: url
  CBOR.ByteArray // anchor_data_hash: Bytes32
)

/**
 * CDDL schema for Anchor as tuple structure.
 * ```
 * anchor = [anchor_url: url, anchor_data_hash: Bytes32]
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transform(CDDLSchema, Schema.typeSchema(Anchor), {
  strict: true,
  encode: (toA) => [toA.anchorUrl.href, toA.anchorDataHash] as const,
  decode: ([anchorUrl, anchorDataHash]) => new Anchor({ anchorUrl: new Url.Url({ href: anchorUrl }), anchorDataHash })
})

/**
 * CBOR bytes transformation schema for Anchor.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → Anchor
  )

/**
 * CBOR hex transformation schema for Anchor.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → Anchor
  )

/**
 * FastCheck arbitrary for Anchor instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.record({
  anchorUrl: Url.arbitrary,
  anchorDataHash: FastCheck.uint8Array({ minLength: 32, maxLength: 32 })
}).map(({ anchorDataHash, anchorUrl }) => new Anchor({ anchorUrl, anchorDataHash }, { disableValidation: true })) // Disable validation since we already check length in FastCheck

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse an Anchor from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions): Anchor =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse an Anchor from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions): Anchor =>
  Schema.decodeSync(FromCBORHex(options))(hex)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert an Anchor to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (anchor: Anchor, options?: CBOR.CodecOptions): Uint8Array =>
  Schema.encodeSync(FromCBORBytes(options))(anchor)

/**
 * Convert an Anchor to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (anchor: Anchor, options?: CBOR.CodecOptions): string =>
  Schema.encodeSync(FromCBORHex(options))(anchor)
