import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as CBOR from "./CBOR.js"

// Helper for array equality - Equal.equals compares arrays by instance, not content
const arrayEquals = <A>(a: ReadonlyArray<A>, b: ReadonlyArray<A>): boolean => {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!Equal.equals(a[i], b[i])) return false
  }
  return true
}

// Helper for array hashing - cannot use Hash.array for object arrays
const arrayHash = <A>(arr: ReadonlyArray<A>): number => {
  let hash = Hash.number(arr.length)
  for (const item of arr) {
    hash = Hash.combine(hash)(Hash.hash(item))
  }
  return hash
}

/**
 * Individual cost model for a specific Plutus language version.
 * Contains an array of cost parameters.
 *
 * ```
 * cost_model = [ * uint ]
 * ```
 */
export class CostModel extends Schema.Class<CostModel>("CostModel")({
  costs: Schema.Array(Schema.BigInt)
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    return {
      _tag: "CostModel",
      costs: this.costs
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
    return that instanceof CostModel && arrayEquals(this.costs, that.costs)
  }

  /**
   * Hash code generation.
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    return Hash.cached(this, arrayHash(this.costs))
  }
}

/**
 * Map of language versions to their corresponding cost models.
 *
 * ```
 *  cost_models = { * language => cost_model }
 * ```
 */
export class CostModels extends Schema.Class<CostModels>("CostModels")({
  PlutusV1: CostModel,
  PlutusV2: CostModel,
  PlutusV3: CostModel
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    return {
      _tag: "CostModels",
      PlutusV1: this.PlutusV1,
      PlutusV2: this.PlutusV2,
      PlutusV3: this.PlutusV3
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
      that instanceof CostModels &&
      Equal.equals(this.PlutusV1, that.PlutusV1) &&
      Equal.equals(this.PlutusV2, that.PlutusV2) &&
      Equal.equals(this.PlutusV3, that.PlutusV3)
    )
  }

  /**
   * Hash code generation.
   * Only hash PlutusV1 for performance - allows hash collisions to trigger full equality check
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.PlutusV1))
  }
}

export const CDDLSchema = Schema.MapFromSelf({
  key: CBOR.Integer,
  value: Schema.Array(Schema.BigIntFromSelf)
})

/**
 * CBOR encoding/decoding for CostModels using language tags as keys.
 * Only includes languages with non-empty cost arrays to match CML behavior.
 */
export const FromCDDL = Schema.transform(CDDLSchema, Schema.typeSchema(CostModels), {
  strict: true,
  encode: (costModels) => {
    // Always emit as Map: include only languages with non-empty arrays
    const out = new Map<bigint, ReadonlyArray<bigint>>()
    if (costModels.PlutusV1.costs.length > 0) out.set(0n, costModels.PlutusV1.costs)
    if (costModels.PlutusV2.costs.length > 0) out.set(1n, costModels.PlutusV2.costs)
    if (costModels.PlutusV3.costs.length > 0) out.set(2n, costModels.PlutusV3.costs)
    return out
  },
  decode: (encoded) => {
    const v1 = encoded.get(0n) as ReadonlyArray<bigint> | undefined
    const v2 = encoded.get(1n) as ReadonlyArray<bigint> | undefined
    const v3 = encoded.get(2n) as ReadonlyArray<bigint> | undefined
    const result = {
      PlutusV1: new CostModel({ costs: v1 ?? [] }),
      PlutusV2: new CostModel({ costs: v2 ?? [] }),
      PlutusV3: new CostModel({ costs: v3 ?? [] })
    }
    return new CostModels(result)
  }
})

/**
 * CBOR bytes transformation schema for CostModels.
 * Transforms between Uint8Array and CostModels using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → CostModels
  ).annotations({
    identifier: "CostModels.FromCBORBytes",
    title: "CostModels from CBOR Bytes",
    description: "Transforms CBOR bytes to CostModels"
  })

/**
 * CBOR hex transformation schema for CostModels.
 * Transforms between hex string and CostModels using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → CostModels
  ).annotations({
    identifier: "CostModels.FromCBORHex",
    title: "CostModels from CBOR Hex",
    description: "Transforms CBOR hex string to CostModels"
  })

/**
 * FastCheck arbitrary for CostModel instances.
 */
export const arbitrary: FastCheck.Arbitrary<CostModel> = FastCheck.array(
  FastCheck.bigInt({
    min: 0n,
    max: 1000n
  })
).map((costs) => new CostModel({ costs }))

/**
 * CBOR encoding for CostModels.
 */
export const toCBOR = (costModels: CostModels, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): Uint8Array =>
  Schema.encodeSync(FromCBORBytes(options))(costModels)

/**
 * CBOR decoding for CostModels.
 */
export const fromCBOR = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): CostModels =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * CBOR hex encoding for CostModels.
 */
export const toCBORHex = (costModels: CostModels, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): string =>
  Schema.encodeSync(FromCBORHex(options))(costModels)

/**
 * CBOR hex decoding for CostModels.
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): CostModels =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode cost models as language_views for script data hash.
 *
 *
 * ```
 *  { * language => script_integrity_data }
 *
 *  This must be encoded canonically, using the same scheme as in
 *  RFC7049 section 3.9:
 *   - Maps, strings, and bytestrings must use a definite-length encoding
 *   - Integers must be as small as possible.
 *   - The expressions for map length, string length, and bytestring length
 *     must be as short as possible.
 *   - The keys in the map must be sorted as follows:
 *      -  If two keys have different lengths, the shorter one sorts earlier.
 *      -  If two keys have the same length, the one with the lower value
 *         in (byte-wise) lexical order sorts earlier.
 *
 *  For PlutusV1 (language id 0), the language view is the following:
 *    - the value of cost_models map at key 0 (in other words, the script_integrity_data)
 *      is encoded as an indefinite length list and the result is encoded as a bytestring.
 *      (our apologies)
 *      For example, the script_integrity_data corresponding to the all zero costmodel for V1
 *      would be encoded as (in hex):
 *      58a89f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ff
 *    - the language ID tag is also encoded twice. first as a uint then as
 *      a bytestring. (our apologies)
 *      Concretely, this means that the language version for V1 is encoded as
 *      4100 in hex.
 *  For PlutusV2 (language id 1), the language view is the following:
 *    - the value of cost_models map at key 1 is encoded as an definite length list.
 *      For example, the script_integrity_data corresponding to the all zero costmodel for V2
 *      would be encoded as (in hex):
 *      98af0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
 *    - the language ID tag is encoded as expected.
 *      Concretely, this means that the language version for V2 is encoded as
 *      01 in hex.
 *  For PlutusV3 (language id 2), the language view is the following:
 *    - the value of cost_models map at key 2 is encoded as a definite length list.
 *
 *  Note that each Plutus language represented inside a transaction must have
 *  a cost model in the cost_models protocol parameter in order to execute,
 *  regardless of what the script integrity data is.
 * ```
 *
 * Returns the canonical CBOR encoding of the language views map.
 */
export const languageViewsEncoding = (costModels: CostModels): Uint8Array => {
  // Build a map of language ID -> cost model data
  // Only include cost models that have at least one cost (to match CML behavior)
  const languageData = new Map<number, ReadonlyArray<bigint>>()

  if (costModels.PlutusV1.costs.length > 0) languageData.set(0, costModels.PlutusV1.costs)
  if (costModels.PlutusV2.costs.length > 0) languageData.set(1, costModels.PlutusV2.costs)
  if (costModels.PlutusV3.costs.length > 0) languageData.set(2, costModels.PlutusV3.costs)

  // Create CBOR map with canonical ordering
  const mapEntries = new Map<CBOR.CBOR, CBOR.CBOR>()

  for (const [languageId, costs] of languageData.entries()) {
    if (languageId === 0) {
      // PlutusV1: Special indefinite length encoding due to cardano-node bug
      // Key: language ID (0) encoded as bytes [0x00]
      const v1KeyBytes = new Uint8Array([0])

      // Value: indefinite length array encoded as bytes
      // Cost values are passed directly - the CBOR encoder handles negative integers properly
      const costsArray: ReadonlyArray<CBOR.CBOR> = costs as ReadonlyArray<bigint>
      const indefiniteArrayCbor = CBOR.internalEncodeSync(
        costsArray,
        CBOR.CML_DATA_DEFAULT_OPTIONS // indefinite length
      )

      mapEntries.set(v1KeyBytes, indefiniteArrayCbor)
    } else {
      // PlutusV2/V3: Standard definite length encoding
      // Cost values are passed directly - the CBOR encoder handles negative integers properly
      const costsArray: ReadonlyArray<CBOR.CBOR> = costs as ReadonlyArray<bigint>

      mapEntries.set(BigInt(languageId), costsArray)
    }
  }

  // Encode as canonical CBOR map
  return CBOR.internalEncodeSync(mapEntries, CBOR.CML_DEFAULT_OPTIONS)
}
