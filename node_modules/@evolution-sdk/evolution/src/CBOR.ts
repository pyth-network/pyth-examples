import { Data, Either as E, ParseResult, Schema } from "effect"

import * as Bytes from "./Bytes.js"

/**
 * Error class for CBOR value operations
 *
 * @since 1.0.0
 * @category errors
 */
export class CBORError extends Data.TaggedError("CBORError")<{
  message?: string
  cause?: unknown
}> {}

/**
 * CBOR major types as constants
 *
 * @since 1.0.0
 * @category constants
 */
export const CBOR_MAJOR_TYPE = {
  UNSIGNED_INTEGER: 0,
  NEGATIVE_INTEGER: 1,
  BYTE_STRING: 2,
  TEXT_STRING: 3,
  ARRAY: 4,
  MAP: 5,
  TAG: 6,
  SIMPLE_FLOAT: 7
} as const

/**
 * CBOR additional information constants
 *
 * @since 1.0.0
 * @category constants
 */
export const CBOR_ADDITIONAL_INFO = {
  DIRECT: 24,
  UINT16: 25,
  UINT32: 26,
  UINT64: 27,
  INDEFINITE: 31
} as const

/**
 * Simple value constants for CBOR
 *
 * @since 1.0.0
 * @category constants
 */
export const CBOR_SIMPLE = {
  FALSE: 20,
  TRUE: 21,
  NULL: 22,
  UNDEFINED: 23
} as const

// ============================================================================
// Encoding Metadata Types
// ============================================================================

/**
 * Width of a CBOR integer argument: inline (0), 1-byte, 2-byte, 4-byte, or 8-byte.
 *
 * @since 2.0.0
 * @category model
 */
export type ByteSize = 0 | 1 | 2 | 4 | 8

/**
 * Container length encoding style captured during decode.
 *
 * @since 2.0.0
 * @category model
 */
export type LengthEncoding =
  | { readonly tag: "indefinite" }
  | { readonly tag: "definite"; readonly byteSize: ByteSize }

/**
 * Byte/text string encoding style captured during decode.
 *
 * @since 2.0.0
 * @category model
 */
export type StringEncoding =
  | { readonly tag: "definite"; readonly byteSize: ByteSize }
  | { readonly tag: "indefinite"; readonly chunks: ReadonlyArray<{ readonly length: number; readonly byteSize: ByteSize }> }

// ============================================================================
// CBORFormat — tagged discriminated union for per-node encoding metadata
// ============================================================================

/**
 * Tagged discriminated union capturing how each CBOR node was originally
 * serialized.  Every variant carries a `_tag` discriminant.  Encoding-detail
 * fields are optional — absent means "use canonical / minimal default".
 *
 * @since 2.0.0
 * @category model
 */
export type CBORFormat =
  | CBORFormat.UInt
  | CBORFormat.NInt
  | CBORFormat.Bytes
  | CBORFormat.Text
  | CBORFormat.Array
  | CBORFormat.Map
  | CBORFormat.Tag
  | CBORFormat.Simple

/**
 * @since 2.0.0
 * @category model
 */
export namespace CBORFormat {
  /** Unsigned integer (major 0). `byteSize` absent → minimal encoding. */
  export type UInt = { readonly _tag: "uint"; readonly byteSize?: ByteSize }
  /** Negative integer (major 1). `byteSize` absent → minimal encoding. */
  export type NInt = { readonly _tag: "nint"; readonly byteSize?: ByteSize }
  /** Byte string (major 2). `encoding` absent → definite, minimal length. */
  export type Bytes = { readonly _tag: "bytes"; readonly encoding?: StringEncoding }
  /** Text string (major 3). `encoding` absent → definite, minimal length. */
  export type Text = { readonly _tag: "text"; readonly encoding?: StringEncoding }
  /** Array (major 4). `length` absent → definite, minimal length header. */
  export type Array = {
    readonly _tag: "array"
    readonly length?: LengthEncoding
    readonly children: ReadonlyArray<CBORFormat>
  }
  /** Map (major 5). `keyOrder` stores CBOR-encoded key bytes for serializable ordering. */
  export type Map = {
    readonly _tag: "map"
    readonly length?: LengthEncoding
    readonly keyOrder?: ReadonlyArray<Uint8Array>
    readonly entries: ReadonlyArray<readonly [CBORFormat, CBORFormat]>
  }
  /** Tag (major 6). `width` absent → minimal tag header. */
  export type Tag = {
    readonly _tag: "tag"
    readonly width?: ByteSize
    readonly child: CBORFormat
  }
  /** Simple value or float (major 7). No encoding choices to preserve. */
  export type Simple = { readonly _tag: "simple" }
}

/**
 * Decoded value paired with its captured root format tree.
 *
 * @since 2.0.0
 * @category model
 */
export type DecodedWithFormat<A> = {
  value: A
  format: CBORFormat
}

/**
 * CBOR codec configuration options
 *
 * @since 1.0.0
 * @category model
 */
export type CodecOptions =
  | {
      readonly mode: "canonical"
      readonly mapsAsObjects?: boolean
      readonly encodeMapAsPairs?: boolean
    }
  | {
      readonly mode: "custom"
      readonly useIndefiniteArrays: boolean
      readonly useIndefiniteMaps: boolean
      readonly useDefiniteForEmpty: boolean
      readonly sortMapKeys: boolean
      readonly useMinimalEncoding: boolean
      readonly mapsAsObjects?: boolean
      readonly encodeMapAsPairs?: boolean
    }

/**
 * Canonical CBOR encoding options (RFC 8949 Section 4.2.1)
 *
 * @since 1.0.0
 * @category constants
 */
export const CANONICAL_OPTIONS: CodecOptions = {
  mode: "canonical"
} as const

/**
 * Default CBOR encoding options
 *
 * @since 1.0.0
 * @category constants
 */
export const CML_DEFAULT_OPTIONS: CodecOptions = {
  mode: "custom",
  useIndefiniteArrays: false,
  useIndefiniteMaps: false,
  useDefiniteForEmpty: true,
  sortMapKeys: false,
  useMinimalEncoding: true,
  mapsAsObjects: false
} as const

/**
 * Default CBOR encoding options for PlutusData.
 *
 * Uses indefinite-length arrays and maps. The `bounded_bytes` constraint
 * (Conway CDDL: byte strings ≤ 64 bytes) is enforced at the data-type layer
 * via the `BoundedBytes` CBOR node, independent of these codec options.
 *
 * @since 1.0.0
 * @category constants
 */
export const CML_DATA_DEFAULT_OPTIONS: CodecOptions = {
  mode: "custom",
  useIndefiniteArrays: true,
  useIndefiniteMaps: true,
  useDefiniteForEmpty: true,
  sortMapKeys: false,
  useMinimalEncoding: true,
  mapsAsObjects: false
} as const

/**
 * Aiken-compatible CBOR encoding options.
 *
 * Matches the encoding produced by `cbor.serialise()` in Aiken:
 * - Indefinite-length arrays (`9f...ff`)
 * - Maps encoded as arrays of pairs (not CBOR maps)
 * - Strings as byte arrays (major type 2, not 3)
 * - Constructor tags: 121–127 for indices 0–6, then 1280+ for 7+
 *
 * PlutusData byte strings are chunked per the Conway `bounded_bytes` rule
 * via the `BoundedBytes` CBOR node, independent of these codec options.
 *
 * @since 2.0.0
 * @category constants
 */
export const AIKEN_DEFAULT_OPTIONS: CodecOptions = {
  mode: "custom",
  useIndefiniteArrays: true,
  useIndefiniteMaps: true,
  useDefiniteForEmpty: false,
  sortMapKeys: false,
  useMinimalEncoding: true,
  mapsAsObjects: false,
  encodeMapAsPairs: true
} as const

/**
 * CBOR encoding options that return objects instead of Maps for Schema.Struct compatibility
 *
 * @since 2.0.0
 * @category constants
 */
export const STRUCT_FRIENDLY_OPTIONS: CodecOptions = {
  mode: "custom",
  useIndefiniteArrays: false,
  useIndefiniteMaps: false,
  useDefiniteForEmpty: true,
  sortMapKeys: false,
  useMinimalEncoding: true,
  mapsAsObjects: true
} as const

/**
 * Cardano Node compatible CBOR encoding options for PlutusData
 *
 * Uses definite-length encoding for arrays and maps, matching the format
 * produced by CML's `to_cardano_node_format().to_cbor_hex()`.
 *
 * Note: The on-chain format uses indefinite-length (AIKEN_DEFAULT_OPTIONS),
 * but this option is useful for testing compatibility with tools that
 * expect definite-length encoding.
 *
 * @since 2.0.0
 * @category constants
 */
export const CARDANO_NODE_DATA_OPTIONS: CodecOptions = {
  mode: "custom",
  useIndefiniteArrays: false,
  useIndefiniteMaps: false,
  useDefiniteForEmpty: true,
  sortMapKeys: false,
  useMinimalEncoding: true,
  mapsAsObjects: false
} as const

const DEFAULT_OPTIONS: CodecOptions = {
  mode: "custom",
  useIndefiniteArrays: false,
  useIndefiniteMaps: false,
  useDefiniteForEmpty: true,
  sortMapKeys: false,
  useMinimalEncoding: true,
  mapsAsObjects: false
} as const

// Shared text codec singletons to avoid per-call allocations in hot paths
const TEXT_ENCODER = new TextEncoder()
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true })

// Shared float encoding buffers to reduce allocations in hot paths
const FLOAT32_BUF = new ArrayBuffer(4)
const FLOAT32_VIEW = new DataView(FLOAT32_BUF)
const FLOAT32_BYTES = new Uint8Array(FLOAT32_BUF)
const FLOAT64_BUF = new ArrayBuffer(8)
const FLOAT64_VIEW = new DataView(FLOAT64_BUF)
const FLOAT64_BYTES = new Uint8Array(FLOAT64_BUF)

/**
 * Encode a CBOR definite-length array from already-encoded item bytes.
 * This is a low-level function that constructs: definite_array_header + items.
 *
 */
export const encodeArrayAsDefinite = (items: ReadonlyArray<Uint8Array>): Uint8Array => {
  const len = items.length
  // Compute header length based on array length (major type 4: arrays)
  let headerLen = 0
  if (len < 24) headerLen = 1
  else if (len < 256) headerLen = 2
  else if (len < 65536) headerLen = 3
  else headerLen = 5

  const totalItemsLen = items.reduce((acc, b) => acc + b.length, 0)
  const out = new Uint8Array(headerLen + totalItemsLen)
  let offset = 0

  // Write the definite-length array header inline
  if (len < 24) {
    out[offset++] = 0x80 + len
  } else if (len < 256) {
    out[offset++] = 0x98
    out[offset++] = len
  } else if (len < 65536) {
    out[offset++] = 0x99
    out[offset++] = (len >>> 8) & 0xff
    out[offset++] = len & 0xff
  } else {
    out[offset++] = 0x9a
    out[offset++] = (len >>> 24) & 0xff
    out[offset++] = (len >>> 16) & 0xff
    out[offset++] = (len >>> 8) & 0xff
    out[offset++] = len & 0xff
  }

  for (const b of items) {
    out.set(b, offset)
    offset += b.length
  }
  return out
}

/**
 * Encode a CBOR indefinite-length array from already-encoded item bytes.
 * This is a low-level function that constructs: 0x9f + items + 0xff.
 *
 */
export const encodeArrayAsIndefinite = (items: ReadonlyArray<Uint8Array>): Uint8Array => {
  const totalItemsLen = items.reduce((acc, b) => acc + b.length, 0)
  const out = new Uint8Array(1 + totalItemsLen + 1)
  let offset = 0

  // Indefinite array start marker
  out[offset++] = 0x9f

  // Copy all items
  for (const b of items) {
    out.set(b, offset)
    offset += b.length
  }

  // Break marker
  out[offset] = 0xff

  return out
}

/**
 * Encode a CBOR tagged value from already-encoded value bytes.
 * This is a low-level function that constructs: tag_header + value_bytes.
 *
 */
