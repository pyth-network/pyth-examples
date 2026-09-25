import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Data from "./Data.js"
import * as Redeemer from "./Redeemer.js"

// ============================================================================
// Shared helpers
// ============================================================================

const arrayEquals = <A>(a: ReadonlyArray<A>, b: ReadonlyArray<A>): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!Equal.equals(a[i], b[i])) return false
  }
  return true
}

const arrayHash = <A>(arr: ReadonlyArray<A>): number => {
  let hash = 0
  for (const item of arr) {
    hash = Hash.combine(hash)(Hash.hash(item))
  }
  return hash
}

// ============================================================================
// Map key type  
// ============================================================================

/**
 * A redeemer map key: `[tag, index]`.
 *
 * Mirrors the CDDL: `[tag : redeemer_tag, index : uint .size 4]`
 *
 * @since 2.0.0
 * @category model
 */
export type RedeemerKey = readonly [Redeemer.RedeemerTag, bigint]

/**
 * Create a string key from a RedeemerKey for lookup convenience.
 *
 * @since 2.0.0
 * @category utilities
 */
export const keyToString = ([tag, index]: RedeemerKey): string => `${tag}:${index}`

// ============================================================================
// Map entry value type
// ============================================================================

/**
 * A redeemer map entry value: `[data, ex_units]`.
 *
 * Mirrors the CDDL: `[data : plutus_data, ex_units : ex_units]`
 *
 * @since 2.0.0
 * @category model
 */
export class RedeemerValue extends Schema.Class<RedeemerValue>("RedeemerValue")({
  data: Schema.typeSchema(Data.DataSchema),
  exUnits: Redeemer.ExUnits
}) {
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof RedeemerValue && Data.equals(this.data, that.data) && Equal.equals(this.exUnits, that.exUnits)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.data))(Hash.hash(this.exUnits)))
  }
}

// ============================================================================
// Domain types — discriminated union (Credential pattern)
// ============================================================================

/**
 * Redeemers in map format (Conway recommended).
 *
 * Mirrors the CDDL exactly:
 * ```
 * { + [tag : redeemer_tag, index : uint .size 4] => [ data : plutus_data, ex_units : ex_units ] }
 * ```
 *
 * The map is keyed by `[tag, index]` tuples. Note: JS Map uses reference
 * equality for non-primitive keys, so lookups by tuple won't work — use
 * `get()` or `toArray()` helpers instead.
 *
 * @since 2.0.0
 * @category model
 */
