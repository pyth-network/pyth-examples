/**
 * COSE key structures (RFC 8152).
 *
 * @since 2.0.0
 * @category Message Signing
 */

import { Equal, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Bytes from "../Bytes.js"
import * as CBOR from "../CBOR.js"
import * as PrivateKey from "../PrivateKey.js"
import * as VKey from "../VKey.js"
import { HeaderMap, headerMapNew } from "./Header.js"
import type { Label } from "./Label.js"
import { AlgorithmId, CurveType, KeyOperation, KeyType, labelFromInt, labelFromText } from "./Label.js"

// ============================================================================
// COSEKey
// ============================================================================

/**
 * COSE key representation (RFC 8152).
 *
 * @since 2.0.0
 * @category Model
 */
export class COSEKey extends Schema.Class<COSEKey>("COSEKey")({
  keyType: Schema.UndefinedOr(Schema.Enums(KeyType)),
  keyId: Schema.UndefinedOr(Schema.Uint8ArrayFromSelf),
  algorithmId: Schema.UndefinedOr(Schema.Enums(AlgorithmId)),
  keyOps: Schema.UndefinedOr(Schema.Array(Schema.Enums(KeyOperation))),
  baseInitVector: Schema.UndefinedOr(Schema.Uint8ArrayFromSelf),
  headers: Schema.instanceOf(HeaderMap)
}) {
  toJSON() {
    return {
      _tag: "COSEKey" as const,
      keyType: this.keyType !== undefined ? KeyType[this.keyType] : undefined,
      keyId: this.keyId !== undefined ? Bytes.toHex(this.keyId) : undefined,
      algorithmId: this.algorithmId !== undefined ? AlgorithmId[this.algorithmId] : undefined,
      keyOps: this.keyOps !== undefined ? this.keyOps.map((op: KeyOperation) => KeyOperation[op]) : undefined,
      baseInitVector: this.baseInitVector !== undefined ? Bytes.toHex(this.baseInitVector) : undefined,
      headers: this.headers.toJSON()
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
      that instanceof COSEKey &&
      Equal.equals(this.keyType, that.keyType) &&
      Equal.equals(this.keyId, that.keyId) &&
      Equal.equals(this.algorithmId, that.algorithmId) &&
      Equal.equals(this.keyOps, that.keyOps) &&
      Equal.equals(this.baseInitVector, that.baseInitVector) &&
      Equal.equals(this.headers, that.headers)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(
      Hash.combine(
        Hash.combine(
          Hash.combine(Hash.combine(Hash.hash(this.keyType))(Hash.hash(this.keyId)))(Hash.hash(this.algorithmId))
        )(Hash.hash(this.keyOps))
      )(Hash.hash(this.baseInitVector))
    )(Hash.hash(this.headers))
  }
}

/**
 * CBOR bytes transformation schema for COSEKey.
 * Encodes COSEKey as a CBOR Map compatible with CSL.
 *
 * @since 2.0.0
 * @category Schemas
 */
export const COSEKeyFromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.transformOrFail(CBOR.FromBytes(options), Schema.typeSchema(COSEKey), {
    strict: true,
    decode: (cbor, _, ast) => {
      // COSEKey is encoded as a CBOR Map
      if (!(cbor instanceof Map)) {
        return ParseResult.fail(new ParseResult.Type(ast, cbor))
      }

      // Decode standard COSE parameters and custom headers
      let keyType: KeyType | undefined
      let keyId: Uint8Array | undefined
      let algorithmId: AlgorithmId | undefined
      let keyOps: Array<KeyOperation> | undefined
      let baseInitVector: Uint8Array | undefined
      const customHeaders = new Map<Label, CBOR.CBOR>()

      for (const [labelValue, value] of cbor.entries()) {
        // Convert CBOR value to Label
        const label =
          typeof labelValue === "bigint"
            ? labelFromInt(labelValue)
            : typeof labelValue === "string"
              ? labelFromText(labelValue)
              : labelFromInt(BigInt(labelValue))

        // Standard COSE key parameters
        if (Equal.equals(label, labelFromInt(1n))) {
          // kty
          keyType = Number(value) as KeyType
        } else if (Equal.equals(label, labelFromInt(2n))) {
          // kid
          keyId = value as Uint8Array
        } else if (Equal.equals(label, labelFromInt(3n))) {
          // alg
          algorithmId = Number(value) as AlgorithmId
        } else if (Equal.equals(label, labelFromInt(4n))) {
          // key_ops
          keyOps = (value as Array<unknown>).map((op) => Number(op) as KeyOperation)
        } else if (Equal.equals(label, labelFromInt(5n))) {
          // Base IV
          baseInitVector = value as Uint8Array
        } else {
          // Custom headers (curve, public key, etc.)
          customHeaders.set(label, value)
        }
      }

      const headers = new HeaderMap({ headers: customHeaders }, { disableValidation: true })

      return ParseResult.succeed(
        new COSEKey({ keyType, keyId, algorithmId, keyOps, baseInitVector, headers }, { disableValidation: true })
      )
    },
    encode: (coseKey) => {
      const map = new Map<CBOR.CBOR, CBOR.CBOR>()

      // Encode standard COSE parameters
      if (coseKey.keyType !== undefined) map.set(1n, BigInt(coseKey.keyType))
      if (coseKey.keyId !== undefined) map.set(2n, coseKey.keyId)
      if (coseKey.algorithmId !== undefined) map.set(3n, BigInt(coseKey.algorithmId))
      if (coseKey.keyOps !== undefined) {
        map.set(
          4n,
          coseKey.keyOps.map((op) => BigInt(op))
        )
      }
      if (coseKey.baseInitVector !== undefined) map.set(5n, coseKey.baseInitVector)

      // Encode custom headers
      for (const [label, value] of coseKey.headers.headers.entries()) {
        map.set(label.value, value)
      }

      return ParseResult.succeed(map)
    }
  }).annotations({ identifier: "COSEKeyFromCBORBytes" })

// ============================================================================
// EdDSA25519Key
// ============================================================================

/**
 * Ed25519 key for signing and verification.
 *
 * @since 2.0.0
 * @category Model
 */
export class EdDSA25519Key extends Schema.Class<EdDSA25519Key>("EdDSA25519Key")({
  privateKey: Schema.UndefinedOr(Schema.instanceOf(PrivateKey.PrivateKey)),
  publicKey: Schema.UndefinedOr(Schema.instanceOf(VKey.VKey))
}) {
  toJSON() {
    return {
      _tag: "EdDSA25519Key" as const,
      hasPrivateKey: this.privateKey !== undefined,
      hasPublicKey: this.publicKey !== undefined
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
      that instanceof EdDSA25519Key &&
      Equal.equals(this.privateKey, that.privateKey) &&
      Equal.equals(this.publicKey, that.publicKey)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(Hash.hash(this.privateKey))(Hash.hash(this.publicKey))
  }

  /**
   * Set the private key for signing.
   *
   * @since 2.0.0
   * @category Mutators
   */
  setPrivateKey(privateKey: PrivateKey.PrivateKey): this {
    return new EdDSA25519Key(
      {
        privateKey,
        publicKey: VKey.fromPrivateKey(privateKey)
      },
      { disableValidation: true }
    ) as this
  }

  /**
   * Check if key can be used for signing.
   *
   * @since 2.0.0
   * @category Predicates
   */
  isForSigning(): boolean {
    return this.privateKey !== undefined
  }

  /**
   * Check if key can be used for verification.
   *
   * @since 2.0.0
   * @category Predicates
   */
  isForVerifying(): boolean {
    return this.publicKey !== undefined
  }

  /**
   * Build a COSEKey from this Ed25519 key.
   *
   * @since 2.0.0
   * @category Conversion
   */
  build(): COSEKey {
    const headers = headerMapNew()
      .setAlgorithmId(AlgorithmId.EdDSA)
      .setHeader(labelFromInt(1n), BigInt(KeyType.OKP))
      .setHeader(labelFromInt(-1n), BigInt(CurveType.Ed25519))

    const headersWithKey =
      this.publicKey !== undefined ? headers.setHeader(labelFromInt(-2n), this.publicKey.bytes) : headers

    return new COSEKey(
      {
        keyType: KeyType.OKP,
        keyId: undefined,
        algorithmId: AlgorithmId.EdDSA,
        keyOps: undefined,
        baseInitVector: undefined,
        headers: headersWithKey
      },
      { disableValidation: true }
    )
  }
}