export const encodeTaggedValue = (tag: number, valueBytes: Uint8Array): Uint8Array => {
  if (tag < 0) throw new Error("CBOR.encodeTaggedValue: negative tag")

  // Compute header length based on tag value (major type 6: tags)
  let headerLen = 0
  if (tag < 24) headerLen = 1
  else if (tag < 256) headerLen = 2
  else if (tag < 65536) headerLen = 3
  else headerLen = 5

  const out = new Uint8Array(headerLen + valueBytes.length)
  let offset = 0

  // Write the tag header inline
  if (tag < 24) {
    out[offset++] = 0xc0 + tag
  } else if (tag < 256) {
    out[offset++] = 0xd8
    out[offset++] = tag
  } else if (tag < 65536) {
    out[offset++] = 0xd9
    out[offset++] = (tag >>> 8) & 0xff
    out[offset++] = tag & 0xff
  } else {
    out[offset++] = 0xda
    out[offset++] = (tag >>> 24) & 0xff
    out[offset++] = (tag >>> 16) & 0xff
    out[offset++] = (tag >>> 8) & 0xff
    out[offset++] = tag & 0xff
  }

  // Append the already-encoded value bytes
  out.set(valueBytes, offset)
  return out
}

/**
 * Type representing a CBOR value with simplified, non-tagged structure
 *
 * @since 1.0.0
 * @category model
 */
export type CBOR =
  | bigint // integers (both positive and negative)
  | Uint8Array // byte strings
  | string // text strings
  | ReadonlyArray<CBOR> // arrays
  | ReadonlyMap<CBOR, CBOR> // maps
  | { readonly [key: string | number]: CBOR } // record alternative to maps
  | { _tag: "Tag"; tag: number; value: CBOR } // tagged values
  | boolean // boolean values
  | null // null value
  | undefined // undefined value
  | number // floating point numbers
  | { _tag: "BoundedBytes"; bytes: Uint8Array } // PlutusData bounded byte strings (Conway CDDL bounded_bytes = bytes .size (0..64))

/**
 * **Record vs Map Key Ordering**
 *
 * Records `{ readonly [key: string | number]: CBOR }` follow JavaScript object property enumeration rules:
 * 1. **Integer-like strings in ascending numeric order** (e.g., "0", "1", "42", "999")
 * 2. **Other strings in insertion order** (e.g., "text", "key1", "key2")
 *
 * Maps `ReadonlyMap<CBOR, CBOR>` preserve insertion order for all key types.
 *
 * **Example:**
 * ```typescript
 * // Map preserves insertion order: ["text", 42n, 999n]
 * const map = new Map([["text", "a"], [42n, "b"], [999n, "c"]])
 *
 * // Record follows JS enumeration: [42, 999, "text"]
 * const record = { text: "a", 42: "b", 999: "c" }
 * ```
 *
 * **Recommendation:** Use Maps for consistent insertion order with mixed key types,
 * or use canonical encoding to eliminate ordering differences.
 *
 * @since 1.0.0
 * @category model
 */

/**
 * CBOR Value schema definitions for each major type
 *
 * @since 1.0.0
 * @category schemas
 */

// Integer (Major Type 0 and 1 combined)
export const Integer = Schema.BigIntFromSelf
export const isInteger = Schema.is(Integer)

// Byte String (Major Type 2)
export const ByteArray = Schema.Uint8ArrayFromSelf
export const isByteArray = Schema.is(ByteArray)

// Text String (Major Type 3)
export const Text = Schema.String

// Array (Major Type 4)
export const ArraySchema = Schema.Array(Schema.suspend(() => CBORSchema))
export const isArray = Schema.is(ArraySchema)

// Map (Major Type 5)
export const MapSchema = Schema.ReadonlyMapFromSelf({
  key: Schema.suspend((): Schema.Schema<CBOR> => CBORSchema),
  value: Schema.suspend((): Schema.Schema<CBOR> => CBORSchema)
})

export const isMap = Schema.is(MapSchema)

// Record (Alternative to Major Type 5 - Map)
// Provides a Record<string, CBOR> alternative to ReadonlyMap<CBOR, CBOR>
// for applications that prefer object-based map representations
export const RecordSchema = Schema.Record({
  key: Schema.String, // Keep only string keys for Schema compatibility
  value: Schema.suspend((): Schema.Schema<CBOR> => CBORSchema)
})

export const isRecord = Schema.is(RecordSchema)

// Tag (Major Type 6)
export const Tag = Schema.TaggedStruct("Tag", {
  tag: Schema.Number,
  value: Schema.suspend((): Schema.Schema<CBOR> => CBORSchema)
})

export const tag = <T extends number, C extends Schema.Schema<any, any>>(tag: T, value: C) =>
  Schema.TaggedStruct("Tag", {
    tag: Schema.Literal(tag),
    value
  })

// Map function to create a schema for CBOR maps with specific key and value types
export const map = <K extends CBOR, V extends CBOR>(key: Schema.Schema<K>, value: Schema.Schema<V>) =>
  Schema.ReadonlyMapFromSelf({ key, value })

export const isTag = Schema.is(Tag)

// Simple values (Major Type 7)
export const Simple = Schema.Union(Schema.Boolean, Schema.Null, Schema.Undefined)

// Float (Major Type 7)
export const Float = Schema.Number

/**
 * CBOR Value discriminated union schema representing all possible CBOR data types
 * Inspired by OCaml and Rust CBOR implementations
 *
 * @since 1.0.0
 * @category schemas
 */
export const CBORSchema: Schema.Schema<CBOR> = Schema.Union(
  Integer,
  ByteArray,
  Text,
  ArraySchema,
  MapSchema,
  RecordSchema,
  Tag,
  Simple,
  Float
).annotations({ identifier: "CBOR", description: "CBOR value schema" })

/**
 * Schema for encoding/decoding CBOR bytes using internal functions
 * This bypasses Effect's schema encoding for Tags to use proper CBOR tag encoding
 *
 * @since 1.0.0
 * @category schemas
 */
const CBORValueSchema = Schema.declare((input: unknown): input is CBOR => {
  // Basic runtime type checking for CBOR values
  if (typeof input === "bigint") return true
  if (input instanceof Uint8Array) return true
  if (typeof input === "string") return true
  if (Array.isArray(input)) return true
  if (input instanceof Map) return true
  if (input instanceof Tag) return true
  if (typeof input === "boolean") return true
  if (input === null || input === undefined) return true
  if (typeof input === "number") return true
  if (typeof input === "object" && input !== null) return true
  return false
})

/**
 * Pattern matching utility for CBOR values
 *
 * @since 1.0.0
 * @category transformation
 */
export const match = <R>(
  value: CBOR,
  patterns: {
    integer: (value: bigint) => R
    bytes: (value: Uint8Array) => R
    text: (value: string) => R
    array: (value: ReadonlyArray<CBOR>) => R
    map: (value: ReadonlyMap<CBOR, CBOR>) => R
    record: (value: { readonly [key: string]: CBOR }) => R
    tag: (tag: number, value: CBOR) => R
    boolean: (value: boolean) => R
    null: () => R
    undefined: () => R
    float: (value: number) => R
    boundedBytes: (value: Uint8Array) => R
  }
): R => {
  if (typeof value === "bigint") {
    return patterns.integer(value)
  }
  if (value instanceof Uint8Array) {
    return patterns.bytes(value)
  }
  if (typeof value === "string") {
    return patterns.text(value)
  }
  if (Array.isArray(value)) {
    return patterns.array(value)
  }
  if (value instanceof Map) {
    return patterns.map(value)
  }
  if (isTag(value)) {
    return patterns.tag(value.tag, value.value)
  }
  if (BoundedBytes.is(value)) {
    return patterns.boundedBytes(value.bytes)
  }
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Map) &&
    !(value instanceof Uint8Array) &&
    !(value instanceof Tag)
  ) {
    return patterns.record(value as { readonly [key: string]: CBOR })
  }
  if (typeof value === "boolean") {
    return patterns.boolean(value)
  }
  if (value === null) {
    return patterns.null()
  }
  if (value === undefined) {
    return patterns.undefined()
  }
  if (typeof value === "number") {
    return patterns.float(value)
  }

  // This should never happen with proper typing
  throw new Error(`Unhandled CBOR value type: ${typeof value}`)
}

// Helper functions for bigint conversion

/**
 * Convert a positive bigint to a big-endian byte array
 * Used for CBOR tag 2 (big_uint) encoding
 */
const bigintToBytes = (value: bigint): Uint8Array => {
  if (value === 0n) {
    return new Uint8Array([0])
  }

  const bytes: Array<number> = []
  let temp = value

  while (temp > 0n) {
    bytes.unshift(Number(temp & 0xffn))
    temp = temp >> 8n
  }

  return new Uint8Array(bytes)
}

// Note: bytesToBigint and Effect-based decodeLength removed in sync-only refactor

const decodeFloat16 = (value: number): number => {
  const sign = (value & 0x8000) >> 15
  const exponent = (value & 0x7c00) >> 10
  const fraction = value & 0x03ff

  if (exponent === 0) {
    return (sign ? -1 : 1) * Math.pow(2, -14) * (fraction / 1024)
  } else if (exponent === 0x1f) {
    return fraction ? NaN : sign ? -Infinity : Infinity
  } else {
    return (sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / 1024)
  }
}

const encodeFloat16 = (value: number): number => {
  if (Number.isNaN(value)) return 0x7e00
  if (value === Infinity) return 0x7c00
  if (value === -Infinity) return 0xfc00
  if (value === 0) return value === 0 && 1 / value === Infinity ? 0x0000 : 0x8000

  const sign = value < 0 ? 1 : 0
  const absValue = Math.abs(value)

  if (absValue >= Math.pow(2, 16)) return sign ? 0xfc00 : 0x7c00 // Infinity
  if (absValue < Math.pow(2, -24)) return sign ? 0x8000 : 0x0000 // Zero

  let exponent = Math.floor(Math.log2(absValue))
  let mantissa = absValue / Math.pow(2, exponent)

  if (exponent < -14) {
    // Subnormal
    mantissa = absValue / Math.pow(2, -14)
    exponent = 0
  } else {
    // Normal
    mantissa = (mantissa - 1) * 1024
    exponent += 15
  }

  return (sign << 15) | (exponent << 10) | Math.round(mantissa)
}

/**
 * Create a CBOR bytes schema with custom codec options
 *
 * @since 1.0.0
 * @category schemas
 */
export const FromBytes = (options: CodecOptions) =>
  Schema.transformOrFail(Schema.Uint8ArrayFromSelf, CBORValueSchema, {
    strict: true,
    decode: (fromA, _, ast) =>
      E.try({
        try: () => internalDecodeSync(fromA, options),
        catch: (error) =>
          new ParseResult.Type(
            ast,
            fromA,
            `Failed to decode CBOR value: ${error instanceof CBORError ? error.message : String(error)}`
          )
      }),
    encode: (toI, _, ast) =>
      E.try({
        try: () => internalEncodeSync(toI, options),
        catch: (error) =>
          new ParseResult.Type(
            ast,
            toI,
            `Failed to encode CBOR value: ${error instanceof CBORError ? error.message : String(error)}`
          )
      })
  })

export const FromHex = (options: CodecOptions) => Schema.compose(Schema.Uint8ArrayFromHex, FromBytes(options))

// ============================================================================
// Either-based API (Step 1)
// Thin wrappers around existing Effect API using Either.try
// ============================================================================

export namespace Either {
  /** Decode CBOR bytes to a CBOR value, returning Either */
  export const fromCBORBytes = (
    bytes: Uint8Array,
    options: CodecOptions = CML_DEFAULT_OPTIONS
  ): E.Either<CBOR, CBORError> =>
    E.try({
      try: () => internalDecodeSync(bytes, options),
      catch: (e) => (e instanceof CBORError ? e : new CBORError({ message: String(e), cause: e }))
    })

  /** Decode CBOR hex string to a CBOR value, returning Either */
  export const fromCBORHex = (hex: string, options: CodecOptions = CML_DEFAULT_OPTIONS): E.Either<CBOR, CBORError> =>
    E.try({
      try: () => {
        const bytes = Bytes.fromHex(hex)
        return internalDecodeSync(bytes, options)
      },
      catch: (e) => (e instanceof CBORError ? e : new CBORError({ message: String(e), cause: e }))
    })

