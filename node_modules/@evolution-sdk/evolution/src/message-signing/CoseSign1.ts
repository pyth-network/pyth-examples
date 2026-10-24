/**
 * COSE_Sign1 structures (RFC 8152).
 *
 * @since 2.0.0
 * @category Message Signing
 */

import { blake2b } from "@noble/hashes/blake2"
import { Equal, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Bytes from "../Bytes.js"
import * as CBOR from "../CBOR.js"
import * as Ed25519Signature from "../Ed25519Signature.js"
import { HeaderMap, HeaderMapFromCBORBytes, Headers, headersNew } from "./Header.js"
import type { Label } from "./Label.js"
import { labelFromInt, labelFromText } from "./Label.js"
import { fnv32a } from "./Utils.js"

// ============================================================================
// COSESign1
// ============================================================================

/**
 * COSE_Sign1 structure (RFC 8152) - signed message.
 *
 * @since 2.0.0
 * @category Model
 */
export class COSESign1 extends Schema.Class<COSESign1>("COSESign1")({
  headers: Schema.instanceOf(Headers),
  payload: Schema.UndefinedOr(Schema.Uint8ArrayFromSelf),
  signature: Schema.instanceOf(Ed25519Signature.Ed25519Signature)
}) {
  toJSON() {
    return {
      _tag: "COSESign1" as const,
      headers: this.headers.toJSON(),
      payload: this.payload !== undefined ? Bytes.toHex(this.payload) : undefined,
      signature: Bytes.toHex(this.signature.bytes)
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
      that instanceof COSESign1 &&
      Equal.equals(this.headers, that.headers) &&
      Equal.equals(this.payload, that.payload) &&
      Equal.equals(this.signature, that.signature)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(Hash.combine(Hash.hash(this.headers))(Hash.hash(this.payload)))(Hash.hash(this.signature))
  }

  /**
   * Get the signed data (Sig_structure as per RFC 8152).
   *
   * @since 2.0.0
   * @category Accessors
   */
  signedData(externalAad: Uint8Array = new Uint8Array(), externalPayload?: Uint8Array): Uint8Array {
    // Encode protected headers to CBOR
    const protectedCbor =
      this.headers.protected.headers.size === 0
        ? new Map()
        : new Map(Array.from(this.headers.protected.headers.entries()).map(([label, value]) => [label.value, value]))
    const protectedBytes = Schema.encodeSync(CBOR.FromBytes(CBOR.CML_DEFAULT_OPTIONS))(protectedCbor)

    // Use external payload if provided, otherwise use internal payload
    const payloadToUse =
      externalPayload !== undefined ? externalPayload : this.payload !== undefined ? this.payload : new Uint8Array()

    // Create Sig_structure: ["Signature1", protected, external_aad, payload]
    const sigStructure: CBOR.CBOR = ["Signature1", protectedBytes, externalAad, payloadToUse]

    return Schema.encodeSync(CBOR.FromBytes(CBOR.CML_DEFAULT_OPTIONS))(sigStructure)
  }

  /**
   * Convert to user-facing encoding format (`cms_<base64url>`).
   * Includes checksum for data integrity verification.
   *
   * @since 2.0.0
   * @category Conversion
   */
  toUserFacingEncoding(): string {
    const bodyBytes = Schema.encodeSync(COSESign1FromCBORBytes())(this)
    const checksum = fnv32a(bodyBytes)
    const checksumBytes = new Uint8Array(4)
    new DataView(checksumBytes.buffer).setUint32(0, checksum, false) // big-endian

    const bodyBase64 = Schema.encodeSync(Schema.Uint8ArrayFromBase64Url)(bodyBytes)
    const checksumBase64 = Schema.encodeSync(Schema.Uint8ArrayFromBase64Url)(checksumBytes)

    return `cms_${bodyBase64}${checksumBase64}`
  }

  /**
   * Parse from user-facing encoding format (`cms_<base64url>`).
   *
   * @since 2.0.0
   * @category Conversion
   */
  static fromUserFacingEncoding(encoded: string): COSESign1 {
    if (!encoded.startsWith("cms_")) {
      throw new Error('SignedMessage user facing encoding must start with "cms_"')
    }

    const withoutPrefix = encoded.slice(4)
    const withoutPadding = withoutPrefix.replace(/=+$/, "")

    if (withoutPadding.length < 8) {
      throw new Error("Insufficient length - missing checksum")
    }

    const bodyBase64 = withoutPadding.slice(0, -6)
    const checksumBase64 = withoutPadding.slice(-6)

    const bodyBytes = Schema.decodeSync(Schema.Uint8ArrayFromBase64Url)(bodyBase64)
    const checksumBytes = Schema.decodeSync(Schema.Uint8ArrayFromBase64Url)(checksumBase64)

    const expectedChecksum = new DataView(checksumBytes.buffer).getUint32(0, false)
    const computedChecksum = fnv32a(bodyBytes)

    if (expectedChecksum !== computedChecksum) {
      throw new Error(
        `Checksum does not match body. shown: ${expectedChecksum}, computed from body: ${computedChecksum}`
      )
    }

    return Schema.decodeSync(COSESign1FromCBORBytes())(bodyBytes)
  }
}

/**
 * CBOR bytes transformation schema for COSESign1.
 *
 * @since 2.0.0
 * @category Schemas
 */
export const COSESign1FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.transformOrFail(CBOR.FromBytes(options), Schema.typeSchema(COSESign1), {
    strict: true,
    decode: (cbor, _, ast) => {
      // COSE_Sign1 = [ protected, unprotected, payload, signature ]
      if (!Array.isArray(cbor) || cbor.length !== 4) {
        return ParseResult.fail(new ParseResult.Type(ast, cbor))
      }

      const [protectedBytes, unprotectedCbor, payloadCbor, signatureBytes] = cbor

      // Decode protected headers
      if (!(protectedBytes instanceof Uint8Array)) {
        return ParseResult.fail(new ParseResult.Type(ast, protectedBytes))
      }
      const protectedResult = Schema.decodeUnknownEither(HeaderMapFromCBORBytes(options))(protectedBytes)
      if (protectedResult._tag === "Left") {
        return ParseResult.fail(new ParseResult.Type(ast, protectedBytes))
      }

      // Decode unprotected headers (should be a Map directly, not bytes)
      if (!(unprotectedCbor instanceof Map)) {
        return ParseResult.fail(new ParseResult.Type(ast, unprotectedCbor))
      }
      const unprotectedHeaders = new Map<Label, CBOR.CBOR>()
      for (const [key, value] of unprotectedCbor.entries()) {
        let label: Label
        if (typeof key === "bigint") {
          label = labelFromInt(key)
        } else if (typeof key === "string") {
          label = labelFromText(key)
        } else {
          return ParseResult.fail(new ParseResult.Type(ast, key))
        }
        unprotectedHeaders.set(label, value)
      }
      const unprotectedResult = { right: new HeaderMap({ headers: unprotectedHeaders }, { disableValidation: true }) }

      // Decode payload
      let payload: Uint8Array | undefined
      if (payloadCbor === null || payloadCbor === undefined) {
        payload = undefined
      } else if (payloadCbor instanceof Uint8Array) {
        payload = payloadCbor
      } else {
        return ParseResult.fail(new ParseResult.Type(ast, payloadCbor))
      }

      // Decode signature
      if (!(signatureBytes instanceof Uint8Array) || signatureBytes.length !== 64) {
        return ParseResult.fail(new ParseResult.Type(ast, signatureBytes))
      }
      const signature = new Ed25519Signature.Ed25519Signature({ bytes: signatureBytes }, { disableValidation: true })

      const headers = headersNew(protectedResult.right, unprotectedResult.right)
      return ParseResult.succeed(new COSESign1({ headers, payload, signature }, { disableValidation: true }))
    },
    encode: (coseSign1) => {
      // Encode protected headers to bytes
      const protectedBytes = Schema.encodeSync(HeaderMapFromCBORBytes(options))(coseSign1.headers.protected)

      // Encode unprotected headers to Map (not bytes!)
      const unprotectedCbor = new Map<CBOR.CBOR, CBOR.CBOR>()
      for (const [label, value] of coseSign1.headers.unprotected.headers.entries()) {
        unprotectedCbor.set(label.value, value)
      }

      // Encode payload
      const payloadCbor = coseSign1.payload !== undefined ? coseSign1.payload : null

      // Get signature bytes
      const signatureBytes = coseSign1.signature.bytes

      return ParseResult.succeed([protectedBytes, unprotectedCbor, payloadCbor, signatureBytes])
    }
  }).annotations({
    identifier: "COSESign1.FromCBORBytes",
    description: "Transforms CBOR bytes to COSESign1"
  })

/**
 * CBOR hex transformation schema for COSESign1.
 *
 * @since 2.0.0
 * @category Schemas
 */
export const COSESign1FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(Schema.Uint8ArrayFromHex, COSESign1FromCBORBytes(options)).annotations({
    identifier: "COSESign1.FromCBORHex",
    description: "Transforms CBOR hex string to COSESign1"
  })

// ============================================================================
// COSESign1Builder
// ============================================================================

/**
 * Builder for creating COSE_Sign1 structures.
 *
 * @since 2.0.0
 * @category Model
 */
export class COSESign1Builder extends Schema.Class<COSESign1Builder>("COSESign1Builder")({
  externalAad: Schema.Uint8ArrayFromSelf,
  hashPayload: Schema.Boolean,
  headers: Schema.instanceOf(Headers),
  isPayloadExternal: Schema.Boolean,
  payload: Schema.Uint8ArrayFromSelf
}) {
  toJSON() {
    return {
      _tag: "COSESign1Builder" as const,
      externalAad: Bytes.toHex(this.externalAad),
      hashPayload: this.hashPayload,
      headers: this.headers.toJSON(),
      isPayloadExternal: this.isPayloadExternal,
      payload: Bytes.toHex(this.payload)
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
      that instanceof COSESign1Builder &&
      Bytes.equals(this.externalAad, that.externalAad) &&
      this.hashPayload === that.hashPayload &&
      Equal.equals(this.headers, that.headers) &&
      this.isPayloadExternal === that.isPayloadExternal &&
      Bytes.equals(this.payload, that.payload)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(
      Hash.combine(
        Hash.combine(Hash.combine(Hash.array(Array.from(this.externalAad)))(Hash.hash(this.hashPayload)))(
          Hash.hash(this.headers)
        )
      )(Hash.hash(this.isPayloadExternal))
    )(Hash.array(Array.from(this.payload)))
  }

  /**
   * Set external additional authenticated data.
   *
   * @since 2.0.0
   * @category Mutators
   */
  setExternalAad(aad: Uint8Array): this {
    return new COSESign1Builder(
      {
        externalAad: aad,
        hashPayload: this.hashPayload,
        headers: this.headers,
        isPayloadExternal: this.isPayloadExternal,
        payload: this.payload
      },
      { disableValidation: true }
    ) as this
  }

  /**
   * Hash the payload with blake2b-224 and update headers.
   * Sets the "hashed" header to true in unprotected headers.
   *
   * @since 2.0.0
   * @category Mutators
   */
  hashPayloadWith224(): this {
    if (!this.hashPayload) return this

    // Hash payload with blake2b-224 (28 bytes)
    const hashedPayload = blake2b(this.payload, { dkLen: 28 })

    // Update unprotected headers to indicate payload is hashed
    const newUnprotected = this.headers.unprotected.setHeader(labelFromText("hashed"), true)
    const newHeaders = headersNew(this.headers.protected, newUnprotected)

    return new COSESign1Builder(
      {
        externalAad: this.externalAad,
        hashPayload: false, // Already hashed
        headers: newHeaders,
        isPayloadExternal: this.isPayloadExternal,
        payload: hashedPayload
      },
      { disableValidation: true }
    ) as this
  }

  /**
   * Create the data that needs to be signed (Sig_structure).
   *
   * @since 2.0.0
   * @category Building
   */
  makeDataToSign(): Uint8Array {
    // Encode protected headers to CBOR map
    const protectedCbor = new Map(
      Array.from(this.headers.protected.headers.entries()).map(([label, value]) => [label.value, value])
    )
    const protectedBytes = Schema.encodeSync(CBOR.FromBytes(CBOR.CML_DEFAULT_OPTIONS))(protectedCbor)

    // Hash payload if needed
    const payloadToSign = this.hashPayload ? blake2b(this.payload, { dkLen: 28 }) : this.payload

    // Create Sig_structure: ["Signature1", protected, external_aad, payload]
    const sigStructure: CBOR.CBOR = ["Signature1", protectedBytes, this.externalAad, payloadToSign]

    return Schema.encodeSync(CBOR.FromBytes(CBOR.CML_DEFAULT_OPTIONS))(sigStructure)
  }

  /**
   * Build the final COSESign1 structure with the provided signature.
   *
   * @since 2.0.0
   * @category Building
   */
  build(signature: Ed25519Signature.Ed25519Signature): COSESign1 {
    return new COSESign1(
      {
        headers: this.headers,
        payload: this.isPayloadExternal ? undefined : this.payload,
        signature
      },
      { disableValidation: true }
    )
  }
}

/**
 * Create a new COSESign1Builder.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const coseSign1BuilderNew = (
  headers: Headers,
  payload: Uint8Array,
  isPayloadExternal: boolean
): COSESign1Builder =>
  new COSESign1Builder(
    {
      externalAad: new Uint8Array(),
      hashPayload: false,
      headers,
      isPayloadExternal,
      payload
    },
    { disableValidation: true }
  )

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Decode COSESign1 from CBOR bytes.
 *
 * @since 2.0.0
 * @category Conversion
 */
export const coseSign1FromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions): COSESign1 =>
  Schema.decodeSync(COSESign1FromCBORBytes(options))(bytes)

/**
 * Decode COSESign1 from CBOR hex.
 *
 * @since 2.0.0
 * @category Conversion
 */
export const coseSign1FromCBORHex = (hex: string, options?: CBOR.CodecOptions): COSESign1 =>
  Schema.decodeSync(COSESign1FromCBORHex(options))(hex)

/**
 * Encode COSESign1 to CBOR bytes.
 *
 * @since 2.0.0
 * @category Conversion
 */
export const coseSign1ToCBORBytes = (coseSign1: COSESign1, options?: CBOR.CodecOptions): Uint8Array =>
  Schema.encodeSync(COSESign1FromCBORBytes(options))(coseSign1)

/**
 * Encode COSESign1 to CBOR hex.
 *
 * @since 2.0.0
 * @category Conversion
 */
export const coseSign1ToCBORHex = (coseSign1: COSESign1, options?: CBOR.CodecOptions): string =>
  Schema.encodeSync(COSESign1FromCBORHex(options))(coseSign1)
