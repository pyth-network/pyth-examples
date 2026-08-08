import { Equal, Hash, Inspectable, Schema } from "effect"

import * as Text128 from "./Text128.js"

/**
 * Schema for Url representing URLs as branded text.
 * url = text .size (0..128)
 *
 * @since 2.0.0
 * @category model
 */
export class Url extends Schema.TaggedClass<Url>("Url")("Url", {
  href: Text128.Text128
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    return {
      _tag: "Url",
      href: this.href
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
    return that instanceof Url && Equal.equals(this.href, that.href)
  }

  /**
   * Hash code generation.
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.href))
  }
}

export const FromBytes = Schema.transform(Text128.FromBytes, Url, {
  strict: true,
  decode: (bytes) => new Url({ href: bytes }, { disableValidation: true }), // Disable validation since we already check length in Text128
  encode: (url) => url.href
})

export const FromHex = Schema.compose(
  Schema.Uint8ArrayFromHex, // string -> hex string
  FromBytes
).annotations({
  identifier: "Url.Hex"
})

/**
 * Check if the given value is a valid Url
 *
 * @since 2.0.0
 * @category predicates
 */
export const isUrl = Schema.is(Url)

/**
 * FastCheck arbitrary for generating random Url instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = Text128.arbitrary.map((text) => Url.make({ href: text }, { disableValidation: true }))

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse Url from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = (bytes: Uint8Array) => Schema.decodeSync(FromBytes)(bytes)

/**
 * Parse Url from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = (hex: string) => Schema.decodeSync(FromHex)(hex)

/**
 * Encode Url to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = (url: Url) => Schema.encodeSync(FromBytes)(url)

/**
 * Encode Url to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = (url: Url) => Schema.encodeSync(FromHex)(url)