  /** Encode a CBOR value to bytes, returning Either */
  export const toCBORBytes = (
    value: CBOR,
    options: CodecOptions = CML_DEFAULT_OPTIONS
  ): E.Either<Uint8Array, CBORError> =>
    E.try({
      try: () => internalEncodeSync(value, options),
      catch: (e) => (e instanceof CBORError ? e : new CBORError({ message: String(e), cause: e }))
    })

  /** Encode a CBOR value to hex string, returning Either */
  export const toCBORHex = (value: CBOR, options: CodecOptions = CML_DEFAULT_OPTIONS): E.Either<string, CBORError> =>
    E.try({
      try: () => Bytes.toHex(internalEncodeSync(value, options)),
      catch: (e) => (e instanceof CBORError ? e : new CBORError({ message: String(e), cause: e }))
    })
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a CBOR value from CBOR bytes.
 *
 * @since 1.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CodecOptions = CML_DEFAULT_OPTIONS): CBOR =>
  internalDecodeSync(bytes, options)

/**
 * Parse a CBOR value from CBOR bytes and return the root format tree.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytesWithFormat = (
  bytes: Uint8Array
): DecodedWithFormat<CBOR> => internalDecodeWithFormatSync(bytes)

/**
 * Parse a CBOR value from CBOR hex string.
 *
 * @since 1.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CodecOptions = CML_DEFAULT_OPTIONS): CBOR => {
  const bytes = Bytes.fromHex(hex)
  return internalDecodeSync(bytes, options)
}

/**
 * Parse a CBOR value from CBOR hex string and return the root format tree.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHexWithFormat = (
  hex: string
): DecodedWithFormat<CBOR> => {
  const bytes = Bytes.fromHex(hex)
  return internalDecodeWithFormatSync(bytes)
}

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a CBOR value to CBOR bytes.
 *
 * @since 1.0.0
 * @category encoding
 */
export const toCBORBytes = (value: CBOR, options: CodecOptions = CML_DEFAULT_OPTIONS): Uint8Array =>
  internalEncodeSync(value, options)

/**
 * Convert a CBOR value to CBOR bytes using an explicit root format tree.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytesWithFormat = (
  value: CBOR,
  format: CBORFormat
): Uint8Array => internalEncodeSync(value, CML_DEFAULT_OPTIONS, format)

/**
 * Convert a CBOR value to CBOR hex string.
 *
 * @since 1.0.0
 * @category encoding
 */
export const toCBORHex = (value: CBOR, options: CodecOptions = CML_DEFAULT_OPTIONS): string =>
  Bytes.toHex(internalEncodeSync(value, options))

/**
 * Convert a CBOR value to CBOR hex string using an explicit root format tree.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHexWithFormat = (
  value: CBOR,
  format: CBORFormat
): string => Bytes.toHex(internalEncodeSync(value, CML_DEFAULT_OPTIONS, format))

// ============================================================================
// Sync core (Step 2): fast, exception-based encode/decode with no Effect
// These functions throw CBORError on failure and are used by Either and direct APIs.
// ============================================================================

// Encode (sync)

/** Encode an integer with minimal CBOR width (fallback when metadata width is too small). */
const encodeIntMinimal = (majorType: number, value: bigint): Uint8Array => {
  const mt = majorType << 5
  if (value < 24n) return new Uint8Array([mt | Number(value)])
  if (value < 256n) return new Uint8Array([mt | 24, Number(value)])
  if (value < 65536n) {
    const n = Number(value)
    return new Uint8Array([mt | 25, (n >> 8) & 0xff, n & 0xff])
  }
  if (value < 4294967296n) {
    const n = Number(value)
    return new Uint8Array([mt | 26, (n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff])
  }
  const low = Number(value & 0xffffffffn)
  const high = Number(value >> 32n)
  return new Uint8Array([
    mt | 27,
    (high >> 24) & 0xff, (high >> 16) & 0xff, (high >> 8) & 0xff, high & 0xff,
    (low >> 24) & 0xff, (low >> 16) & 0xff, (low >> 8) & 0xff, low & 0xff
  ])
}

/** Encode a CBOR header: major type (0-7) + value with specific ByteSize width.
 *  Falls back to minimal encoding if the value no longer fits the recorded width. */
const encodeIntHeader = (majorType: number, value: bigint, byteSize: ByteSize): Uint8Array => {
  const mt = majorType << 5
  if (byteSize === 0) {
    if (value >= 24n) return encodeIntMinimal(majorType, value)
    return new Uint8Array([mt | Number(value)])
  }
  if (byteSize === 1) {
    if (value >= 256n) return encodeIntMinimal(majorType, value)
    return new Uint8Array([mt | 24, Number(value)])
  }
  if (byteSize === 2) {
    if (value >= 65536n) return encodeIntMinimal(majorType, value)
    const n = Number(value)
    return new Uint8Array([mt | 25, (n >> 8) & 0xff, n & 0xff])
  }
  if (byteSize === 4) {
    if (value >= 4294967296n) return encodeIntMinimal(majorType, value)
    const n = Number(value)
    return new Uint8Array([mt | 26, (n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff])
  }
  // byteSize === 8
  const low = Number(value & 0xffffffffn)
  const high = Number(value >> 32n)
  return new Uint8Array([
    mt | 27,
    (high >> 24) & 0xff,
    (high >> 16) & 0xff,
    (high >> 8) & 0xff,
    high & 0xff,
    (low >> 24) & 0xff,
    (low >> 16) & 0xff,
    (low >> 8) & 0xff,
    low & 0xff
  ])
}

export const internalEncodeSync = (value: CBOR, options: CodecOptions = CML_DEFAULT_OPTIONS, fmt?: CBORFormat): Uint8Array => {
  // Explicit fmt is the only source of format metadata.
  const resolvedFmt: CBORFormat | undefined = fmt

  if (typeof value === "bigint") {
    if (value >= 0n) return encodeUintSync(value, options, resolvedFmt)
    return encodeNintSync(value, options, resolvedFmt)
  }
  if (value instanceof Uint8Array) return encodeBytesSync(value, options, resolvedFmt)
  if (typeof value === "string") return encodeTextSync(value, options, resolvedFmt)
  if (Array.isArray(value)) return encodeArraySync(value, options, resolvedFmt)
  if (value instanceof Map) return encodeMapSync(value, options, resolvedFmt)
  if (isTag(value)) return encodeTagSync(value.tag, value.value, options, resolvedFmt)
  // BoundedBytes: PlutusData byte strings, encoded per Conway CDDL bounded_bytes = bytes .size (0..64)
  if (
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    (value as { _tag: unknown })._tag === "BoundedBytes"
  ) {
    return encodeBoundedBytesSync((value as { _tag: "BoundedBytes"; bytes: Uint8Array }).bytes)
  }
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Map) &&
    !(value instanceof Uint8Array) &&
    !(value instanceof Tag)
  ) {
    return encodeRecordSync(value as { readonly [key: string | number]: CBOR }, options, resolvedFmt)
  }
  if (typeof value === "boolean" || value === null || value === undefined) return encodeSimpleSync(value)
  if (typeof value === "number") return encodeFloatSync(value, options)
  throw new CBORError({ message: `Unsupported CBOR value type: ${typeof value}` })
}

