/**
 * COSE_Sign multi-signature structures (RFC 8152).
 *
 * Implements COSE_Sign for multi-signature messages with separate signature headers.
 *
 * @since 2.0.0
 * @category Sign Data
 */

import { blake2b } from "@noble/hashes/blake2"
import { Equal, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Bytes from "../Bytes.js"
import * as CBOR from "../CBOR.js"
import * as Ed25519Signature from "../Ed25519Signature.js"
import { HeaderMapFromCBORBytes, Headers, headersNew } from "./Header.js"

// ============================================================================
// COSESignature
// ============================================================================

/**
 * Single COSE signature (for multi-signature COSESign).
 *
 * @since 2.0.0
 * @category Model
 */
export class COSESignature extends Schema.Class<COSESignature>("COSESignature")({
  headers: Schema.instanceOf(Headers),
  signature: Schema.instanceOf(Ed25519Signature.Ed25519Signature)
}) {
  toJSON() {
    return {
      _tag: "COSESignature" as const,
      headers: this.headers.toJSON(),
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
      that instanceof COSESignature &&
      Equal.equals(this.headers, that.headers) &&
      Equal.equals(this.signature, that.signature)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(Hash.hash(this.headers))(Hash.hash(this.signature))
  }
}

/**
 * Create a new COSESignature.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const coseSignatureNew = (headers: Headers, signature: Ed25519Signature.Ed25519Signature): COSESignature =>
  new COSESignature({ headers, signature }, { disableValidation: true })

/**
 * CBOR bytes transformation schema for COSESignature.
 *
 * @since 2.0.0
 * @category Schemas
 */
export const COSESignatureFromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.transformOrFail(CBOR.FromBytes(options), Schema.typeSchema(COSESignature), {
    strict: true,
    decode: (cbor, _, ast) => {
      if (!Array.isArray(cbor) || cbor.length !== 3) {
        return ParseResult.fail(new ParseResult.Type(ast, cbor))
      }
      const [protectedBytes, unprotectedMap, signatureBytes] = cbor

      if (!(protectedBytes instanceof Uint8Array)) {
        return ParseResult.fail(new ParseResult.Type(ast, protectedBytes))
      }
      if (!(unprotectedMap instanceof Map)) {
        return ParseResult.fail(new ParseResult.Type(ast, unprotectedMap))
      }
      if (!(signatureBytes instanceof Uint8Array)) {
        return ParseResult.fail(new ParseResult.Type(ast, signatureBytes))
      }

      const protectedDecoded = Schema.decodeSync(HeaderMapFromCBORBytes(options))(protectedBytes)
      const unprotectedDecoded = Schema.decodeSync(HeaderMapFromCBORBytes(options))(
        Schema.encodeSync(CBOR.FromBytes(options))(unprotectedMap)
      )
      const headers = headersNew(protectedDecoded, unprotectedDecoded)
      const signature = Ed25519Signature.Ed25519Signature.make({ bytes: signatureBytes })

      return ParseResult.succeed(new COSESignature({ headers, signature }, { disableValidation: true }))
    },
    encode: (coseSignature) => {
      const protectedCbor = new Map(
        Array.from(coseSignature.headers.protected.headers.entries()).map(([label, value]) => [label.value, value])
      )
      const protectedBytes = Schema.encodeSync(CBOR.FromBytes(options))(protectedCbor)

      const unprotectedCbor = new Map(
        Array.from(coseSignature.headers.unprotected.headers.entries()).map(([label, value]) => [label.value, value])
      )

      return ParseResult.succeed([protectedBytes, unprotectedCbor, coseSignature.signature.bytes])
    }
  }).annotations({ identifier: "COSESignatureFromCBORBytes" })

// ============================================================================
// COSESign
// ============================================================================

/**
 * COSE_Sign structure (RFC 8152) - multi-signature message.
 *
 * @since 2.0.0
 * @category Model
 */
export class COSESign extends Schema.Class<COSESign>("COSESign")({
  headers: Schema.instanceOf(Headers),
  payload: Schema.UndefinedOr(Schema.Uint8ArrayFromSelf),
  signatures: Schema.Array(Schema.instanceOf(COSESignature))
}) {
  toJSON() {
    return {
      _tag: "COSESign" as const,
      headers: this.headers.toJSON(),
      payload: this.payload !== undefined ? Bytes.toHex(this.payload) : undefined,
      signatures: this.signatures.map((sig) => sig.toJSON())
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
      that instanceof COSESign &&
      Equal.equals(this.headers, that.headers) &&
      Equal.equals(this.payload, that.payload) &&
      Equal.equals(this.signatures, that.signatures)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(Hash.combine(Hash.hash(this.headers))(Hash.hash(this.payload)))(Hash.hash(this.signatures))
  }
}

/**
 * Create a new COSESign.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const coseSignNew = (
  headers: Headers,
  payload: Uint8Array | undefined,
  signatures: ReadonlyArray<COSESignature>
): COSESign => new COSESign({ headers, payload, signatures: [...signatures] }, { disableValidation: true })

/**
 * CBOR bytes transformation schema for COSESign.
 *
 * @since 2.0.0
 * @category Schemas
 */
export const COSESignFromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.transformOrFail(CBOR.FromBytes(options), Schema.typeSchema(COSESign), {
    strict: true,
    decode: (cbor, _, ast) => {
      if (!Array.isArray(cbor) || cbor.length !== 4) {
        return ParseResult.fail(new ParseResult.Type(ast, cbor))
      }
      const [protectedBytes, unprotectedMap, payloadOrNull, signaturesArray] = cbor

      if (!(protectedBytes instanceof Uint8Array)) {
        return ParseResult.fail(new ParseResult.Type(ast, protectedBytes))
      }
      if (!(unprotectedMap instanceof Map)) {
        return ParseResult.fail(new ParseResult.Type(ast, unprotectedMap))
      }
      if (!Array.isArray(signaturesArray)) {
        return ParseResult.fail(new ParseResult.Type(ast, signaturesArray))
      }

      const protectedDecoded = Schema.decodeSync(HeaderMapFromCBORBytes(options))(protectedBytes)
      const unprotectedDecoded = Schema.decodeSync(HeaderMapFromCBORBytes(options))(
        Schema.encodeSync(CBOR.FromBytes(options))(unprotectedMap)
      )
      const headers = headersNew(protectedDecoded, unprotectedDecoded)

      const payload = payloadOrNull === null || payloadOrNull === undefined ? undefined : (payloadOrNull as Uint8Array)

      const signatures = signaturesArray.map((sigCbor) =>
        Schema.decodeSync(COSESignatureFromCBORBytes(options))(Schema.encodeSync(CBOR.FromBytes(options))(sigCbor))
      )

      return ParseResult.succeed(new COSESign({ headers, payload, signatures }, { disableValidation: true }))
    },
    encode: (coseSign) => {
      const protectedCbor = new Map(
        Array.from(coseSign.headers.protected.headers.entries()).map(([label, value]) => [label.value, value])
      )
      const protectedBytes = Schema.encodeSync(CBOR.FromBytes(options))(protectedCbor)

      const unprotectedCbor = new Map(
        Array.from(coseSign.headers.unprotected.headers.entries()).map(([label, value]) => [label.value, value])
      )

      const payloadOrNull = coseSign.payload === undefined ? null : coseSign.payload

      const signaturesEncoded = coseSign.signatures.map((sig) =>
        Schema.decodeSync(CBOR.FromBytes(options))(Schema.encodeSync(COSESignatureFromCBORBytes(options))(sig))
      )

      return ParseResult.succeed([protectedBytes, unprotectedCbor, payloadOrNull, signaturesEncoded])
    }
  }).annotations({ identifier: "COSESignFromCBORBytes" })

/**
 * CBOR hex transformation schema for COSESign.
 *
 * @since 2.0.0
 * @category Schemas
 */
export const COSESignFromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(Schema.Uint8ArrayFromHex, COSESignFromCBORBytes(options)).annotations({
    identifier: "COSESign.FromCBORHex"
  })

// ============================================================================
// COSESignBuilder
// ============================================================================

/**
 * Builder for creating COSE_Sign structures (multi-signature).
 *
 * @since 2.0.0
 * @category Model
 */
export class COSESignBuilder extends Schema.Class<COSESignBuilder>("COSESignBuilder")({
  externalAad: Schema.Uint8ArrayFromSelf,
  hashPayload: Schema.Boolean,
  headers: Schema.instanceOf(Headers),
  isPayloadExternal: Schema.Boolean,
  payload: Schema.Uint8ArrayFromSelf
}) {
  /**
   * Set external additional authenticated data.
   *
   * @since 2.0.0
   * @category Mutators
   */
  setExternalAad(externalAad: Uint8Array): this {
    return new COSESignBuilder(
      {
        headers: this.headers,
        payload: this.payload,
        hashPayload: this.hashPayload,
        externalAad,
        isPayloadExternal: this.isPayloadExternal
      },
      { disableValidation: true }
    ) as this
  }

  /**
   * Hash the payload with blake2b-224 and update headers.
   *
   * @since 2.0.0
   * @category Mutators
   */
  hashPayloadWith224(): this {
    if (!this.hashPayload) return this

    const hashedPayload = blake2b(this.payload, { dkLen: 28 })

    return new COSESignBuilder(
      {
        headers: this.headers,
        payload: hashedPayload,
        hashPayload: false,
        externalAad: this.externalAad,
        isPayloadExternal: this.isPayloadExternal
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
    const protectedCbor = new Map(
      Array.from(this.headers.protected.headers.entries()).map(([label, value]) => [label.value, value])
    )
    const protectedBytes = Schema.encodeSync(CBOR.FromBytes(CBOR.CML_DEFAULT_OPTIONS))(protectedCbor)

    const payloadToSign = this.hashPayload ? blake2b(this.payload, { dkLen: 28 }) : this.payload

    // Create Sig_structure for multi-signature: ["Signature", protected, external_aad, payload]
    const sigStructure: CBOR.CBOR = ["Signature", protectedBytes, this.externalAad, payloadToSign]

    return Schema.encodeSync(CBOR.FromBytes(CBOR.CML_DEFAULT_OPTIONS))(sigStructure)
  }

  /**
   * Build the final COSESign structure with the provided signatures.
   *
   * @since 2.0.0
   * @category Building
   */
  build(signatures: ReadonlyArray<COSESignature>): COSESign {
    return new COSESign(
      {
        headers: this.headers,
        payload: this.isPayloadExternal ? undefined : this.payload,
        signatures: [...signatures]
      },
      { disableValidation: true }
    )
  }
}

/**
 * Create a new COSESignBuilder.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const coseSignBuilderNew = (
  headers: Headers,
  payload: Uint8Array,
  isPayloadExternal: boolean
): COSESignBuilder =>
  new COSESignBuilder(
    {
      headers,
      payload,
      hashPayload: false,
      externalAad: new Uint8Array(),
      isPayloadExternal
    },
    { disableValidation: true }
  )
