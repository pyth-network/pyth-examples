import { FastCheck, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Numeric from "./Numeric.js"

/**
 * Encoded type for transaction metadata (wire format).
 * Based on CBOR encoding rules.
 *
 * @since 2.0.0
 * @category model
 */
export type TransactionMetadatumEncoded =
  // Text string
  | string
  // Int (encoded as string)
  | string
  // Bytes (encoded as hex string)
  | string
  // Map (encoded as array of [key, value] pairs)
  | ReadonlyArray<readonly [TransactionMetadatumEncoded, TransactionMetadatumEncoded]>
  // Array
  | ReadonlyArray<TransactionMetadatumEncoded>

/**
 * Transaction metadata type definition (runtime type).
 *
 * Transaction metadata supports text strings, integers, byte arrays, arrays, and maps.
 * Following CIP-10 standard metadata registry.
 *
 * @since 2.0.0
 * @category model
 */
export type TransactionMetadatum =
  // Text string
  | string
  // Integer (runtime as bigint)
  | bigint
  // Bytes (runtime as Uint8Array)
  | Uint8Array
  // Map (using standard Map)
  | globalThis.Map<TransactionMetadatum, TransactionMetadatum>
  // Array
  | ReadonlyArray<TransactionMetadatum>

/**
 * TransactionMetadatumMap type alias
 *
 * @since 2.0.0
 * @category model
 */
export type Map = globalThis.Map<TransactionMetadatum, TransactionMetadatum>

/**
 * TransactionMetadatumList type alias
 *
 * @since 2.0.0
 * @category model
 */
export type List = ReadonlyArray<TransactionMetadatum>

/**
 * Schema for TransactionMetadatum map type
 *
 * @category schemas
 * @since 2.0.0
 */
export const MapSchema = Schema.Map({
  key: Schema.suspend(
    (): Schema.Schema<TransactionMetadatum, TransactionMetadatumEncoded> => TransactionMetadatumSchema
  ).annotations({
    identifier: "TransactionMetadatum.Map.Key",
    title: "Map Key",
    description: "The key of the metadata map, must be a TransactionMetadatum type"
  }),
  value: Schema.suspend(
    (): Schema.Schema<TransactionMetadatum, TransactionMetadatumEncoded> => TransactionMetadatumSchema
  ).annotations({
    identifier: "TransactionMetadatum.Map.Value",
    title: "Map Value",
    description: "The value of the metadata map, must be a TransactionMetadatum type"
  })
}).annotations({
  identifier: "TransactionMetadatum.Map",
  title: "Metadata Map",
  description: "A map of TransactionMetadatum key-value pairs"
})

/**
 * Schema for TransactionMetadatum list type
 *
 * @category schemas
 * @since 2.0.0
 */
export const ListSchema = Schema.Array(
  Schema.suspend((): Schema.Schema<TransactionMetadatum, TransactionMetadatumEncoded> => TransactionMetadatumSchema)
).annotations({
  identifier: "TransactionMetadatum.List",
  title: "Metadata List",
  description: "An array of TransactionMetadatum values"
})

/**
 * Schema for TransactionMetadatum string type
 *
 * @category schemas
 * @since 2.0.0
 */
export const TextSchema = Schema.String.annotations({
  identifier: "TransactionMetadatum.Text",
  title: "Metadata Text",
  description: "A text string value in transaction metadata"
})

/**
 * Schema for TransactionMetadatum integer type
 *
 * @category schemas
 * @since 2.0.0
 */
export const IntSchema = Numeric.Int64.annotations({
  identifier: "TransactionMetadatum.Int",
  title: "Metadata Integer",
  description: "An integer value in transaction metadata (64-bit signed)"
})

/**
 * Schema for TransactionMetadatum bytes type
 *
 * @category schemas
 * @since 2.0.0
 */
export const BytesSchema = Schema.Uint8ArrayFromHex.annotations({
  identifier: "TransactionMetadatum.Bytes",
  title: "Metadata Bytes",
  description: "A byte array value in transaction metadata"
})

/**
 * Union schema for all types of transaction metadata.
 *
 * @since 2.0.0
 * @category schemas
 */
export const TransactionMetadatumSchema = Schema.Union(
  // Map: ReadonlyArray<[E, E]> <-> Map<T, T>
  MapSchema,

  // List: ReadonlyArray<E> <-> ReadonlyArray<T>
  ListSchema,

  // Int: string <-> bigint
  IntSchema,

  // Bytes: hex string <-> Uint8Array
  BytesSchema,

  // Text: string <-> string
  TextSchema
).annotations({
  identifier: "TransactionMetadatum",
  description: "Transaction metadata supporting text, integers, bytes, arrays, and maps"
})

// ============================================================================
// CBOR Functions
// ============================================================================

/**
 * Schema transformer for TransactionMetadatum from CBOR bytes.
 *
 * Uses Schema.typeSchema(TransactionMetadatumSchema) because CBOR.FromBytes
 * returns runtime types (bigint, Uint8Array, Map), not encoded types.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), Schema.typeSchema(TransactionMetadatumSchema)).annotations({
    identifier: "TransactionMetadatum.FromCBORBytes",
    description: "Transforms CBOR bytes to TransactionMetadatum"
  })

/**
 * Schema transformer for TransactionMetadatum from CBOR hex string.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(Schema.Uint8ArrayFromHex, FromCBORBytes(options)).annotations({
    identifier: "TransactionMetadatum.FromCBORHex",
    description: "Transforms CBOR hex string to TransactionMetadatum"
  })

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Schema-derived structural equality for TransactionMetadatum values.
 * Handles maps, lists, ints, bytes, and text via the
 * recursive TransactionMetadatumSchema definition — no hand-rolled comparison needed.
 *
 * @since 2.0.0
 * @category equality
 */
export const equals: (a: TransactionMetadatum, b: TransactionMetadatum) => boolean = Schema.equivalence(
  TransactionMetadatumSchema
)

/**
 * FastCheck arbitrary for generating random TransactionMetadatum instances.
 *
 * @since 2.0.0
 * @category testing
 */
const I64_MIN = -(1n << 63n)
const I64_MAX = (1n << 63n) - 1n
const int64Arbitrary = FastCheck.bigInt({ min: I64_MIN, max: I64_MAX })

export const arbitrary: FastCheck.Arbitrary<TransactionMetadatum> = FastCheck.oneof(
  FastCheck.string(),
  int64Arbitrary,
  FastCheck.uint8Array({ minLength: 1, maxLength: 64 }),
  FastCheck.array(FastCheck.oneof(FastCheck.string(), int64Arbitrary), { maxLength: 5 }),
  FastCheck.uniqueArray(FastCheck.tuple(FastCheck.string(), int64Arbitrary), {
    maxLength: 5,
    selector: ([key]) => key // Ensure unique keys
  }).map((entries) => new globalThis.Map(entries))
)

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a TransactionMetadatum from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse a TransactionMetadatum from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a TransactionMetadatum to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: TransactionMetadatum, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Convert a TransactionMetadatum to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: TransactionMetadatum, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a text TransactionMetadatum from a string value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const text = (value: string): string => value

/**
 * Create an integer TransactionMetadatum from a bigint value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const int = (value: bigint): bigint => value

/**
 * Create a bytes TransactionMetadatum from a Uint8Array value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const bytes = (value: Uint8Array): Uint8Array => value

/**
 * Create an array TransactionMetadatum from an array of TransactionMetadatum values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const array = (value: Array<TransactionMetadatum>): List => value

/**
 * Create a map TransactionMetadatum from a Map of TransactionMetadatum key-value pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const map = (value: globalThis.Map<TransactionMetadatum, TransactionMetadatum>): Map => value

/**
 * Create a map TransactionMetadatum from an array of key-value pair entries.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEntries = (entries: Array<[TransactionMetadatum, TransactionMetadatum]>): Map =>
  new globalThis.Map<TransactionMetadatum, TransactionMetadatum>(entries)