const encodeUintSync = (value: bigint, options: CodecOptions, fmt?: CBORFormat): Uint8Array => {
  if (value < 0n) throw new CBORError({ message: `Cannot encode negative value ${value} as unsigned integer` })
  const maxUint64 = 18446744073709551615n
  if (value > maxUint64) {
    const bytes = bigintToBytes(value)
    return encodeTagSync(2, bytes, options, fmt)
  }
  // Use specific ByteSize from format metadata
  if (fmt?._tag === "uint" && fmt.byteSize !== undefined) {
    return encodeIntHeader(0, value, fmt.byteSize)
  }
  // Preserve mode without metadata uses minimal encoding (CML default)
  const useMinimal = options.mode !== "custom" || options.useMinimalEncoding

  // Fast path for very small integers using pre-allocated arrays
  if (value < 24n) {
    return SMALL_INTS[Number(value)]
  } else if (value < 256n && useMinimal) {
    return new Uint8Array([24, Number(value)])
  } else if (value < 65536n && useMinimal) {
    const num = Number(value)
    return new Uint8Array([25, num >> 8, num & 0xff])
  } else if (value < 4294967296n && useMinimal) {
    const num = Number(value)
    return new Uint8Array([26, (num >> 24) & 0xff, (num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff])
  } else {
    // Use more efficient bit operations for 64-bit values
    const low = Number(value & 0xffffffffn)
    const high = Number(value >> 32n)
    return new Uint8Array([
      27,
      (high >> 24) & 0xff,
      (high >> 16) & 0xff,
      (high >> 8) & 0xff,
      high & 0xff,
      (low >> 24) & 0xff,
      (low >> 16) & 0xff,
      (low >> 8) & 0xff,
      low & 0xff
    ])
  }
}

const encodeNintSync = (value: bigint, options: CodecOptions, fmt?: CBORFormat): Uint8Array => {
  if (value >= 0n) throw new CBORError({ message: `Cannot encode non-negative value ${value} as negative integer` })
  const minInt64 = -18446744073709551615n
  if (value < minInt64) {
    const positiveValue = -(value + 1n)
    const bytes = bigintToBytes(positiveValue)
    return encodeTagSync(3, bytes, options, fmt)
  }
  const positiveValue = -value - 1n
  // Use specific ByteSize from format metadata
  if (fmt?._tag === "nint" && fmt.byteSize !== undefined) {
    return encodeIntHeader(1, positiveValue, fmt.byteSize)
  }
  const useMinimal = options.mode !== "custom" || options.useMinimalEncoding
  if (positiveValue < 24n) {
    return new Uint8Array([0x20 + Number(positiveValue)])
  } else if (positiveValue < 256n && useMinimal) {
    return new Uint8Array([0x38, Number(positiveValue)])
  } else if (positiveValue < 65536n && useMinimal) {
    return new Uint8Array([0x39, Number(positiveValue >> 8n), Number(positiveValue & 0xffn)])
  } else if (positiveValue < 4294967296n && useMinimal) {
    return new Uint8Array([
      0x3a,
      Number((positiveValue >> 24n) & 0xffn),
      Number((positiveValue >> 16n) & 0xffn),
      Number((positiveValue >> 8n) & 0xffn),
      Number(positiveValue & 0xffn)
    ])
  } else {
    return new Uint8Array([
      0x3b,
      Number((positiveValue >> 56n) & 0xffn),
      Number((positiveValue >> 48n) & 0xffn),
      Number((positiveValue >> 40n) & 0xffn),
      Number((positiveValue >> 32n) & 0xffn),
      Number((positiveValue >> 24n) & 0xffn),
      Number((positiveValue >> 16n) & 0xffn),
      Number((positiveValue >> 8n) & 0xffn),
      Number(positiveValue & 0xffn)
    ])
  }
}

/** Byte-string chunk header size for a given chunk length (CBOR major type 2). */
const chunkHeaderSize = (len: number): number => {
  if (len < 24) return 1
  if (len < 256) return 2
  if (len < 65536) return 3
  return 5
}

/** Write a definite-length byte-string header for a chunk into `buf` at `pos`. Returns new position. */
const writeChunkHeader = (buf: Uint8Array, pos: number, len: number): number => {
  if (len < 24) {
    buf[pos++] = 0x40 + len
  } else if (len < 256) {
    buf[pos++] = 0x58
    buf[pos++] = len
  } else if (len < 65536) {
    buf[pos++] = 0x59
    buf[pos++] = (len >> 8) & 0xff
    buf[pos++] = len & 0xff
  } else {
    buf[pos++] = 0x5a
    buf[pos++] = (len >> 24) & 0xff
    buf[pos++] = (len >> 16) & 0xff
    buf[pos++] = (len >> 8) & 0xff
    buf[pos++] = len & 0xff
  }
  return pos
}

/**
 * Encodes a byte string under the Conway `bounded_bytes` rule:
 * - ≤ 64 bytes → definite-length CBOR bytes
 * - > 64 bytes → indefinite-length byte string (`0x5f` + 64-byte chunks + `0xff`)
 *
 * Called unconditionally by the `BoundedBytes` CBOR node handler. Does not
 * depend on `CodecOptions` — the rule is always applied.
 */
const BOUNDED_BYTES_CHUNK_SIZE = 64
const encodeBoundedBytesSync = (value: Uint8Array): Uint8Array => {
  const length = value.length
  if (length === 0) return new Uint8Array([0x40])
  if (length <= BOUNDED_BYTES_CHUNK_SIZE) {
    // Definite-length encoding
    let headerLen: number
    if (length < 24) headerLen = 1
    else if (length < 256) headerLen = 2
    else headerLen = 3
    const out = new Uint8Array(headerLen + length)
    if (length < 24) out[0] = 0x40 + length
    else if (length < 256) {
      out[0] = 0x58
      out[1] = length
    } else {
      out[0] = 0x59
      out[1] = length >> 8
      out[2] = length & 0xff
    }
    out.set(value, headerLen)
    return out
  }
  // Indefinite-length chunked byte string for > 64 bytes
  let totalSize = 2 // 0x5f + 0xff
  for (let offset = 0; offset < length; offset += BOUNDED_BYTES_CHUNK_SIZE) {
    const chunkLen = Math.min(BOUNDED_BYTES_CHUNK_SIZE, length - offset)
    totalSize += chunkHeaderSize(chunkLen) + chunkLen
  }
  const result = new Uint8Array(totalSize)
  let pos = 0
  result[pos++] = 0x5f
  for (let offset = 0; offset < length; offset += BOUNDED_BYTES_CHUNK_SIZE) {
    const chunkLen = Math.min(BOUNDED_BYTES_CHUNK_SIZE, length - offset)
    pos = writeChunkHeader(result, pos, chunkLen)
    result.set(value.subarray(offset, offset + BOUNDED_BYTES_CHUNK_SIZE), pos)
    pos += chunkLen
  }
  result[pos] = 0xff
  return result
}

const encodeBytesSync = (value: Uint8Array, options: CodecOptions, fmt?: CBORFormat): Uint8Array => {
  const length = value.length
  const stringEncoding = fmt?._tag === "bytes" ? fmt.encoding : undefined

  // Use string encoding metadata if available
  if (stringEncoding !== undefined) {
    if (stringEncoding.tag === "indefinite") {
      const chunks = stringEncoding.chunks
      let totalSize = 2 // 0x5f + 0xff
      for (const chunk of chunks) {
        totalSize += encodeIntHeader(2, BigInt(chunk.length), chunk.byteSize).length + chunk.length
      }
      const result = new Uint8Array(totalSize)
      let pos = 0
      result[pos++] = 0x5f
      let srcOffset = 0
      for (const chunk of chunks) {
        const header = encodeIntHeader(2, BigInt(chunk.length), chunk.byteSize)
        result.set(header, pos)
        pos += header.length
        result.set(value.subarray(srcOffset, srcOffset + chunk.length), pos)
        pos += chunk.length
        srcOffset += chunk.length
      }
      result[pos] = 0xff
      return result
    }
    // Definite with specific byteSize
    const header = encodeIntHeader(2, BigInt(length), stringEncoding.byteSize)
    const result = new Uint8Array(header.length + length)
    result.set(header, 0)
    result.set(value, header.length)
    return result
  }

  const useMinimal = options.mode !== "custom" || options.useMinimalEncoding

  // Fast path for empty bytes
  if (length === 0) {
    return new Uint8Array([0x40])
  }

  // Standard definite-length encoding
  let headerBytes: Uint8Array
  if (length < 24) {
    headerBytes = new Uint8Array([0x40 + length])
  } else if (length < 256 && useMinimal) {
    headerBytes = new Uint8Array([0x58, length])
  } else if (length < 65536 && useMinimal) {
    headerBytes = new Uint8Array([0x59, length >> 8, length & 0xff])
  } else if (length < 4294967296 && useMinimal) {
    headerBytes = new Uint8Array([
      0x5a,
      (length >> 24) & 0xff,
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff
    ])
  } else {
    throw new CBORError({ message: `Byte string too long: ${length} bytes` })
  }

  const result = new Uint8Array(headerBytes.length + length)
  result.set(headerBytes, 0)
  result.set(value, headerBytes.length)
  return result
}

/**
 * `BoundedBytes` CBOR node — represents a PlutusData byte string that must comply
 * with the Conway CDDL constraint `bounded_bytes = bytes .size (0..64)`.
 *
 * The encoding rule is unconditional and options-independent:
 * - ≤ 64 bytes → definite-length CBOR bytes
 * - > 64 bytes → indefinite-length 64-byte chunked byte string (`0x5f` + chunks + `0xff`)
 *
 * Use `BoundedBytes.make` to construct the node; the encoder handles the rest.
 *
 * @since 2.0.0
 * @category model
 */
export const BoundedBytes = {
  /** Construct a BoundedBytes CBOR node from a raw byte array. */
  make: (bytes: Uint8Array): CBOR => ({ _tag: "BoundedBytes" as const, bytes }),
  /** Type guard for BoundedBytes CBOR nodes. */
  is: (value: CBOR): value is { _tag: "BoundedBytes"; bytes: Uint8Array } =>
    typeof value === "object" &&
    value !== null &&
    "_tag" in value &&
    (value as { _tag: unknown })._tag === "BoundedBytes"
} as const

const encodeTextSync = (value: string, options: CodecOptions, fmt?: CBORFormat): Uint8Array => {
  const stringEncoding = fmt?._tag === "text" ? fmt.encoding : undefined
  // Use string encoding metadata if available
  if (stringEncoding !== undefined) {
    const utf8 = TEXT_ENCODER.encode(value)
    if (stringEncoding.tag === "indefinite") {
      const chunks = stringEncoding.chunks
      let totalSize = 2 // 0x7f + 0xff
      for (const chunk of chunks) {
        totalSize += encodeIntHeader(3, BigInt(chunk.length), chunk.byteSize).length + chunk.length
      }
      const result = new Uint8Array(totalSize)
      let pos = 0
      result[pos++] = 0x7f
      let srcOffset = 0
      for (const chunk of chunks) {
        const header = encodeIntHeader(3, BigInt(chunk.length), chunk.byteSize)
        result.set(header, pos)
        pos += header.length
        result.set(utf8.subarray(srcOffset, srcOffset + chunk.length), pos)
        pos += chunk.length
        srcOffset += chunk.length
      }
      result[pos] = 0xff
      return result
    }
    // Definite with specific byteSize
    const header = encodeIntHeader(3, BigInt(utf8.length), stringEncoding.byteSize)
    const result = new Uint8Array(header.length + utf8.length)
    result.set(header, 0)
    result.set(utf8, header.length)
    return result
  }

  // Fast path for empty strings
  if (value.length === 0) {
    return new Uint8Array([0x60])
  }

  const utf8Bytes = TEXT_ENCODER.encode(value)
  const length = utf8Bytes.length
  const useMinimal = options.mode !== "custom" || options.useMinimalEncoding

  // Optimize header encoding
  let headerBytes: Uint8Array
  if (length < 24) {
    headerBytes = new Uint8Array([0x60 + length])
  } else if (length < 256 && useMinimal) {
    headerBytes = new Uint8Array([0x78, length])
  } else if (length < 65536 && useMinimal) {
    headerBytes = new Uint8Array([0x79, length >> 8, length & 0xff])
  } else if (length < 4294967296 && useMinimal) {
    headerBytes = new Uint8Array([
      0x7a,
      (length >> 24) & 0xff,
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff
    ])
  } else {
    throw new CBORError({ message: `Text string too long: ${length} bytes` })
  }

  const result = new Uint8Array(headerBytes.length + length)
  result.set(headerBytes, 0)
  result.set(utf8Bytes, headerBytes.length)
  return result
}

const encodeArraySync = (value: ReadonlyArray<CBOR>, options: CodecOptions, fmt?: CBORFormat): Uint8Array => {
  const length = value.length

  // Fast path for empty arrays
  if (length === 0) {
    return new Uint8Array([0x80])
  }

  const arrayFmt = fmt?._tag === "array" ? fmt : undefined

  // Use format metadata if available
  if (arrayFmt?.length !== undefined) {
    const items = new Array<Uint8Array>(length)
    for (let i = 0; i < length; i++) {
      items[i] = internalEncodeSync(value[i], options, arrayFmt.children[i])
    }
    if (arrayFmt.length.tag === "indefinite") {
      return encodeArrayAsIndefinite(items)
    }
    // Definite with specific byteSize
    const header = encodeIntHeader(4, BigInt(length), arrayFmt.length.byteSize)
    const totalItemsLen = items.reduce((acc, b) => acc + b.length, 0)
    const out = new Uint8Array(header.length + totalItemsLen)
    out.set(header, 0)
    let offset = header.length
    for (const b of items) {
      out.set(b, offset)
      offset += b.length
    }
    return out
  }

  const useIndefinite = options.mode === "custom" && options.useIndefiniteArrays && length > 0

  // Pre-encode items (pass child formats if available even without length override)
  const items = new Array<Uint8Array>(length)
  for (let i = 0; i < length; i++) {
    items[i] = internalEncodeSync(value[i], options, arrayFmt?.children[i])
  }

  // Use low-level helpers
  return useIndefinite ? encodeArrayAsIndefinite(items) : encodeArrayAsDefinite(items)
}

const encodeMapEntriesSync = (pairs: Array<[CBOR, CBOR]>, options: CodecOptions, fmt?: CBORFormat): Uint8Array => {
  const length = pairs.length
  const mapFmt = fmt?._tag === "map" ? fmt : undefined

  const useMinimal = options.mode !== "custom" || options.useMinimalEncoding
  const sortKeys = !mapFmt && (options.mode === "canonical" || (options.mode === "custom" && options.sortMapKeys))
  const useIndefinite = !mapFmt && options.mode === "custom" && options.useIndefiniteMaps && length > 0
  const encodeAsPairs =
    !mapFmt && (options.mode === "canonical" || options.mode === "custom") && options.encodeMapAsPairs === true

  // If encoding as array of pairs (Aiken/Plutus style), delegate to array encoding
  if (encodeAsPairs) {
    const pairArrays = pairs.map(([k, v]) => [k, v] as CBOR)
    return encodeArraySync(pairArrays, options)
  }

  // Fast path for empty maps
  if (length === 0) return new Uint8Array([0xa0])

  // Encode each pair (with per-entry formats if format is available, otherwise canonical)
  let encodedPairs: Array<{ encodedKey: Uint8Array; encodedValue: Uint8Array }>
  if (mapFmt) {
    encodedPairs = new Array(length)
    for (let i = 0; i < length; i++) {
      const [key, val] = pairs[i]
      const [keyFmt, valFmt] = mapFmt.entries[i] ?? [undefined, undefined]
      encodedPairs[i] = {
        encodedKey: internalEncodeSync(key, options, keyFmt),
        encodedValue: internalEncodeSync(val, options, valFmt)
      }
    }
  } else if (sortKeys) {
    encodedPairs = pairs.map(([key, val]) => ({
      encodedKey: internalEncodeSync(key, options),
      encodedValue: internalEncodeSync(val, options)
    }))
    encodedPairs.sort((a, b) => a.encodedKey.length - b.encodedKey.length)
  } else {
    encodedPairs = new Array(length)
    for (let i = 0; i < length; i++) {
      const [key, val] = pairs[i]
      encodedPairs[i] = {
        encodedKey: internalEncodeSync(key, options),
        encodedValue: internalEncodeSync(val, options)
      }
    }
  }

  // Compute payload size
  let payloadSize = 0
  for (const p of encodedPairs) payloadSize += p.encodedKey.length + p.encodedValue.length

  // Build output: indefinite or definite header
  if (mapFmt?.length?.tag === "indefinite" || useIndefinite) {
    const out = new Uint8Array(1 + payloadSize + 1)
    let off = 0
    out[off++] = 0xbf
    for (const p of encodedPairs) {
      out.set(p.encodedKey, off)
      off += p.encodedKey.length
      out.set(p.encodedValue, off)
      off += p.encodedValue.length
    }
    out[off] = 0xff
    return out
  }

  // Definite header: use format byteSize if specified, else minimal
  let headerBytes: Uint8Array
  if (mapFmt?.length !== undefined) {
    headerBytes = encodeIntHeader(5, BigInt(length), mapFmt.length.byteSize)
  } else if (length < 24) {
    headerBytes = new Uint8Array([0xa0 + length])
  } else if (length < 256 && useMinimal) {
    headerBytes = new Uint8Array([0xb8, length])
  } else if (length < 65536 && useMinimal) {
    headerBytes = new Uint8Array([0xb9, length >> 8, length & 0xff])
  } else if (length < 4294967296 && useMinimal) {
    headerBytes = new Uint8Array([
      0xba,
      (length >> 24) & 0xff,
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff
    ])
  } else {
    throw new CBORError({ message: `Map too long: ${length} entries` })
  }

  const out = new Uint8Array(headerBytes.length + payloadSize)
  out.set(headerBytes, 0)
  let off = headerBytes.length
  for (const p of encodedPairs) {
    out.set(p.encodedKey, off)
    off += p.encodedKey.length
    out.set(p.encodedValue, off)
    off += p.encodedValue.length
  }
  return out
}

/**
 * Schema-derived structural equivalence for CBOR values.
 * Handles Uint8Array, Array, Map, Tag and all primitives via the
 * recursive CBORSchema definition — no hand-rolled comparison needed.
 *
 * Derived once at module init; at call time it's a plain function.
 *
 * @since 2.0.0
 * @category equality
 */
export const equals: (a: CBOR, b: CBOR) => boolean = Schema.equivalence(CBORSchema)

/**
 * Look up a CBOR key in a Map, falling back to content-based comparison
 * for complex keys (Uint8Array, Array, Tag) where Map.get uses reference
 * equality which fails when the map was rebuilt with new objects.
 */
const mapGetCBOR = (map: ReadonlyMap<CBOR, CBOR>, key: CBOR): CBOR | undefined => {
  const direct = map.get(key)
  if (direct !== undefined) return direct
  // Primitives (bigint, string, boolean, null, number) match by value equality
  // via Map.get; if that failed, the key genuinely doesn't exist
  if (typeof key !== "object" || key === null) return undefined
  for (const [k, v] of map) {
    if (equals(key, k)) return v
  }
  return undefined
}

const encodeMapSync = (value: ReadonlyMap<CBOR, CBOR>, options: CodecOptions, fmt?: CBORFormat): Uint8Array => {
  const mapFmt = fmt?._tag === "map" ? fmt : undefined
  // Use keyOrder from format to replay original insertion order, then append any new keys
  if (mapFmt?.keyOrder && mapFmt.keyOrder.length > 0) {
    const pairs: Array<[CBOR, CBOR]> = []
    const reorderedEntries: Array<readonly [CBORFormat, CBORFormat]> = []
    const decodedKeyOrderKeys: Array<CBOR> = []

    // First pass: replay surviving keyOrder keys
    for (let j = 0; j < mapFmt.keyOrder.length; j++) {
      const key = internalDecodeSync(mapFmt.keyOrder[j])
      decodedKeyOrderKeys.push(key)
      const mapped = mapGetCBOR(value, key)
      if (mapped !== undefined) {
        pairs.push([key, mapped])
        reorderedEntries.push(mapFmt.entries[j] ?? [{ _tag: "simple" }, { _tag: "simple" }])
      }
      // Key missing from map: simply skip (key was removed)
    }

    // Second pass: append new keys not covered by keyOrder
    for (const [key, val] of value) {
      if (!decodedKeyOrderKeys.some((k) => equals(key, k))) {
        pairs.push([key, val])
        reorderedEntries.push([{ _tag: "simple" }, { _tag: "simple" }])
      }
    }

    const orderedFmt: CBORFormat.Map = { ...mapFmt, entries: reorderedEntries }
    return encodeMapEntriesSync(pairs, options, orderedFmt)
  }
  return encodeMapEntriesSync(Array.from(value.entries()), options, fmt)
}

const encodeRecordSync = (value: { readonly [key: string | number]: CBOR }, options: CodecOptions, fmt?: CBORFormat): Uint8Array => {
  // Optimize by avoiding Object.entries() and map() allocation
  const mapEntries: Array<[CBOR, CBOR]> = []
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const val = value[key]
      const numKey = Number(key)
      if (Number.isInteger(numKey) && !Number.isNaN(numKey) && key === String(numKey)) {
        mapEntries.push([BigInt(numKey), val])
      } else {
        mapEntries.push([key, val])
      }
    }
  }
  return encodeMapEntriesSync(mapEntries, options, fmt)
}

