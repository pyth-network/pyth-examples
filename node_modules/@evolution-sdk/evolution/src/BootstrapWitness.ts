import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Bytes32 from "./Bytes32.js"
import * as CBOR from "./CBOR.js"
import * as Ed25519Signature from "./Ed25519Signature.js"
import * as VKey from "./VKey.js"

/**
 * Helper to compare two Uint8Arrays by content.
 */
const uint8ArrayEquals = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Bootstrap witness for Byron-era addresses.
 *
 * CDDL:
 * ```
 * bootstrap_witness = [
 *   public_key : vkey,
 *   signature : ed25519_signature,
 *   chain_code : bytes .size 32,
 *   attributes : bytes
 * ]
 * ```
 */
export class BootstrapWitness extends Schema.Class<BootstrapWitness>("BootstrapWitness")({
  publicKey: VKey.VKey,
  signature: Ed25519Signature.Ed25519Signature,
  chainCode: Bytes32.BytesFromHex,
  attributes: Schema.Uint8ArrayFromHex
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    return {
      _tag: "BootstrapWitness",
      publicKey: this.publicKey,
      signature: this.signature,
      chainCode: this.chainCode,
      attributes: this.attributes
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
    return (
      that instanceof BootstrapWitness &&
      Equal.equals(this.publicKey, that.publicKey) &&
      Equal.equals(this.signature, that.signature) &&
      uint8ArrayEquals(this.chainCode, that.chainCode) &&
      uint8ArrayEquals(this.attributes, that.attributes)
    )
  }

  /**
   * Hash code generation.
   * Only hashes publicKey for performance (minimal identifying field).
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.publicKey))
  }
}

// Tuple schema as per CDDL
export const CDDLSchema = Schema.Tuple(
  CBOR.ByteArray, // public_key
  CBOR.ByteArray, // signature
  CBOR.ByteArray, // chain_code
  CBOR.ByteArray // attributes
)

/**
 * Transform between tuple CDDL shape and class.
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(BootstrapWitness), {
  strict: true,
  encode: (bw) =>
    Eff.gen(function* () {
      const publicKeyBytes = yield* ParseResult.encode(VKey.FromBytes)(bw.publicKey)
      const signatureBytes = yield* ParseResult.encode(Ed25519Signature.FromBytes)(bw.signature)
      const attributesBytes = bw.attributes.length === 0 ? new Uint8Array([0xa0]) : bw.attributes
      return [publicKeyBytes, signatureBytes, bw.chainCode, attributesBytes] as const
    }),
  decode: ([publicKeyBytes, signatureBytes, chainCode, attributes]) =>
    Eff.gen(function* () {
      const publicKey = yield* ParseResult.decode(VKey.FromBytes)(publicKeyBytes)
      const signature = yield* ParseResult.decode(Ed25519Signature.FromBytes)(signatureBytes)
      return new BootstrapWitness({ publicKey, signature, chainCode, attributes })
    })
}).annotations({ identifier: "BootstrapWitness.FromCDDL" })

/**
 * CBOR bytes transformation schema for BootstrapWitness.
 * Transforms between Uint8Array and BootstrapWitness using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → BootstrapWitness
  ).annotations({
    identifier: "BootstrapWitness.FromCBORBytes",
    title: "BootstrapWitness from CBOR Bytes",
    description: "Transforms CBOR bytes to BootstrapWitness"
  })

/**
 * CBOR hex transformation schema for BootstrapWitness.
 * Transforms between hex string and BootstrapWitness using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → BootstrapWitness
  ).annotations({
    identifier: "BootstrapWitness.FromCBORHex",
    title: "BootstrapWitness from CBOR Hex",
    description: "Transforms CBOR hex string to BootstrapWitness"
  })

/**
 * Parse BootstrapWitness from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (
  bytes: Uint8Array,
  options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS
): BootstrapWitness => Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse BootstrapWitness from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): BootstrapWitness =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode BootstrapWitness to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (
  witness: BootstrapWitness,
  options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS
): Uint8Array => Schema.encodeSync(FromCBORBytes(options))(witness)

/**
 * Encode BootstrapWitness to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (witness: BootstrapWitness, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): string =>
  Schema.encodeSync(FromCBORHex(options))(witness)

/**
 * Arbitrary generator for BootstrapWitness instances.
 */
export const arbitrary: FastCheck.Arbitrary<BootstrapWitness> = FastCheck.record({
  attributes: FastCheck.oneof(
    FastCheck.constant(new Uint8Array([0xa0])),
    FastCheck.uint8Array({ minLength: 1, maxLength: 64 }).map((path) => {
      const m = new Map<bigint, Uint8Array>()
      // Byron AddrAttributes: key 1 holds derivation_path; value is CBOR-encoded bytes
      const inner = CBOR.internalEncodeSync(path, CBOR.CML_DEFAULT_OPTIONS)
      m.set(1n, inner)
      return CBOR.internalEncodeSync(m, CBOR.CML_DEFAULT_OPTIONS)
    })
  ),
  chainCode: FastCheck.uint8Array({ minLength: 32, maxLength: 32 }),
  publicKey: VKey.arbitrary,
  signature: Ed25519Signature.arbitrary
}).map(
  ({ attributes, chainCode, publicKey, signature }) =>
    new BootstrapWitness({ attributes, chainCode, publicKey, signature })
)