export class RedeemerMap extends Schema.TaggedClass<RedeemerMap>()("RedeemerMap", {
  value: Schema.Map({
    key: Schema.Tuple(Redeemer.RedeemerTag, Schema.BigIntFromSelf),
    value: Schema.typeSchema(RedeemerValue)
  })
}) {
  /**
   * Look up a redeemer entry by tag and index.
   *
   * @since 2.0.0
   * @category accessors
   */
  get(tag: Redeemer.RedeemerTag, index: bigint): RedeemerValue | undefined {
    for (const [[t, i], v] of this.value) {
      if (t === tag && i === index) return v
    }
    return undefined
  }

  /**
   * Number of redeemer entries.
   *
   * @since 2.0.0
   * @category accessors
   */
  get size(): number {
    return this.value.size
  }

  /**
   * Convert to an array of `Redeemer` objects (convenience for consumers).
   *
   * @since 2.0.0
   * @category conversions
   */
  toArray(): ReadonlyArray<Redeemer.Redeemer> {
    const result: Array<Redeemer.Redeemer> = []
    for (const [[tag, index], { data, exUnits }] of this.value) {
      result.push(new Redeemer.Redeemer({ tag, index, data, exUnits }))
    }
    return result
  }

  toJSON() {
    return {
      _tag: "RedeemerMap" as const,
      entries: Array.from(this.value.entries()).map(([[tag, index], { data, exUnits }]) => ({
        key: { tag, index: index.toString() },
        value: { data, exUnits: exUnits.toJSON() }
      }))
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof RedeemerMap)) return false
    if (this.value.size !== that.value.size) return false
    // Order-insensitive: sort both by [tag, index] then compare Redeemer objects
    // (Redeemer is a TaggedClass with proper Equal support, unlike raw Data.Data)
    const sortKey = (r: Redeemer.Redeemer) => `${r.tag}:${r.index}`
    const sortedThis = [...this.toArray()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    const sortedThat = [...that.toArray()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    return arrayEquals(sortedThis, sortedThat)
  }

  [Hash.symbol](): number {
    // Order-insensitive: sort by key then hash the sorted array
    const sortKey = (r: Redeemer.Redeemer) => `${r.tag}:${r.index}`
    const sorted = [...this.toArray()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    return Hash.cached(this, arrayHash(sorted))
  }
}

/**
 * Create a `RedeemerMap` from an array of `Redeemer` objects.
 *
 * @since 2.0.0
 * @category constructors
 */
export const makeRedeemerMap = (redeemers: ReadonlyArray<Redeemer.Redeemer>): RedeemerMap => {
  const map = new Map<RedeemerKey, RedeemerValue>()
  for (const r of redeemers) {
    const key: RedeemerKey = [r.tag, r.index]
    // Detect semantic duplicates (same tag + index)
    for (const [existingKey] of map) {
      if (existingKey[0] === key[0] && existingKey[1] === key[1]) {
        throw new Error(`Duplicate redeemer key: [${key[0]}, ${key[1]}]`)
      }
    }
    map.set(key, new RedeemerValue({ data: r.data, exUnits: r.exUnits }))
  }
  return new RedeemerMap({ value: map })
}

/**
 * Redeemers in legacy array format.
 *
 * Mirrors the CDDL:
 * ```
 * [ + redeemer ]
 * ```
 *
 * Backwards compatible — will be deprecated in the next era.
 * Prefer `RedeemerMap` for new transactions.
 *
 * @since 2.0.0
 * @category model
 */
export class RedeemerArray extends Schema.TaggedClass<RedeemerArray>()("RedeemerArray", {
  value: Schema.Array(Redeemer.Redeemer)
}) {
  /**
   * Number of redeemer entries.
   *
   * @since 2.0.0
   * @category accessors
   */
  get size(): number {
    return this.value.length
  }

  /**
   * Convert to an array of `Redeemer` objects (identity for array format).
   *
   * @since 2.0.0
   * @category conversions
   */
  toArray(): ReadonlyArray<Redeemer.Redeemer> {
    return this.value
  }

  toJSON() {
    return {
      _tag: "RedeemerArray" as const,
      value: this.value.map((r) => r.toJSON())
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof RedeemerArray && arrayEquals(this.value, that.value)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, arrayHash(this.value))
  }
}

/**
 * Union schema for redeemers — accepts either map or array format.
 * Follows the Credential pattern: `Credential = Union(KeyHash, ScriptHash)`.
 *
 * @since 2.0.0
 * @category schemas
 */
export const Redeemers = Schema.Union(RedeemerMap, RedeemerArray)

/**
 * Union type: `RedeemerMap | RedeemerArray`
 *
 * @since 2.0.0
 * @category model
 */
export type Redeemers = typeof Redeemers.Type

// ============================================================================
// CDDL schemas — one per wire format
// ============================================================================

/**
 * CDDL schema for array format: `[ + redeemer ]`
 *
 * @since 2.0.0
 * @category schemas
 */
export const ArrayCDDLSchema = Schema.Array(Redeemer.CDDLSchema)

/**
 * CDDL transformation for array format → `RedeemerArray`.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromArrayCDDL = Schema.transformOrFail(ArrayCDDLSchema, Schema.typeSchema(RedeemerArray), {
  strict: true,
  encode: (toA) => Eff.all(toA.value.map((r) => ParseResult.encode(Redeemer.FromCDDL)(r))),
  decode: (fromA) =>
    Eff.gen(function* () {
      const value = yield* Eff.all(fromA.map((tuple) => ParseResult.decode(Redeemer.FromCDDL)(tuple)))
      return new RedeemerArray({ value })
    })
})

/**
 * Map key schema: `[tag, index]`
 *
 * @since 2.0.0
 * @category schemas
 */
const MapKeyCDDLSchema = Schema.Tuple(CBOR.Integer, CBOR.Integer)

/**
 * Map value schema: `[data, ex_units]`
 *
 * @since 2.0.0
 * @category schemas
 */
const MapValueCDDLSchema = Schema.Tuple(Data.CDDLSchema, Schema.Tuple(CBOR.Integer, CBOR.Integer))

/**
 * CDDL schema for map format: `{ + [tag, index] => [data, ex_units] }`
 *
 * Uses `MapFromSelf` (not `Map`) so the Encoded type is a JS Map — matching
 * how `CBOR.FromBytes` represents CBOR major-type-5 maps at runtime.
 * This is the same pattern used by Withdrawals, Mint, MultiAsset, CostModel.
 *
 * @since 2.0.0
 * @category schemas
 */
export const MapCDDLSchema = Schema.MapFromSelf({
  key: MapKeyCDDLSchema,
  value: MapValueCDDLSchema
})

/**
 * CDDL transformation for map format → `RedeemerMap`.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromMapCDDL = Schema.transformOrFail(MapCDDLSchema, Schema.typeSchema(RedeemerMap), {
  strict: true,
  encode: (toA) =>
    Eff.gen(function* () {
      const entries: Array<
        readonly [
          readonly [bigint, bigint],
          readonly [Schema.Schema.Type<typeof Data.CDDLSchema>, readonly [bigint, bigint]]
        ]
      > = []
      for (const [[tag, index], { data, exUnits }] of toA.value) {
        const tagInteger = Redeemer.tagToInteger(tag)
        const dataCBOR = yield* ParseResult.encode(Data.FromCDDL)(data)
        entries.push([
          [tagInteger, index],
          [dataCBOR, [exUnits.mem, exUnits.steps]]
        ])
      }
      return new Map(entries)
    }),
  decode: (fromA) =>
    Eff.gen(function* () {
      const entries: Array<readonly [RedeemerKey, RedeemerValue]> = []
      for (const [[tagInteger, index], [dataCBOR, [mem, steps]]] of fromA.entries()) {
        const tag = Redeemer.integerToTag(tagInteger)
        const data = yield* ParseResult.decode(Data.FromCDDL)(dataCBOR)
        entries.push([
          [tag, index] as const,
          new RedeemerValue({ data, exUnits: new Redeemer.ExUnits({ mem, steps }) })
        ])
      }
      return new RedeemerMap({ value: new Map(entries) })
    })
})

/**
 * Default CDDL schema (map format — Conway recommended).
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = MapCDDLSchema

/**
 * Default CDDL transformation (map format).
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = FromMapCDDL

// ============================================================================
// CBOR bytes / hex schemas
// ============================================================================

/**
 * CBOR bytes schema for array format.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), FromArrayCDDL).annotations({
    identifier: "Redeemers.FromCBORBytes",
    title: "Redeemers from CBOR Bytes (Array)",
    description: "Transforms CBOR bytes to RedeemerArray"
  })

/**
 * CBOR hex schema for array format.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(Schema.Uint8ArrayFromHex, FromCBORBytes(options)).annotations({
    identifier: "Redeemers.FromCBORHex",
    title: "Redeemers from CBOR Hex (Array)",
    description: "Transforms CBOR hex string to RedeemerArray"
  })

/**
 * CBOR bytes schema for map format.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytesMap = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), FromMapCDDL).annotations({
    identifier: "Redeemers.FromCBORBytesMap",
    title: "Redeemers from CBOR Bytes (Map)",
    description: "Transforms CBOR bytes to RedeemerMap"
  })

/**
 * CBOR hex schema for map format.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHexMap = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(Schema.Uint8ArrayFromHex, FromCBORBytesMap(options)).annotations({
    identifier: "Redeemers.FromCBORHexMap",
    title: "Redeemers from CBOR Hex (Map)",
    description: "Transforms CBOR hex string to RedeemerMap"
  })

// ============================================================================
// Arbitrary
// ============================================================================

/**
 * FastCheck arbitrary for Redeemers — generates both map and array variants.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<Redeemers> = FastCheck.array(Redeemer.arbitrary, { maxLength: 5 }).chain(
  (redeemers) =>
    FastCheck.constantFrom<Redeemers>(makeRedeemerMap(redeemers), new RedeemerArray({ value: redeemers }))
)

// ============================================================================
// Convenience parse / encode functions
// ============================================================================

/**
 * Parse from CBOR bytes (array format).
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse from CBOR hex string (array format).
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Parse from CBOR bytes (map format).
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytesMap = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytesMap(options))(bytes)

/**
 * Parse from CBOR hex string (map format).
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHexMap = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHexMap(options))(hex)

/**
 * Encode to CBOR bytes (array format).
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: RedeemerArray, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Encode to CBOR hex string (array format).
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: RedeemerArray, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

/**
 * Encode to CBOR bytes (map format).
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytesMap = (data: RedeemerMap, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytesMap(options))(data)

/**
 * Encode to CBOR hex string (map format).
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHexMap = (data: RedeemerMap, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHexMap(options))(data)