const encodeTagSync = (tag: number, value: CBOR, options: CodecOptions, fmt?: CBORFormat): Uint8Array => {
  const tagFmt = fmt?._tag === "tag" ? fmt : undefined
  // Use specific ByteSize from format metadata (pass child format even when width is canonical)
  if (tagFmt !== undefined) {
    const header = tagFmt.width !== undefined
      ? encodeIntHeader(6, BigInt(tag), tagFmt.width)
      : (() => {
          const useMinimal = options.mode !== "custom" || options.useMinimalEncoding
          if (tag < 24) return new Uint8Array([0xc0 + tag])
          if (tag < 256 && useMinimal) return new Uint8Array([0xd8, tag & 0xff])
          if (tag < 65536 && useMinimal) return new Uint8Array([0xd9, (tag >> 8) & 0xff, tag & 0xff])
          throw new CBORError({ message: `Tag ${tag} too large` })
        })()
    const body = internalEncodeSync(value, options, tagFmt.child)
    const out = new Uint8Array(header.length + body.length)
    out.set(header, 0)
    out.set(body, header.length)
    return out
  }
  const useMinimal = options.mode !== "custom" || options.useMinimalEncoding
  let headerSize = 0
  let h0 = 0,
    h1 = 0,
    h2 = 0
  if (tag < 24) {
    headerSize = 1
    h0 = 0xc0 + tag
  } else if (tag < 256 && useMinimal) {
    headerSize = 2
    h0 = 0xd8
    h1 = tag & 0xff
  } else if (tag < 65536 && useMinimal) {
    headerSize = 3
    h0 = 0xd9
    h1 = (tag >> 8) & 0xff
    h2 = tag & 0xff
  } else {
    throw new CBORError({ message: `Tag ${tag} too large` })
  }
  const body = internalEncodeSync(value, options)
  const out = new Uint8Array(headerSize + body.length)
  let off = 0
  out[off++] = h0
  if (headerSize > 1) out[off++] = h1
  if (headerSize > 2) out[off++] = h2
  out.set(body, off)
  return out
}

// Pre-allocated arrays for common simple values
const SIMPLE_FALSE = new Uint8Array([0xf4])
const SIMPLE_TRUE = new Uint8Array([0xf5])
const SIMPLE_NULL = new Uint8Array([0xf6])
const SIMPLE_UNDEFINED = new Uint8Array([0xf7])

// Pre-allocated arrays for small common integers (0-23)
const SMALL_INTS = Array.from({ length: 24 }, (_, i) => new Uint8Array([i]))

const encodeSimpleSync = (value: boolean | null | undefined): Uint8Array => {
  if (value === false) return SIMPLE_FALSE
  if (value === true) return SIMPLE_TRUE
  if (value === null) return SIMPLE_NULL
  if (value === undefined) return SIMPLE_UNDEFINED
  throw new CBORError({ message: `Invalid simple value: ${value}` })
}

const encodeFloatSync = (value: number, options: CodecOptions): Uint8Array => {
  if (Number.isNaN(value)) {
    return new Uint8Array([0xf9, 0x7e, 0x00])
  } else if (value === Infinity) {
    return new Uint8Array([0xf9, 0x7c, 0x00])
  } else if (value === -Infinity) {
    return new Uint8Array([0xf9, 0xfc, 0x00])
  } else {
    if (options.mode === "canonical") {
      const half = encodeFloat16(value)
      if (decodeFloat16(half) === value) return new Uint8Array([0xf9, (half >> 8) & 0xff, half & 0xff])
      FLOAT32_VIEW.setFloat32(0, value, false)
      if (FLOAT32_VIEW.getFloat32(0, false) === value) {
        const out = new Uint8Array(1 + 4)
        out[0] = 0xfa
        out.set(FLOAT32_BYTES, 1)
        return out
      }
    }
    FLOAT64_VIEW.setFloat64(0, value, false)
    const out = new Uint8Array(1 + 8)
    out[0] = 0xfb
    out.set(FLOAT64_BYTES, 1)
    return out
  }
}

/**
 * Decode a single CBOR item at a given byte offset, returning the decoded value and the new offset.
 * Useful for extracting raw byte slices from CBOR-encoded data without re-encoding.
 *
 * @since 2.0.0
 * @category decoding
 */
export const decodeItemWithOffset = (
  data: Uint8Array,
  offset: number,
  options: CodecOptions = CML_DEFAULT_OPTIONS
): { item: CBOR; newOffset: number } => decodeItemAt(data, offset, options, "none")

// Decode (sync)
export const internalDecodeSync = (data: Uint8Array, options: CodecOptions = DEFAULT_OPTIONS): CBOR => {
  if (data.length === 0) throw new CBORError({ message: "Empty CBOR data" })
  const { item, newOffset } = decodeItemAt(data, 0, options, "none")
  if (newOffset !== data.length) {
    throw new CBORError({
      message: `Invalid CBOR: expected to consume ${data.length} bytes, but consumed ${newOffset}`
    })
  }
  return item
}

/**
 * Decode CBOR bytes and return both the decoded value and the root format tree.
 *
 * @since 2.0.0
 * @category parsing
 */
export const internalDecodeWithFormatSync = (
  data: Uint8Array
): DecodedWithFormat<CBOR> => {
  if (data.length === 0) throw new CBORError({ message: "Empty CBOR data" })
  const result = decodeItemAt(data, 0, DEFAULT_OPTIONS, "format")
  if (result.newOffset !== data.length) {
    throw new CBORError({
      message: `Invalid CBOR: expected to consume ${data.length} bytes, but consumed ${result.newOffset}`
    })
  }
  return {
    value: result.item,
    format: result.format!
  }
}

// Fast, offset-based decode helpers (no slicing or copying of input buffer)

/**
 * Controls what metadata `decodeItemAt` and its helpers track:
 * - "none"   — no metadata (canonical / cml / aiken paths, fastest)
 * - "format" — `CBORFormat` tagged union built directly (WithFormat path)
 */
type DecodeTrack = "none" | "format"

type DecodeAtResult<T = CBOR> = {
  item: T
  newOffset: number
  /** Populated only when track === "format" */
  format?: CBORFormat
}

/** Map CBOR additional info to ByteSize width: <24 → 0 (inline), 24 → 1, 25 → 2, 26 → 4, 27 → 8. */
const additionalInfoToByteSize = (ai: number): ByteSize => {
  if (ai < 24) return 0
  if (ai === 24) return 1
  if (ai === 25) return 2
  if (ai === 26) return 4
  return 8
}

/** Map decodeLengthAt bytesRead to ByteSize width: 1 → 0, 2 → 1, 3 → 2, 5 → 4. */
const bytesReadToByteSize = (bytesRead: number): ByteSize =>
  bytesRead <= 1 ? 0 : bytesRead === 2 ? 1 : bytesRead === 3 ? 2 : 4

