/**
 * COSE Label types and constructors.
 *
 * @since 2.0.0
 * @category Message Signing
 */

import { Equal, Hash, Inspectable, Schema } from "effect"

// ============================================================================
// Enums
// ============================================================================

/**
 * COSE Algorithm Identifiers (RFC 8152).
 *
 * @since 2.0.0
 * @category Enums
 */
export enum AlgorithmId {
  EdDSA = -8
}

/**
 * COSE Key Type values (RFC 8152).
 *
 * @since 2.0.0
 * @category Enums
 */
export enum KeyType {
  OKP = 1,
  EC2 = 2,
  RSA = 3,
  Symmetric = 4,
  HSS_LMS = 5,
  WalnutDSA = 6
}

/**
 * COSE Curve Type values (RFC 8152).
 *
 * @since 2.0.0
 * @category Enums
 */
export enum CurveType {
  P256 = 1,
  P384 = 2,
  P521 = 3,
  X25519 = 4,
  X448 = 5,
  Ed25519 = 6,
  Ed448 = 7,
  Secp256k1 = 8
}

/**
 * COSE Key Operations (RFC 8152).
 *
 * @since 2.0.0
 * @category Enums
 */
export enum KeyOperation {
  Sign = 0,
  Verify = 1,
  Encrypt = 2,
  Decrypt = 3,
  WrapKey = 4,
  UnwrapKey = 5,
  DeriveKey = 6,
  DeriveBits = 7,
  MacCreate = 8,
  MacVerify = 9
}

/**
 * Signature context for Sig_structure (RFC 8152).
 *
 * @since 2.0.0
 * @category Enums
 */
export enum SigContext {
  Signature = "Signature",
  Signature1 = "Signature1",
  CounterSignature = "CounterSignature"
}

/**
 * Label kind discriminator.
 *
 * @since 2.0.0
 * @category Enums
 */
export enum LabelKind {
  Int = 0,
  Text = 1
}

// ============================================================================
// Label
// ============================================================================

/**
 * COSE header label - can be an integer or text string (RFC 8152).
 *
 * @since 2.0.0
 * @category Model
 */
export class Label extends Schema.Class<Label>("Label")({
  kind: Schema.Enums(LabelKind),
  value: Schema.Union(Schema.BigIntFromSelf, Schema.String)
}) {
  toJSON() {
    return {
      _tag: "Label" as const,
      kind: this.kind === LabelKind.Int ? "Int" : "Text",
      value: this.kind === LabelKind.Int ? this.value.toString() : this.value
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
      that instanceof Label &&
      this.kind === that.kind &&
      (this.kind === LabelKind.Int && that.kind === LabelKind.Int
        ? this.value === that.value
        : this.value === that.value)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(Hash.number(this.kind))(
      typeof this.value === "bigint" ? Hash.number(Number(this.value)) : Hash.string(this.value as string)
    )
  }

  /**
   * Get the integer value (throws if label is text).
   *
   * @since 2.0.0
   * @category Accessors
   */
  asInt(): bigint {
    if (this.kind !== LabelKind.Int) {
      throw new Error("Label is not an integer")
    }
    return this.value as bigint
  }

  /**
   * Get the text value (throws if label is integer).
   *
   * @since 2.0.0
   * @category Accessors
   */
  asText(): string {
    if (this.kind !== LabelKind.Text) {
      throw new Error("Label is not text")
    }
    return this.value as string
  }
}

// ============================================================================
// Constructors
// ============================================================================

/**
 * Create a Label from an integer.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const labelFromInt = (value: bigint): Label =>
  new Label({ kind: LabelKind.Int, value }, { disableValidation: true })

/**
 * Create a Label from a text string.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const labelFromText = (value: string): Label =>
  new Label({ kind: LabelKind.Text, value }, { disableValidation: true })

/**
 * Create a Label from AlgorithmId.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const labelFromAlgorithmId = (alg: AlgorithmId): Label => labelFromInt(BigInt(alg))

/**
 * Create a Label from KeyType.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const labelFromKeyType = (kty: KeyType): Label => labelFromInt(BigInt(kty))

/**
 * Create a Label from CurveType.
 *
 * @since 2.0.0
 * @category Constructors
 */
export const labelFromCurveType = (crv: CurveType): Label => labelFromInt(BigInt(crv))
