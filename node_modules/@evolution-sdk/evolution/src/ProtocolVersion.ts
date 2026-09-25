import { Equal, FastCheck, Function, Hash, Inspectable, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Numeric from "./Numeric.js"

/**
 * ProtocolVersion class based on Conway CDDL specification
 *
 * CDDL: protocol_version = [major_version : uint32, minor_version : uint32]
 *
 * @since 2.0.0
 * @category model
 */
export class ProtocolVersion extends Schema.TaggedClass<ProtocolVersion>()("ProtocolVersion", {
  major: Numeric.Uint32Schema,
  minor: Numeric.Uint32Schema
}) {
  toJSON() {
    return { _tag: "ProtocolVersion" as const, major: this.major, minor: this.minor }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof ProtocolVersion && this.major === that.major && this.minor === that.minor
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.number(Number(this.major)))(Hash.number(Number(this.minor))))
  }
}

/**
 * FastCheck arbitrary for generating random ProtocolVersion instances
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = FastCheck.tuple(Numeric.Uint32Arbitrary, Numeric.Uint32Arbitrary).map(
  ([major, minor]) => new ProtocolVersion({ major, minor })
)

export const CDDLSchema = Schema.Tuple(
  CBOR.Integer, // major_version as bigint
  CBOR.Integer // minor_version as bigint
)

/**
 * CDDL schema for ProtocolVersion.
 * protocol_version = [major_version : uint32, minor_version : uint32]
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transform(CDDLSchema, Schema.typeSchema(ProtocolVersion), {
  strict: true,
  encode: (toA) => [toA.major, toA.minor] as const,
  decode: ([major, minor]) =>
    new ProtocolVersion(
      {
        major,
        minor
      },
      {
        disableValidation: true
      }
    )
}).annotations({
  identifier: "ProtocolVersion.FromCDDL",
  description: "Transforms CBOR structure to ProtocolVersion"
})

/**
 * CBOR bytes transformation schema for ProtocolVersion.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → ProtocolVersion
  ).annotations({
    identifier: "ProtocolVersion.FromCBORBytes",
    description: "Transforms CBOR bytes to ProtocolVersion"
  })

/**
 * CBOR hex transformation schema for ProtocolVersion.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → ProtocolVersion
  ).annotations({
    identifier: "ProtocolVersion.FromCBORHex",
    description: "Transforms CBOR hex string to ProtocolVersion"
  })

/**
 * Convert CBOR bytes to ProtocolVersion (unsafe)
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORBytes: {
  (options?: CBOR.CodecOptions): (bytes: Uint8Array) => ProtocolVersion
  (bytes: Uint8Array, options?: CBOR.CodecOptions): ProtocolVersion
} = Function.dual(
  (args) => args.length >= 1 && args[0] instanceof Uint8Array,
  (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
    Schema.decodeSync(FromCBORBytes(options))(bytes)
)

/**
 * Convert CBOR hex string to ProtocolVersion (unsafe)
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromCBORHex: {
  (options?: CBOR.CodecOptions): (hex: string) => ProtocolVersion
  (hex: string, options?: CBOR.CodecOptions): ProtocolVersion
} = Function.dual(
  (args) => args.length >= 1 && typeof args[0] === "string",
  (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) => Schema.decodeSync(FromCBORHex(options))(hex)
)

/**
 * Convert ProtocolVersion to CBOR bytes (unsafe)
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORBytes: {
  (options?: CBOR.CodecOptions): (version: ProtocolVersion) => Uint8Array
  (version: ProtocolVersion, options?: CBOR.CodecOptions): Uint8Array
} = Function.dual(
  (args) => args.length >= 1 && args[0] instanceof ProtocolVersion,
  (version: ProtocolVersion, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
    Schema.encodeSync(FromCBORBytes(options))(version)
)

/**
 * Convert ProtocolVersion to CBOR hex string (unsafe)
 *
 * @since 2.0.0
 * @category conversion
 */
export const toCBORHex: {
  (options?: CBOR.CodecOptions): (version: ProtocolVersion) => string
  (version: ProtocolVersion, options?: CBOR.CodecOptions): string
} = Function.dual(
  (args) => args.length >= 1 && args[0] instanceof ProtocolVersion,
  (version: ProtocolVersion, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
    Schema.encodeSync(FromCBORHex(options))(version)
)