const decodeItemAt = (data: Uint8Array, offset: number, options: CodecOptions, track: DecodeTrack): DecodeAtResult => {
  const firstByte = data[offset]
  const majorType = (firstByte >> 5) & 0x07
  let result: DecodeAtResult
  switch (majorType) {
    case CBOR_MAJOR_TYPE.UNSIGNED_INTEGER:
      result = decodeUintAt(data, offset, track)
      break
    case CBOR_MAJOR_TYPE.NEGATIVE_INTEGER:
      result = decodeNintAt(data, offset, track)
      break
    case CBOR_MAJOR_TYPE.BYTE_STRING:
      result = decodeBytesAt(data, offset, track)
      break
    case CBOR_MAJOR_TYPE.TEXT_STRING:
      result = decodeTextAt(data, offset, track)
      break
    case CBOR_MAJOR_TYPE.ARRAY:
      result = decodeArrayAt(data, offset, options, track)
      break
    case CBOR_MAJOR_TYPE.MAP:
      result = decodeMapAt(data, offset, options, track)
      break
    case CBOR_MAJOR_TYPE.TAG:
      result = decodeTagAt(data, offset, options, track)
      break
    case CBOR_MAJOR_TYPE.SIMPLE_FLOAT:
      result = decodeSimpleOrFloatAt(data, offset, track)
      break
    default:
      throw new CBORError({ message: `Unsupported major type: ${majorType}` })
  }
  // In format mode, simple/float values don't set result.format — fill the sentinel here.
  if (track === "format" && result.format === undefined) {
    result.format = { _tag: "simple" }
  }
  return result
}

const decodeUintAt = (data: Uint8Array, offset: number, track: DecodeTrack): DecodeAtResult => {
  const firstByte = data[offset]
  const additionalInfo = firstByte & 0x1f
  const bs = additionalInfoToByteSize(additionalInfo)
  let item: bigint
  let newOffset: number
  if (additionalInfo < 24) {
    item = BigInt(additionalInfo); newOffset = offset + 1
  } else if (additionalInfo === 24) {
    if (data.length < offset + 2) throw new CBORError({ message: "Insufficient data for 1-byte unsigned integer" })
    item = BigInt(data[offset + 1]); newOffset = offset + 2
  } else if (additionalInfo === 25) {
    if (data.length < offset + 3) throw new CBORError({ message: "Insufficient data for 2-byte unsigned integer" })
    item = BigInt(data[offset + 1]) * 256n + BigInt(data[offset + 2]); newOffset = offset + 3
  } else if (additionalInfo === 26) {
    if (data.length < offset + 5) throw new CBORError({ message: "Insufficient data for 4-byte unsigned integer" })
    item = BigInt(data[offset + 1]) * 16777216n + BigInt(data[offset + 2]) * 65536n +
           BigInt(data[offset + 3]) * 256n + BigInt(data[offset + 4]); newOffset = offset + 5
  } else if (additionalInfo === 27) {
    if (data.length < offset + 9) throw new CBORError({ message: "Insufficient data for 8-byte unsigned integer" })
    item = 0n
    for (let i = 1; i <= 8; i++) item = item * 256n + BigInt(data[offset + i])
    newOffset = offset + 9
  } else {
    throw new CBORError({ message: `Unsupported additional info for unsigned integer: ${additionalInfo}` })
  }
  if (track === "format") return { item, newOffset, format: bs === 0 ? { _tag: "uint" } : { _tag: "uint", byteSize: bs } }
  return { item, newOffset }
}

const decodeNintAt = (data: Uint8Array, offset: number, track: DecodeTrack): DecodeAtResult => {
  const firstByte = data[offset]
  const additionalInfo = firstByte & 0x1f
  const bs = additionalInfoToByteSize(additionalInfo)
  let item: bigint
  let newOffset: number
  if (additionalInfo < 24) {
    item = -1n - BigInt(additionalInfo); newOffset = offset + 1
  } else if (additionalInfo === 24) {
    if (data.length < offset + 2) throw new CBORError({ message: "Insufficient data for 1-byte negative integer" })
    item = -1n - BigInt(data[offset + 1]); newOffset = offset + 2
  } else if (additionalInfo === 25) {
    if (data.length < offset + 3) throw new CBORError({ message: "Insufficient data for 2-byte negative integer" })
    item = -1n - (BigInt(data[offset + 1]) * 256n + BigInt(data[offset + 2])); newOffset = offset + 3
  } else if (additionalInfo === 26) {
    if (data.length < offset + 5) throw new CBORError({ message: "Insufficient data for 4-byte negative integer" })
    const v = BigInt(data[offset + 1]) * 16777216n + BigInt(data[offset + 2]) * 65536n +
               BigInt(data[offset + 3]) * 256n + BigInt(data[offset + 4])
    item = -1n - v; newOffset = offset + 5
  } else if (additionalInfo === 27) {
    if (data.length < offset + 9) throw new CBORError({ message: "Insufficient data for 8-byte negative integer" })
    let v = 0n
    for (let i = 1; i <= 8; i++) v = v * 256n + BigInt(data[offset + i])
    item = -1n - v; newOffset = offset + 9
  } else {
    throw new CBORError({ message: `Unsupported additional info for negative integer: ${additionalInfo}` })
  }
  if (track === "format") return { item, newOffset, format: bs === 0 ? { _tag: "nint" } : { _tag: "nint", byteSize: bs } }
  return { item, newOffset }
}

const decodeLengthAt = (data: Uint8Array, offset: number): { length: number; bytesRead: number } => {
  const firstByte = data[offset]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo < 24) {
    return { length: additionalInfo, bytesRead: 1 }
  } else if (additionalInfo === 24) {
    if (data.length < offset + 2) throw new CBORError({ message: "Insufficient data for 1-byte length" })
    return { length: data[offset + 1], bytesRead: 2 }
  } else if (additionalInfo === 25) {
    if (data.length < offset + 3) throw new CBORError({ message: "Insufficient data for 2-byte length" })
    return { length: (data[offset + 1] << 8) | data[offset + 2], bytesRead: 3 }
  } else if (additionalInfo === 26) {
    if (data.length < offset + 5) throw new CBORError({ message: "Insufficient data for 4-byte length" })
    return {
      length: (data[offset + 1] << 24) | (data[offset + 2] << 16) | (data[offset + 3] << 8) | data[offset + 4],
      bytesRead: 5
    }
  }
  throw new CBORError({ message: `Unsupported length encoding: ${additionalInfo}` })
}

const decodeBytesAt = (data: Uint8Array, offset: number, track: DecodeTrack): DecodeAtResult => {
  const firstByte = data[offset]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo === CBOR_ADDITIONAL_INFO.INDEFINITE) {
    let cur = offset + 1
    const chunks: Array<Uint8Array> = []
    const chunkInfos: Array<{ readonly length: number; readonly byteSize: ByteSize }> = []
    let foundBreak = false
    while (cur < data.length) {
      const b = data[cur]
      if (b === 0xff) {
        cur += 1
        foundBreak = true
        break
      }
      const major = (b >> 5) & 0x07
      if (major !== CBOR_MAJOR_TYPE.BYTE_STRING) throw new CBORError({ message: "Expected byte string chunk" })
      const { bytesRead, length } = decodeLengthAt(data, cur)
      const start = cur + bytesRead
      const end = start + length
      if (end > data.length) throw new CBORError({ message: "Insufficient data for byte string chunk" })
      chunks.push(data.subarray(start, end))
      if (track !== "none") chunkInfos.push({ length, byteSize: bytesReadToByteSize(bytesRead) })
      cur = end
    }
    if (!foundBreak) {
      throw new CBORError({ message: "Indefinite byte string missing break byte (0xff)" })
    }
    let total = 0
    for (let i = 0; i < chunks.length; i++) total += chunks[i].length
    const out = new Uint8Array(total)
    let pos = 0
    for (const ch of chunks) { out.set(ch, pos); pos += ch.length }
    if (track === "none") return { item: out, newOffset: cur }
    const se: StringEncoding = { tag: "indefinite", chunks: chunkInfos }
    return { item: out, newOffset: cur, format: { _tag: "bytes", encoding: se } }
  } else {
    const { bytesRead, length } = decodeLengthAt(data, offset)
    const start = offset + bytesRead
    const end = start + length
    if (end > data.length) throw new CBORError({ message: "Insufficient data for byte string" })
    const item = data.subarray(start, end)
    if (track === "none") return { item, newOffset: end }
    const bs = bytesReadToByteSize(bytesRead)
    return { item, newOffset: end, format: bs === 0 ? { _tag: "bytes" } : { _tag: "bytes", encoding: { tag: "definite", byteSize: bs } } }
  }
}

const decodeTextAt = (data: Uint8Array, offset: number, track: DecodeTrack): DecodeAtResult => {
  const firstByte = data[offset]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo === CBOR_ADDITIONAL_INFO.INDEFINITE) {
    let cur = offset + 1
    const parts: Array<string> = []
    const chunkInfos: Array<{ readonly length: number; readonly byteSize: ByteSize }> = []
    let foundBreak = false
    while (cur < data.length) {
      const b = data[cur]
      if (b === 0xff) {
        cur += 1
        foundBreak = true
        break
      }
      const major = (b >> 5) & 0x07
      if (major !== CBOR_MAJOR_TYPE.TEXT_STRING) throw new CBORError({ message: "Expected text string chunk" })
      const { bytesRead, length } = decodeLengthAt(data, cur)
      const start = cur + bytesRead
      const end = start + length
      if (end > data.length) throw new CBORError({ message: "Insufficient data for text string chunk" })
      parts.push(TEXT_DECODER.decode(data.subarray(start, end)))
      if (track !== "none") chunkInfos.push({ length, byteSize: bytesReadToByteSize(bytesRead) })
      cur = end
    }
    if (!foundBreak) {
      throw new CBORError({ message: "Indefinite text string missing break byte (0xff)" })
    }
    const item = parts.join("")
    if (track === "none") return { item, newOffset: cur }
    const se: StringEncoding = { tag: "indefinite", chunks: chunkInfos }
    return { item, newOffset: cur, format: { _tag: "text", encoding: se } }
  } else {
    const { bytesRead, length } = decodeLengthAt(data, offset)
    const start = offset + bytesRead
    const end = start + length
    if (end > data.length) throw new CBORError({ message: "Insufficient data for text string" })
    const item = TEXT_DECODER.decode(data.subarray(start, end))
    if (track === "none") return { item, newOffset: end }
    const bs = bytesReadToByteSize(bytesRead)
    return { item, newOffset: end, format: bs === 0 ? { _tag: "text" } : { _tag: "text", encoding: { tag: "definite", byteSize: bs } } }
  }
}

const decodeArrayAt = (data: Uint8Array, offset: number, options: CodecOptions, track: DecodeTrack): DecodeAtResult => {
  const firstByte = data[offset]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo === CBOR_ADDITIONAL_INFO.INDEFINITE) {
    const arr: Array<CBOR> = []
    let cur = offset + 1
    let foundBreak = false
    if (track === "none") {
      while (cur < data.length) {
        if (data[cur] === 0xff) { cur += 1; foundBreak = true; break }
        const child = decodeItemAt(data, cur, options, "none")
        arr.push(child.item); cur = child.newOffset
      }
      if (!foundBreak) throw new CBORError({ message: "Indefinite array missing break byte (0xff)" })
      return { item: arr, newOffset: cur }
    }
    const childFormats: Array<CBORFormat> = []
    while (cur < data.length) {
      if (data[cur] === 0xff) { cur += 1; foundBreak = true; break }
      const child = decodeItemAt(data, cur, options, "format")
      arr.push(child.item); childFormats.push(child.format!); cur = child.newOffset
    }
    if (!foundBreak) throw new CBORError({ message: "Indefinite array missing break byte (0xff)" })
    return { item: arr, newOffset: cur, format: { _tag: "array", length: { tag: "indefinite" }, children: childFormats } }
  } else {
    const { bytesRead, length } = decodeLengthAt(data, offset)
    let cur = offset + bytesRead
    const arr: Array<CBOR> = new Array(length)
    if (track === "none") {
      for (let i = 0; i < length; i++) {
        const { item, newOffset } = decodeItemAt(data, cur, options, "none")
        arr[i] = item; cur = newOffset
      }
      return { item: arr, newOffset: cur }
    }
    const bs = bytesReadToByteSize(bytesRead)
    const le: LengthEncoding = { tag: "definite", byteSize: bs }
    const childFormats: Array<CBORFormat> = new Array(length)
    for (let i = 0; i < length; i++) {
      const child = decodeItemAt(data, cur, options, "format")
      arr[i] = child.item; childFormats[i] = child.format!; cur = child.newOffset
    }
    return { item: arr, newOffset: cur, format: { _tag: "array", ...(bs !== 0 ? { length: le } : {}), children: childFormats } }
  }
}

