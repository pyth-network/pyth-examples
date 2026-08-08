import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Ed25519Signature from "./Ed25519Signature.js"
import * as KESVkey from "./KESVkey.js"
import * as Numeric from "./Numeric.js"

/**
 * OperationalCert class based on Conway CDDL specification
 *
 * CDDL:
 * ```
 * operational_cert = [
 *   hot_vkey : kes_vkey,
 *   sequence_number : uint64,
 *   kes_period : uint64,
 *   sigma : ed25519_signature
 * ]
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class OperationalCert extends Schema.TaggedClass<OperationalCert>()("OperationalCert", {
  hotVkey: KESVkey.KESVkey,
  sequenceNumber: Numeric.Uint64Schema,
  kesPeriod: Numeric.Uint64Schema,
  sigma: Ed25519Signature.Ed25519Signature
}) {
  toJSON() {
    return {
      _tag: "OperationalCert" as const,
      hotVkey: this.hotVkey.toJSON(),
      sequenceNumber: this.sequenceNumber.toString(),
      kesPeriod: this.kesPeriod.toString(),
      sigma: this.sigma.toJSON()
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
      that instanceof OperationalCert &&
      Equal.equals(this.hotVkey, that.hotVkey) &&
      this.sequenceNumber === that.sequenceNumber &&
      this.kesPeriod === that.kesPeriod &&
      Equal.equals(this.sigma, that.sigma)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(Hash.hash(this.hotVkey))(
        Hash.combine(Hash.hash(this.sequenceNumber))(Hash.combine(Hash.hash(this.kesPeriod))(Hash.hash(this.sigma)))
      )
    )
  }
}

export const CDDLSchema = Schema.Tuple(
  CBOR.ByteArray, // hot_vkey as bytes
  CBOR.Integer, // sequence_number as bigint
  CBOR.Integer, // kes_period as bigint
  CBOR.ByteArray // sigma as bytes
)

/**
 * CDDL schema for OperationalCert.
 * operational_cert = [
 *   hot_vkey : kes_vkey,
 *   sequence_number : uint64,
 *   kes_period : uint64,
 *   sigma : ed25519_signature
 * ]
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(OperationalCert), {
  strict: true,
  encode: (toA) =>
    Eff.gen(function* () {
      const hotVkeyBytes = yield* ParseResult.encode(KESVkey.FromBytes)(toA.hotVkey)
      const sigmaBytes = yield* ParseResult.encode(Ed25519Signature.FromBytes)(toA.sigma)
      return [hotVkeyBytes, BigInt(toA.sequenceNumber), BigInt(toA.kesPeriod), sigmaBytes] as const
    }),
  decode: ([hotVkeyBytes, sequenceNumber, kesPeriod, sigmaBytes]) =>
    Eff.gen(function* () {
      const hotVkey = yield* ParseResult.decode(KESVkey.FromBytes)(hotVkeyBytes)
      const sigma = yield* ParseResult.decode(Ed25519Signature.FromBytes)(sigmaBytes)
      return new OperationalCert({ hotVkey, sequenceNumber, kesPeriod, sigma })
    })
})

/**
 * CBOR bytes transformation schema for OperationalCert.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → OperationalCert
  )

/**
 * CBOR hex transformation schema for OperationalCert.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → OperationalCert
  )

/**
 * Check if the given value is a valid OperationalCert
 *
 * @since 2.0.0
 * @category predicates
 */
export const isOperationalCert = Schema.is(OperationalCert)

/**
 * FastCheck arbitrary for generating random OperationalCert instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.record({
  hotVkey: KESVkey.arbitrary,
  sequenceNumber: FastCheck.bigUint(),
  kesPeriod: FastCheck.bigUint(),
  sigma: Ed25519Signature.arbitrary
}).map((props) => new OperationalCert(props))

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse OperationalCert from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions): OperationalCert =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse OperationalCert from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions): OperationalCert =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode OperationalCert to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (cert: OperationalCert, options?: CBOR.CodecOptions): Uint8Array =>
  Schema.encodeSync(FromCBORBytes(options))(cert)

/**
 * Encode OperationalCert to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (cert: OperationalCert, options?: CBOR.CodecOptions): string =>
  Schema.encodeSync(FromCBORHex(options))(cert)
