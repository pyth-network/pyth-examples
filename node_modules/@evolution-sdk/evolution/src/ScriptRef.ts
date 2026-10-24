import { Effect, Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as CBOR from "./CBOR.js"
import * as Script from "./Script.js"

/**
 * Schema for ScriptRef representing a reference to a script in a transaction output.
 *
 * ```
 * CDDL: script_ref = #6.24(bytes .cbor script)
 * ```
 *
 * This represents the CBOR-encoded script bytes.
 * The script_ref uses CBOR tag 24 to indicate it contains CBOR-encoded script data.
 *
 * @since 2.0.0
 * @category schemas
 */
export class ScriptRef extends Schema.TaggedClass<ScriptRef>()("ScriptRef", {
  bytes: Schema.Uint8ArrayFromHex
}) {
  toJSON() {
    return {
      _tag: "ScriptRef" as const,
      bytes: this.bytes
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof ScriptRef && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

/**
 * Schema for transforming from bytes to ScriptRef.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(Schema.Uint8ArrayFromSelf, Schema.typeSchema(ScriptRef), {
  strict: true,
  decode: (bytes) => new ScriptRef({ bytes }, { disableValidation: true }),
  encode: (s) => s.bytes
}).annotations({
  identifier: "ScriptRef.FromBytes"
})

/**
 * Schema for transforming from hex to ScriptRef.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(
  Schema.Uint8ArrayFromHex, // string -> Uint8Array
  FromBytes // Uint8Array -> ScriptRef
).annotations({
  identifier: "ScriptRef.FromHex"
})

export const CDDLSchema = CBOR.tag(24, Schema.Uint8ArrayFromSelf)

/**
 * CDDL schema for ScriptRef following the Conway specification.
 *
 * ```
 * script_ref = #6.24(bytes .cbor script)
 * ```
 *
 * This transforms between CBOR tag 24 structure and ScriptRef model.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(ScriptRef), {
  strict: true,
  encode: (_, __, ___, toA) =>
    Effect.succeed({
      _tag: "Tag" as const,
      tag: 24 as const,
      value: toA.bytes // Use the bytes directly
    }),
  decode: (taggedValue) => Effect.succeed(new ScriptRef({ bytes: taggedValue.value }, { disableValidation: true }))
})

/**
/**
 * CBOR bytes transformation schema for ScriptRef.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → ScriptRef
  ).annotations({
    identifier: "ScriptRef.FromCBORBytes"
  })

/**
 * CBOR hex transformation schema for ScriptRef.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → ScriptRef
  ).annotations({
    identifier: "ScriptRef.FromCBORHex"
  })

/**
 * FastCheck arbitrary for generating random ScriptRef instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({
  minLength: 1,
  maxLength: 100
}).chain(() =>
  // Generate a valid Script first, then CBOR-encode it and wrap in tag(24) bytes
  Script.arbitrary.map((script) => {
    // Encode CDDL (CBOR value) -> bytes using canonical options compatible with CML
    const bytes = Script.toCBOR(script)
    return new ScriptRef({ bytes }, { disableValidation: true })
  })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse ScriptRef from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = (bytes: Uint8Array) => Schema.decodeSync(FromBytes)(bytes)

/**
 * Parse ScriptRef from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = (hex: string) => Schema.decodeSync(FromHex)(hex)

/**
 * Parse ScriptRef from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse ScriptRef from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode ScriptRef to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = (data: ScriptRef) => Schema.encodeSync(FromBytes)(data)

/**
 * Encode ScriptRef to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = (data: ScriptRef) => Schema.encodeSync(FromHex)(data)

/**
 * Encode ScriptRef to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: ScriptRef, options = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Encode ScriptRef to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: ScriptRef, options = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)