const decodeMapAt = (data: Uint8Array, offset: number, options: CodecOptions, track: DecodeTrack): DecodeAtResult => {
  const firstByte = data[offset]
  const additionalInfo = firstByte & 0x1f
  const isObj = options.mode === "custom" && options.mapsAsObjects
  if (additionalInfo === CBOR_ADDITIONAL_INFO.INDEFINITE) {
    const map = isObj ? ({} as Record<string, CBOR>) : new Map<CBOR, CBOR>()
    let cur = offset + 1
    let foundBreak = false
    if (track === "none") {
      while (cur < data.length) {
        if (data[cur] === 0xff) { cur += 1; foundBreak = true; break }
        const k = decodeItemAt(data, cur, options, "none"); cur = k.newOffset
        const v = decodeItemAt(data, cur, options, "none"); cur = v.newOffset
        if (map instanceof Map) map.set(k.item, v.item)
        else map[String(k.item as unknown)] = v.item
      }
      if (!foundBreak) throw new CBORError({ message: "Indefinite map missing break byte (0xff)" })
      return { item: map, newOffset: cur }
    }
    const keyOrderBytes: Array<Uint8Array> = []
    const entryFormats: Array<readonly [CBORFormat, CBORFormat]> = []
    while (cur < data.length) {
      if (data[cur] === 0xff) { cur += 1; foundBreak = true; break }
      const keyStart = cur
      const k = decodeItemAt(data, cur, options, "format"); cur = k.newOffset
      const v = decodeItemAt(data, cur, options, "format"); cur = v.newOffset
      keyOrderBytes.push(data.slice(keyStart, k.newOffset)); entryFormats.push([k.format!, v.format!])
      if (map instanceof Map) map.set(k.item, v.item)
      else map[String(k.item as unknown)] = v.item
    }
    if (!foundBreak) throw new CBORError({ message: "Indefinite map missing break byte (0xff)" })
    return { item: map, newOffset: cur, format: { _tag: "map", length: { tag: "indefinite" }, keyOrder: keyOrderBytes, entries: entryFormats } }
  } else {
    const { bytesRead, length } = decodeLengthAt(data, offset)
    let cur = offset + bytesRead
    const map = isObj ? ({} as Record<string, CBOR>) : new Map<CBOR, CBOR>()
    if (track === "none") {
      for (let i = 0; i < length; i++) {
        const k = decodeItemAt(data, cur, options, "none")
        cur = k.newOffset
        const v = decodeItemAt(data, cur, options, "none")
        cur = v.newOffset
        if (map instanceof Map) map.set(k.item, v.item)
        else map[String(k.item as unknown)] = v.item
      }
      return { item: map, newOffset: cur }
    }
    const bs = bytesReadToByteSize(bytesRead)
    const le: LengthEncoding = { tag: "definite", byteSize: bs }
    const keyOrderBytes: Array<Uint8Array> = new Array(length)
    const entryFormats: Array<readonly [CBORFormat, CBORFormat]> = new Array(length)
    for (let i = 0; i < length; i++) {
      const keyStart = cur
      const k = decodeItemAt(data, cur, options, "format")
      cur = k.newOffset
      const v = decodeItemAt(data, cur, options, "format")
      cur = v.newOffset
      keyOrderBytes[i] = data.slice(keyStart, k.newOffset)
      entryFormats[i] = [k.format!, v.format!]
      if (map instanceof Map) map.set(k.item, v.item)
      else map[String(k.item as unknown)] = v.item
    }
    return { item: map, newOffset: cur, format: { _tag: "map", ...(bs !== 0 ? { length: le } : {}), keyOrder: keyOrderBytes, entries: entryFormats } }
  }
}

const decodeTagAt = (data: Uint8Array, offset: number, options: CodecOptions, track: DecodeTrack): DecodeAtResult => {
  const firstByte = data[offset]
  const additionalInfo = firstByte & 0x1f
  let tagValue: number
  let cur = offset
  if (additionalInfo < 24) {
    tagValue = additionalInfo; cur += 1
  } else if (additionalInfo === 24) {
    if (data.length < offset + 2) throw new CBORError({ message: "Insufficient data for 1-byte tag" })
    tagValue = data[offset + 1]; cur += 2
  } else if (additionalInfo === 25) {
    if (data.length < offset + 3) throw new CBORError({ message: "Insufficient data for 2-byte tag" })
    tagValue = (data[offset + 1] << 8) | data[offset + 2]; cur += 3
  } else {
    throw new CBORError({ message: `Unsupported tag encoding: ${additionalInfo}` })
  }
  const inner = decodeItemAt(data, cur, options, track)
  cur = inner.newOffset
  const bs = additionalInfoToByteSize(additionalInfo)
  if (tagValue === 2 || tagValue === 3) {
    if (!(inner.item instanceof Uint8Array))
      throw new CBORError({ message: `Expected bytes for bigint tag ${tagValue}` })
    let n = 0n
    for (let i = 0; i < inner.item.length; i++) n = (n << 8n) | BigInt(inner.item[i])
    const item = tagValue === 2 ? n : -1n - n
    if (track === "none") return { item, newOffset: cur }
    return { item, newOffset: cur, format: { _tag: "tag", ...(bs !== 0 ? { width: bs } : {}), child: inner.format! } }
  }
  const item = { _tag: "Tag" as const, tag: tagValue, value: inner.item }
  if (track === "none") return { item, newOffset: cur }
  return { item, newOffset: cur, format: { _tag: "tag", ...(bs !== 0 ? { width: bs } : {}), child: inner.format! } }
}

const decodeSimpleOrFloatAt = (data: Uint8Array, offset: number, _track: DecodeTrack): DecodeAtResult => {
  const firstByte = data[offset]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo === CBOR_SIMPLE.FALSE) return { item: false, newOffset: offset + 1 }
  if (additionalInfo === CBOR_SIMPLE.TRUE) return { item: true, newOffset: offset + 1 }
  if (additionalInfo === CBOR_SIMPLE.NULL) return { item: null, newOffset: offset + 1 }
  if (additionalInfo === CBOR_SIMPLE.UNDEFINED) return { item: undefined, newOffset: offset + 1 }
  if (additionalInfo < 24) {
    // Unassigned simple values (0..19). Preserve as number for compatibility? Current sync path returned undefined.
    return { item: additionalInfo, newOffset: offset + 1 }
  }
  if (additionalInfo === CBOR_ADDITIONAL_INFO.DIRECT) {
    if (data.length < offset + 2) throw new CBORError({ message: "Insufficient data for 1-byte simple value" })
    return { item: data[offset + 1], newOffset: offset + 2 }
  }
  if (additionalInfo === CBOR_ADDITIONAL_INFO.UINT16) {
    if (data.length < offset + 3) throw new CBORError({ message: "Insufficient data for half-precision float" })
    const value = (data[offset + 1] << 8) | data[offset + 2]
    return { item: decodeFloat16(value), newOffset: offset + 3 }
  }
  if (additionalInfo === CBOR_ADDITIONAL_INFO.UINT32) {
    if (data.length < offset + 5) throw new CBORError({ message: "Insufficient data for single-precision float" })
    const view = new DataView(data.buffer, data.byteOffset + offset + 1, 4)
    return { item: view.getFloat32(0, false), newOffset: offset + 5 }
  }
  if (additionalInfo === CBOR_ADDITIONAL_INFO.UINT64) {
    if (data.length < offset + 9) throw new CBORError({ message: "Insufficient data for double-precision float" })
    const view = new DataView(data.buffer, data.byteOffset + offset + 1, 8)
    return { item: view.getFloat64(0, false), newOffset: offset + 9 }
  }
  throw new CBORError({ message: `Unsupported simple/float encoding: ${additionalInfo}` })
}

const decodeUintSync = (data: Uint8Array): CBOR => {
  const firstByte = data[0]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo < 24) {
    return BigInt(additionalInfo)
  } else if (additionalInfo === 24) {
    if (data.length < 2) throw new CBORError({ message: "Insufficient data for 1-byte unsigned integer" })
    return BigInt(data[1])
  } else if (additionalInfo === 25) {
    if (data.length < 3) throw new CBORError({ message: "Insufficient data for 2-byte unsigned integer" })
    return BigInt(data[1]) * 256n + BigInt(data[2])
  } else if (additionalInfo === 26) {
    if (data.length < 5) throw new CBORError({ message: "Insufficient data for 4-byte unsigned integer" })
    return BigInt(data[1]) * 16777216n + BigInt(data[2]) * 65536n + BigInt(data[3]) * 256n + BigInt(data[4])
  } else if (additionalInfo === 27) {
    if (data.length < 9) throw new CBORError({ message: "Insufficient data for 8-byte unsigned integer" })
    let result = 0n
    for (let i = 1; i <= 8; i++) result = result * 256n + BigInt(data[i])
    return result
  } else {
    throw new CBORError({ message: `Unsupported additional info for unsigned integer: ${additionalInfo}` })
  }
}

const decodeNintSync = (data: Uint8Array): CBOR => {
  const firstByte = data[0]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo < 24) {
    return -1n - BigInt(additionalInfo)
  } else if (additionalInfo === 24) {
    if (data.length < 2) throw new CBORError({ message: "Insufficient data for 1-byte negative integer" })
    return -1n - BigInt(data[1])
  } else if (additionalInfo === 25) {
    if (data.length < 3) throw new CBORError({ message: "Insufficient data for 2-byte negative integer" })
    return -1n - (BigInt(data[1]) * 256n + BigInt(data[2]))
  } else if (additionalInfo === 26) {
    if (data.length < 5) throw new CBORError({ message: "Insufficient data for 4-byte negative integer" })
    return -1n - (BigInt(data[1]) * 16777216n + BigInt(data[2]) * 65536n + BigInt(data[3]) * 256n + BigInt(data[4]))
  } else if (additionalInfo === 27) {
    if (data.length < 9) throw new CBORError({ message: "Insufficient data for 8-byte negative integer" })
    let result = 0n
    for (let i = 1; i <= 8; i++) result = result * 256n + BigInt(data[i])
    return -1n - result
  } else {
    throw new CBORError({ message: `Unsupported additional info for negative integer: ${additionalInfo}` })
  }
}

const decodeBytesWithLengthSync = (data: Uint8Array): { item: CBOR; bytesConsumed: number } => {
  const firstByte = data[0]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo === CBOR_ADDITIONAL_INFO.INDEFINITE) {
    let offset = 1
    const chunks: Array<Uint8Array> = []
    let foundBreak = false
    while (offset < data.length) {
      if (data[offset] === 0xff) {
        offset++
        foundBreak = true
        break
      }
      const chunkFirstByte = data[offset]
      const chunkMajorType = (chunkFirstByte >> 5) & 0x07
      if (chunkMajorType !== CBOR_MAJOR_TYPE.BYTE_STRING) {
        throw new CBORError({ message: `Invalid chunk in indefinite byte string: major type ${chunkMajorType}` })
      }
      const { bytesRead, length: chunkLength } = decodeLengthSync(data, offset)
      offset += bytesRead
      if (data.length < offset + chunkLength)
        throw new CBORError({ message: "Insufficient data for byte string chunk" })
      const chunk = data.slice(offset, offset + chunkLength)
      chunks.push(chunk)
      offset += chunkLength
    }
    if (!foundBreak) throw new CBORError({ message: "Missing break in indefinite-length byte string" })
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const bytes = new Uint8Array(totalLength)
    let pos = 0
    for (const chunk of chunks) {
      bytes.set(chunk, pos)
      pos += chunk.length
    }
    return { item: bytes, bytesConsumed: offset }
  } else {
    const { bytesRead, length } = decodeLengthSync(data, 0)
    if (data.length < bytesRead + length) throw new CBORError({ message: "Insufficient data for byte string" })
    const bytes = data.slice(bytesRead, bytesRead + length)
    return { item: bytes, bytesConsumed: bytesRead + length }
  }
}

