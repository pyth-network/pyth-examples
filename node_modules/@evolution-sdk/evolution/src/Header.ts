/**
 * Header module based on Conway CDDL specification
 *
 * CDDL: header = [header_body, body_signature : kes_signature]
 *
 * @since 2.0.0
 */
import { Effect, Equal, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as HeaderBody from "./HeaderBody.js"
import * as KesSignature from "./KesSignature.js"

/**
 * Header implementation using HeaderBody and KesSignature
 *
 * CDDL: header = [header_body, body_signature : kes_signature]
 *
 * @since 2.0.0
 * @category model
 */
export class Header extends Schema.TaggedClass<Header>()("Header", {
  headerBody: HeaderBody.HeaderBody,
  bodySignature: KesSignature.KesSignature
}) {
  toJSON() {
    return {
      _tag: "Header" as const,
      headerBody: this.headerBody.toJSON(),
      bodySignature: this.bodySignature.toJSON()
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
      that instanceof Header &&
      Equal.equals(this.headerBody, that.headerBody) &&
      Equal.equals(this.bodySignature, that.bodySignature)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.headerBody))(Hash.hash(this.bodySignature)))
  }
}

/**
 * Predicate to check if a value is a Header instance.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isHeader = (value: unknown): value is Header => value instanceof Header

/**
 * CDDL schema for Header.
 * header = [header_body, body_signature : kes_signature]
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(
  Schema.Tuple(
    Schema.encodedSchema(HeaderBody.FromCDDL), // header_body using HeaderBody CDDL schema
    CBOR.ByteArray // body_signature as bytes
  ),
  Schema.typeSchema(Header),
  {
    strict: true,
    encode: (toA) =>
      Effect.gen(function* () {
        const headerBodyCddl = yield* ParseResult.encode(HeaderBody.FromCDDL)(toA.headerBody)
        const bodySignatureBytes = yield* ParseResult.encode(KesSignature.FromBytes)(toA.bodySignature)
        return [headerBodyCddl, bodySignatureBytes] as const
      }),
    decode: ([headerBodyCddl, bodySignatureBytes]) =>
      Effect.gen(function* () {
        const headerBody = yield* ParseResult.decode(HeaderBody.FromCDDL)(headerBodyCddl)
        const bodySignature = yield* ParseResult.decode(KesSignature.FromBytes)(bodySignatureBytes)
        return new Header({
          headerBody,
          bodySignature
        })
      })
  }
)

/**
 * CBOR bytes transformation schema for Header.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → Header
  )

/**
 * CBOR hex transformation schema for Header.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromBytes(options) // Uint8Array → Header
  )

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse a Header from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions): Header =>
  Schema.decodeSync(FromBytes(options))(bytes)

/**
 * Parse a Header from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions): Header =>
  Schema.decodeSync(FromHex(options))(hex)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a Header to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (header: Header, options?: CBOR.CodecOptions): Uint8Array =>
  Schema.encodeSync(FromBytes(options))(header)

/**
 * Convert a Header to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (header: Header, options?: CBOR.CodecOptions): string =>
  Schema.encodeSync(FromHex(options))(header)
