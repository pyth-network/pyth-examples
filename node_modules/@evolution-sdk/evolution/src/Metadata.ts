import { FastCheck, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Numeric from "./Numeric.js"
import * as TransactionMetadatum from "./TransactionMetadatum.js"

/**
 * Type representing a transaction metadatum label (uint).
 *
 * @since 2.0.0
 * @category model
 */
export type MetadataLabel = typeof MetadataLabel.Type

/**
 * Schema for transaction metadatum label (uint64 per Cardano CDDL spec).
 * Labels must be in range 0 to 2^64-1.
 *
 * @since 2.0.0
 * @category schemas
 */
export const MetadataLabel = Numeric.Uint64Schema.annotations({
  identifier: "Metadata.MetadataLabel",
  description: "A transaction metadatum label (0 to 2^64-1)"
})

/**
 * Schema for transaction metadata (map from labels to metadata).
 * ```
 * Represents: metadata = {* transaction_metadatum_label => transaction_metadatum}
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const Metadata = Schema.Map({
  key: MetadataLabel,
  value: TransactionMetadatum.TransactionMetadatumSchema
}).annotations({
  identifier: "Metadata",
  description: "Transaction metadata as a map from labels to transaction metadata values"
})

export type Metadata = typeof Metadata.Type

/**
 * CDDL schema for Metadata (CBOR-compatible representation).
 * Maps bigint labels to transaction metadatum values.
 *
 * Uses Schema.typeSchema(TransactionMetadatumSchema) because CBOR decoding
 * returns runtime types (bigint, Uint8Array, Map) directly.
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = Schema.MapFromSelf({
  key: CBOR.Integer, // MetadataLabel as bigint
  value: Schema.suspend(() => Schema.typeSchema(TransactionMetadatum.TransactionMetadatumSchema))
})

/**
 * Transform schema from CDDL to Metadata.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(Metadata), {
  strict: true,
  encode: (metadata) => ParseResult.succeed(new Map(metadata)),
  decode: (cddl) => ParseResult.succeed(new Map(cddl) as Metadata)
}).annotations({
  identifier: "Metadata.FromCDDL",
  description: "Transforms CBOR structure to Metadata"
})

/**
 * Schema transformer for Metadata from CBOR bytes.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → Metadata
  ).annotations({
    identifier: "Metadata.FromCBORBytes",
    description: "Transforms CBOR bytes to Metadata"
  })

/**
 * Schema transformer for Metadata from CBOR hex string.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → Metadata
  ).annotations({
    identifier: "Metadata.FromCBORHex",
    description: "Transforms CBOR hex string to Metadata"
  })

/**
 * FastCheck arbitrary for generating random Metadata instances.
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary: FastCheck.Arbitrary<Metadata> = FastCheck.array(
  FastCheck.tuple(
    FastCheck.bigInt({ min: 0n, max: 255n }), // MetadataLabel (uint8)
    TransactionMetadatum.arbitrary
  ),
  { maxLength: 5 }
).map((entries) => fromEntries(entries))

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse Metadata from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(Schema.compose(CBOR.FromBytes(options), FromCDDL))

/**
 * Parse Metadata from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(Schema.compose(CBOR.FromHex(options), FromCBORBytes(options)))

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert Metadata to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))

/**
 * Convert Metadata to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create Metadata from an array of label-metadatum pairs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEntries = (entries: Array<[MetadataLabel, TransactionMetadatum.TransactionMetadatum]>): Metadata =>
  new Map(entries)

/**
 * Create an empty Metadata map.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty = (): Metadata => new Map() as Metadata

/**
 * Add or update a metadata entry.
 *
 * @since 2.0.0
 * @category constructors
 */
export const set = (
  metadata: Metadata,
  label: MetadataLabel,
  metadatum: TransactionMetadatum.TransactionMetadatum
): Metadata => {
  const newMap = new Map(metadata)
  newMap.set(label, metadatum)
  return newMap as Metadata
}

/**
 * Get a metadata entry by label.
 *
 * @since 2.0.0
 * @category utilities
 */
export const get = (metadata: Metadata, label: MetadataLabel): TransactionMetadatum.TransactionMetadatum | undefined =>
  metadata.get(label)

/**
 * Check if a label exists in the metadata.
 *
 * @since 2.0.0
 * @category utilities
 */
export const has = (metadata: Metadata, label: MetadataLabel): boolean => metadata.has(label)

/**
 * Remove a metadata entry by label.
 *
 * @since 2.0.0
 * @category constructors
 */
export const remove = (metadata: Metadata, label: MetadataLabel): Metadata => {
  const newMap = new Map(metadata)
  newMap.delete(label)
  return newMap as Metadata
}

/**
 * Get the size (number of entries) of the metadata.
 *
 * @since 2.0.0
 * @category utilities
 */
export const size = (metadata: Metadata): number => metadata.size

/**
 * Get all labels in the metadata.
 *
 * @since 2.0.0
 * @category utilities
 */
export const labels = (metadata: Metadata): Array<MetadataLabel> => Array.from(metadata.keys())

/**
 * Get all metadata values in the metadata.
 *
 * @since 2.0.0
 * @category utilities
 */
export const values = (metadata: Metadata): Array<TransactionMetadatum.TransactionMetadatum> =>
  Array.from(metadata.values())

/**
 * Get all entries in the metadata.
 *
 * @since 2.0.0
 * @category utilities
 */
export const entries = (metadata: Metadata): Array<[MetadataLabel, TransactionMetadatum.TransactionMetadatum]> =>
  Array.from(metadata.entries())