const decodeTextWithLengthSync = (data: Uint8Array): { item: CBOR; bytesConsumed: number } => {
  const firstByte = data[0]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo === CBOR_ADDITIONAL_INFO.INDEFINITE) {
    let offset = 1
    const parts: Array<string> = []
    let foundBreak = false
    while (offset < data.length) {
      if (data[offset] === 0xff) {
        offset++
        foundBreak = true
        break
      }
      const chunkFirstByte = data[offset]
      const chunkMajorType = (chunkFirstByte >> 5) & 0x07
      if (chunkMajorType !== CBOR_MAJOR_TYPE.TEXT_STRING) {
        throw new CBORError({ message: `Invalid chunk in indefinite text string: major type ${chunkMajorType}` })
      }
      const { bytesRead, length: chunkLength } = decodeLengthSync(data, offset)
      offset += bytesRead
      if (data.length < offset + chunkLength)
        throw new CBORError({ message: "Insufficient data for text string chunk" })
      const chunkBytes = data.slice(offset, offset + chunkLength)
      const chunkText = TEXT_DECODER.decode(chunkBytes)
      parts.push(chunkText)
      offset += chunkLength
    }
    if (!foundBreak) throw new CBORError({ message: "Missing break in indefinite-length text string" })
    return { item: parts.join(""), bytesConsumed: offset }
  } else {
    const { bytesRead, length } = decodeLengthSync(data, 0)
    if (data.length < bytesRead + length) throw new CBORError({ message: "Insufficient data for text string" })
    const textBytes = data.slice(bytesRead, bytesRead + length)
    const text = TEXT_DECODER.decode(textBytes)
    return { item: text, bytesConsumed: bytesRead + length }
  }
}

// Decode an item and return both the item and bytes consumed (sync)
const decodeItemWithLengthSync = (data: Uint8Array, options: CodecOptions): { item: CBOR; bytesConsumed: number } => {
  const firstByte = data[0]
  const majorType = (firstByte >> 5) & 0x07
  let item: CBOR
  let bytesConsumed: number
  switch (majorType) {
    case CBOR_MAJOR_TYPE.UNSIGNED_INTEGER: {
      item = decodeUintSync(data)
      const additionalInfo = firstByte & 0x1f
      bytesConsumed =
        additionalInfo < 24 ? 1 : additionalInfo === 24 ? 2 : additionalInfo === 25 ? 3 : additionalInfo === 26 ? 5 : 9
      break
    }
    case CBOR_MAJOR_TYPE.NEGATIVE_INTEGER: {
      item = decodeNintSync(data)
      const additionalInfo = firstByte & 0x1f
      bytesConsumed =
        additionalInfo < 24 ? 1 : additionalInfo === 24 ? 2 : additionalInfo === 25 ? 3 : additionalInfo === 26 ? 5 : 9
      break
    }
    case CBOR_MAJOR_TYPE.BYTE_STRING: {
      const { bytesConsumed: b, item: it } = decodeBytesWithLengthSync(data)
      item = it
      bytesConsumed = b
      break
    }
    case CBOR_MAJOR_TYPE.TEXT_STRING: {
      const { bytesConsumed: b, item: it } = decodeTextWithLengthSync(data)
      item = it
      bytesConsumed = b
      break
    }
    case CBOR_MAJOR_TYPE.ARRAY: {
      const { bytesConsumed: b, item: it } = decodeArrayWithLengthSync(data, options)
      item = it
      bytesConsumed = b
      break
    }
    case CBOR_MAJOR_TYPE.MAP: {
      const { bytesConsumed: b, item: it } = decodeMapWithLengthSync(data, options)
      item = it
      bytesConsumed = b
      break
    }
    case CBOR_MAJOR_TYPE.TAG: {
      const { bytesConsumed: b, item: it } = decodeTagWithLengthSync(data, options)
      item = it
      bytesConsumed = b
      break
    }
    case CBOR_MAJOR_TYPE.SIMPLE_FLOAT: {
      item = decodeSimpleOrFloatSync(data)
      const additionalInfo = firstByte & 0x1f
      bytesConsumed =
        additionalInfo < 24 ? 1 : additionalInfo === 24 ? 2 : additionalInfo === 25 ? 3 : additionalInfo === 26 ? 5 : 9
      break
    }
    default:
      throw new CBORError({ message: `Unsupported major type: ${majorType}` })
  }
  return { item, bytesConsumed }
}

const decodeArrayWithLengthSync = (data: Uint8Array, options: CodecOptions): { item: CBOR; bytesConsumed: number } => {
  const firstByte = data[0]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo === CBOR_ADDITIONAL_INFO.INDEFINITE) {
    const result: Array<CBOR> = []
    let offset = 1
    while (offset < data.length) {
      if (data[offset] === 0xff) {
        offset++
        break
      }
      const { bytesConsumed, item } = decodeItemWithLengthSync(data.slice(offset), options)
      result.push(item)
      offset += bytesConsumed
    }
    return { item: result, bytesConsumed: offset }
  } else {
    const { bytesRead, length } = decodeLengthSync(data, 0)
    const result: Array<CBOR> = []
    let offset = bytesRead
    for (let i = 0; i < length; i++) {
      const { bytesConsumed, item } = decodeItemWithLengthSync(data.slice(offset), options)
      result.push(item)
      offset += bytesConsumed
    }
    return { item: result, bytesConsumed: offset }
  }
}

const decodeMapWithLengthSync = (data: Uint8Array, options: CodecOptions): { item: CBOR; bytesConsumed: number } => {
  const firstByte = data[0]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo === CBOR_ADDITIONAL_INFO.INDEFINITE) {
    const result =
      options.mode === "custom" && options.mapsAsObjects ? ({} as Record<string, CBOR>) : new Map<CBOR, CBOR>()
    let offset = 1
    while (offset < data.length) {
      if (data[offset] === 0xff) {
        offset++
        break
      }
      const { bytesConsumed: keyBytes, item: key } = decodeItemWithLengthSync(data.slice(offset), options)
      offset += keyBytes
      const { bytesConsumed: valueBytes, item: value } = decodeItemWithLengthSync(data.slice(offset), options)
      offset += valueBytes
      if (result instanceof Map) {
        result.set(key, value)
      } else {
        result[String(key as any)] = value
      }
    }
    return { item: result, bytesConsumed: offset }
  } else {
    const { bytesRead, length } = decodeLengthSync(data, 0)
    const result =
      options.mode === "custom" && options.mapsAsObjects ? ({} as Record<string, CBOR>) : new Map<CBOR, CBOR>()
    let offset = bytesRead
    for (let i = 0; i < length; i++) {
      const { bytesConsumed: keyBytes, item: key } = decodeItemWithLengthSync(data.slice(offset), options)
      offset += keyBytes
      const { bytesConsumed: valueBytes, item: value } = decodeItemWithLengthSync(data.slice(offset), options)
      offset += valueBytes
      if (result instanceof Map) {
        result.set(key, value)
      } else {
        result[String(key as any)] = value
      }
    }
    return { item: result, bytesConsumed: offset }
  }
}

const decodeTagWithLengthSync = (data: Uint8Array, options: CodecOptions): { item: CBOR; bytesConsumed: number } => {
  const firstByte = data[0]
  const additionalInfo = firstByte & 0x1f
  let tag: number
  let dataOffset: number
  if (additionalInfo < 24) {
    tag = additionalInfo
    dataOffset = 1
  } else if (additionalInfo === 24) {
    if (data.length < 2) throw new CBORError({ message: "Insufficient data for 1-byte tag" })
    tag = data[1]
    dataOffset = 2
  } else if (additionalInfo === 25) {
    if (data.length < 3) throw new CBORError({ message: "Insufficient data for 2-byte tag" })
    tag = data[1] * 256 + data[2]
    dataOffset = 3
  } else {
    throw new CBORError({ message: `Unsupported additional info for tag: ${additionalInfo}` })
  }
  const { bytesConsumed, item: innerValue } = decodeItemWithLengthSync(data.slice(dataOffset), options)
  if (tag === 2 || tag === 3) {
    if (!(innerValue instanceof Uint8Array)) throw new CBORError({ message: `Invalid value for bigint tag ${tag}` })
    const bigintValue = (() => {
      let result = 0n
      for (let i = 0; i < innerValue.length; i++) result = (result << 8n) + BigInt(innerValue[i])
      return tag === 2 ? result : -1n - result
    })()
    return { item: bigintValue, bytesConsumed: dataOffset + bytesConsumed }
  }
  return { item: { _tag: "Tag", tag, value: innerValue }, bytesConsumed: dataOffset + bytesConsumed }
}

const decodeSimpleOrFloatSync = (data: Uint8Array): CBOR => {
  const firstByte = data[0]
  const additionalInfo = firstByte & 0x1f
  if (additionalInfo < 20) {
    // Return unassigned simple values as numbers
    return additionalInfo
  } else if (additionalInfo === CBOR_SIMPLE.FALSE) {
    return false
  } else if (additionalInfo === CBOR_SIMPLE.TRUE) {
    return true
  } else if (additionalInfo === CBOR_SIMPLE.NULL) {
    return null
  } else if (additionalInfo === CBOR_SIMPLE.UNDEFINED) {
    return undefined
  } else if (additionalInfo === CBOR_ADDITIONAL_INFO.DIRECT) {
    if (data.length < 2) throw new CBORError({ message: "Insufficient data for simple value (one byte)" })
    const simpleValue = data[1]
    return simpleValue
  } else if (additionalInfo === CBOR_ADDITIONAL_INFO.UINT16) {
    if (data.length < 3) throw new CBORError({ message: "Insufficient data for half-precision float" })
    const value = (data[1] << 8) | data[2]
    const float = decodeFloat16(value)
    return float
  } else if (additionalInfo === CBOR_ADDITIONAL_INFO.UINT32) {
    if (data.length < 5) throw new CBORError({ message: "Insufficient data for single-precision float" })
    const buffer = data.slice(1, 5)
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    return view.getFloat32(0, false)
  } else if (additionalInfo === CBOR_ADDITIONAL_INFO.UINT64) {
    if (data.length < 9) throw new CBORError({ message: "Insufficient data for double-precision float" })
    const buffer = data.slice(1, 9)
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    return view.getFloat64(0, false)
  }
  throw new CBORError({ message: `Unsupported additional info for simple/float: ${additionalInfo}` })
}

const decodeLengthSync = (data: Uint8Array, offset: number): { length: number; bytesRead: number } => {
  const firstByte = data[offset]
  const majorType = (firstByte >> 5) & 0x07
  const additionalInfo = firstByte & 0x1f
  let length = 0
  let bytesRead = 0
  if (
    majorType !== CBOR_MAJOR_TYPE.BYTE_STRING &&
    majorType !== CBOR_MAJOR_TYPE.TEXT_STRING &&
    majorType !== CBOR_MAJOR_TYPE.ARRAY &&
    majorType !== CBOR_MAJOR_TYPE.MAP
  ) {
    throw new CBORError({ message: `Invalid major type for length decoding: ${majorType}` })
  }
  if (additionalInfo < 24) {
    length = additionalInfo
    bytesRead = 1
  } else if (additionalInfo === 24) {
    if (data.length < offset + 2) throw new CBORError({ message: "Insufficient data for 1-byte length" })
    length = data[offset + 1]
    bytesRead = 2
  } else if (additionalInfo === 25) {
    if (data.length < offset + 3) throw new CBORError({ message: "Insufficient data for 2-byte length" })
    length = data[offset + 1] * 256 + data[offset + 2]
    bytesRead = 3
  } else if (additionalInfo === 26) {
    if (data.length < offset + 5) throw new CBORError({ message: "Insufficient data for 4-byte length" })
    length = (data[offset + 1] << 24) | (data[offset + 2] << 16) | (data[offset + 3] << 8) | data[offset + 4]
    bytesRead = 5
  } else {
    throw new CBORError({ message: `Unsupported additional info for length: ${additionalInfo}` })
  }
  return { length, bytesRead }
}
