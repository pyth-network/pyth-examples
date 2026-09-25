import { Either as E, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Metadata from "./Metadata.js"
import * as NativeScripts from "./NativeScripts.js"
import * as PlutusV1 from "./PlutusV1.js"
import * as PlutusV2 from "./PlutusV2.js"
import * as PlutusV3 from "./PlutusV3.js"
import * as TransactionMetadatum from "./TransactionMetadatum.js"

// ============================================================================
// Helper functions for Equal/Hash implementations
// ============================================================================

/**
 * Compare two optional arrays for equality using Equal.equals on elements
 */
const arrayEquals = <T>(x: ReadonlyArray<T> | undefined, y: ReadonlyArray<T> | undefined): boolean => {
  if (x === undefined && y === undefined) return true
  if (x === undefined || y === undefined) return false
  if (x.length !== y.length) return false
  for (let i = 0; i < x.length; i++) {
    if (!Equal.equals(x[i], y[i])) return false
  }
  return true
}

/**
 * Compare two optional metadata Maps for equality
 */
const metadataMapEquals = (x: Metadata.Metadata | undefined, y: Metadata.Metadata | undefined): boolean => {
  if (x === undefined && y === undefined) return true
  if (x === undefined || y === undefined) return false
  if (x.size !== y.size) return false
  for (const [key, value] of x) {
    if (!y.has(key)) return false
    if (!TransactionMetadatum.equals(value, y.get(key)!)) return false
  }
  return true
}

/**
 * Hash an optional metadata Map using only cheap operations.
 * Hashes size and keys (bigints) but NOT values (which may contain Uint8Array).
 * This ensures equal objects have equal hashes without expensive value hashing.
 */
const hashMetadataMap = (m: Metadata.Metadata | undefined): number => {
  if (!m) return Hash.hash(undefined)
  let h = Hash.hash(m.size)
  // Only hash bigint keys (cheap), not TransactionMetadatum values (expensive)
  const sortedKeys = Array.from(m.keys()).sort((a, b) => Number(a - b))
  for (const key of sortedKeys) {
    h = Hash.combine(h)(Hash.hash(key))
  }
  return h
}

/**
 * Hash an optional array by hashing each element
 */
const hashArray = <T>(arr: ReadonlyArray<T> | undefined): number => {
  if (!arr) return Hash.hash(undefined)
  let h = Hash.hash(arr.length)
  for (const item of arr) {
    h = Hash.combine(h)(Hash.hash(item))
  }
  return h
}

// ============================================================================
// AuxiliaryData Classes
// ============================================================================

/**
 * AuxiliaryData based on Conway CDDL specification.
 *
 * CDDL (Conway era):
 * ```
 * auxiliary_data = {
 *   ? 0 => metadata           ; transaction_metadata
 *   ? 1 => [* native_script]  ; native_scripts
 *   ? 2 => [* plutus_v1_script] ; plutus_v1_scripts
 *   ? 3 => [* plutus_v2_script] ; plutus_v2_scripts
 *   ? 4 => [* plutus_v3_script] ; plutus_v3_scripts
 * }
 * ```
 *
 * Uses map format with numeric keys as per Conway specification.
 *
 * @since 2.0.0
 * @category model
 */
export class ConwayAuxiliaryData extends Schema.TaggedClass<ConwayAuxiliaryData>("ConwayAuxiliaryData")(
  "ConwayAuxiliaryData",
  {
    metadata: Schema.optional(Schema.typeSchema(Metadata.Metadata)),
    nativeScripts: Schema.optional(Schema.Array(NativeScripts.NativeScript)),
    plutusV1Scripts: Schema.optional(Schema.Array(PlutusV1.PlutusV1)),
    plutusV2Scripts: Schema.optional(Schema.Array(PlutusV2.PlutusV2)),
    plutusV3Scripts: Schema.optional(Schema.Array(PlutusV3.PlutusV3))
  }
) {
  /**
   * @since 2.0.0
   * @category json
   */
  toJSON() {
    return {
      _tag: "ConwayAuxiliaryData" as const,
      metadata: this.metadata,
      nativeScripts: this.nativeScripts,
      plutusV1Scripts: this.plutusV1Scripts,
      plutusV2Scripts: this.plutusV2Scripts,
      plutusV3Scripts: this.plutusV3Scripts
    }
  }

  /**
   * @since 2.0.0
   * @category string
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * @since 2.0.0
   * @category inspect
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof ConwayAuxiliaryData)) return false
    return (
      metadataMapEquals(this.metadata, that.metadata) &&
      arrayEquals(this.nativeScripts, that.nativeScripts) &&
      arrayEquals(this.plutusV1Scripts, that.plutusV1Scripts) &&
      arrayEquals(this.plutusV2Scripts, that.plutusV2Scripts) &&
      arrayEquals(this.plutusV3Scripts, that.plutusV3Scripts)
    )
  }

  /**
   * @since 2.0.0
   * @category hash
   */
  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(
        Hash.combine(
          Hash.combine(Hash.combine(hashMetadataMap(this.metadata))(hashArray(this.nativeScripts)))(
            hashArray(this.plutusV1Scripts)
          )
        )(hashArray(this.plutusV2Scripts))
      )(hashArray(this.plutusV3Scripts))
    )
  }
}

/**
 * AuxiliaryData for ShelleyMA era (array format).
 *
 * CDDL (ShelleyMA era):
 * ```
 * auxiliary_data = [ metadata?, [* native_script]? ]
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class ShelleyMAAuxiliaryData extends Schema.TaggedClass<ShelleyMAAuxiliaryData>("ShelleyMAAuxiliaryData")(
  "ShelleyMAAuxiliaryData",
  {
    metadata: Schema.optional(Schema.typeSchema(Metadata.Metadata)),
    nativeScripts: Schema.optional(Schema.Array(NativeScripts.NativeScript))
  }
) {
  /**
   * @since 2.0.0
   * @category json
   */
  toJSON() {
    return { _tag: "ShelleyMAAuxiliaryData" as const, metadata: this.metadata, nativeScripts: this.nativeScripts }
  }

  /**
   * @since 2.0.0
   * @category string
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * @since 2.0.0
   * @category inspect
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof ShelleyMAAuxiliaryData)) return false
    return metadataMapEquals(this.metadata, that.metadata) && arrayEquals(this.nativeScripts, that.nativeScripts)
  }

  /**
   * @since 2.0.0
   * @category hash
   */
  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(hashMetadataMap(this.metadata))(hashArray(this.nativeScripts)))
  }
}

/**
 * AuxiliaryData for Shelley era (direct metadata).
 *
 * CDDL (Shelley era):
 * ```
 * auxiliary_data = metadata
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class ShelleyAuxiliaryData extends Schema.TaggedClass<ShelleyAuxiliaryData>("ShelleyAuxiliaryData")(
  "ShelleyAuxiliaryData",
  {
    metadata: Schema.typeSchema(Metadata.Metadata)
  }
) {
  /**
   * @since 2.0.0
   * @category json
   */
  toJSON() {
    return { _tag: "ShelleyAuxiliaryData" as const, metadata: this.metadata }
  }

  /**
   * @since 2.0.0
   * @category string
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * @since 2.0.0
   * @category inspect
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    if (!(that instanceof ShelleyAuxiliaryData)) return false
    return metadataMapEquals(this.metadata, that.metadata)
  }

  /**
   * @since 2.0.0
   * @category hash
   */
  [Hash.symbol](): number {
    return Hash.cached(this, hashMetadataMap(this.metadata))
  }
}

/**
 * Union of all AuxiliaryData era formats.
 *
 * @since 2.0.0
 * @category model
 */
export const AuxiliaryData = Schema.Union(ConwayAuxiliaryData, ShelleyMAAuxiliaryData, ShelleyAuxiliaryData)

/**
 * Type representing any AuxiliaryData format.
 *
 * @since 2.0.0
 * @category model
 */
export type AuxiliaryData = Schema.Schema.Type<typeof AuxiliaryData>

/**
 * Tagged CDDL schema for AuxiliaryData (#6.259 wrapping the struct).
 *
 * @since 2.0.0
 * @category schemas
 */
// Conway (current) CDDL form: tagged map with numeric keys
export const CDDLSchema = CBOR.tag(
  259,
  Schema.MapFromSelf({
    key: CBOR.Integer,
    value: CBOR.CBORSchema
  })
)

/**
 * Transform between tagged CDDL (tag 259) and AuxiliaryData class.
 *
 * @since 2.0.0
 * @category schemas
 */
// Union across eras:
// - Conway: tag(259, {0: metadata, 1: [native], 2: [v1], 3: [v2], 4: [v3]})
// - ShelleyMA: [ metadata?, [native_script]? ]
// - Shelley: metadata (map)
const AnyEraCDDL = Schema.Union(
  CDDLSchema,
  // ShelleyMA array form; we accept arbitrary CBOR array and validate within decode
  CBOR.ArraySchema,
  // Shelley map form (metadata only) - use Metadata CDDL schema
  Metadata.CDDLSchema
)

export const FromCDDL = Schema.transformOrFail(AnyEraCDDL, Schema.typeSchema(AuxiliaryData), {
  strict: true,
  encode: (auxData) =>
    E.gen(function* () {
      // Always encode as Conway format (tag 259) for compatibility
      switch (auxData._tag) {
        case "ConwayAuxiliaryData": {
          // const struct: Record<number, any> = {}
          const map = new globalThis.Map<bigint, CBOR.CBOR>()
          if (auxData.metadata !== undefined) {
            // Encode metadata through the schema which handles the transformation
            const encoded = yield* ParseResult.encodeEither(Metadata.FromCDDL)(auxData.metadata)
            map.set(0n, encoded as any)
          }
          if (auxData.nativeScripts !== undefined) {
            const scripts = []
            for (const s of auxData.nativeScripts) {
              scripts.push(yield* ParseResult.encodeEither(NativeScripts.FromCDDL)(s))
            }
            map.set(1n, scripts)
          }
          if (auxData.plutusV1Scripts !== undefined) {
            const scripts = []
            for (const s of auxData.plutusV1Scripts) {
              scripts.push(yield* ParseResult.encodeEither(PlutusV1.FromCDDL)(s))
            }
            map.set(2n, scripts)
          }
          if (auxData.plutusV2Scripts !== undefined) {
            const scripts = []
            for (const s of auxData.plutusV2Scripts) {
              scripts.push(yield* ParseResult.encodeEither(PlutusV2.FromCDDL)(s))
            }
            map.set(3n, scripts)
          }
          if (auxData.plutusV3Scripts !== undefined) {
            const scripts = []
            for (const s of auxData.plutusV3Scripts) {
              scripts.push(yield* ParseResult.encodeEither(PlutusV3.FromCDDL)(s))
            }
            map.set(4n, scripts)
          }
          return { value: map, tag: 259 as const, _tag: "Tag" as const }
        }
        case "ShelleyMAAuxiliaryData": {
          // Encode ShelleyMA strictly as a 2-element array [metadataMap, nativeScriptList]
          // Use empty map/array when values are absent to avoid CBOR specials and match CML decoding.
          const encodedMetadata: Map<bigint, CBOR.CBOR> =
            auxData.metadata !== undefined
              ? (new Map(yield* ParseResult.encodeEither(Metadata.FromCDDL)(auxData.metadata)) as any)
              : new Map()
          const encodedScripts: Array<CBOR.CBOR> = (() => {
            const list = auxData.nativeScripts ?? []
            const scripts: Array<CBOR.CBOR> = []
            for (const s of list) {
              scripts.push(ParseResult.encodeEither(NativeScripts.FromCDDL)(s).pipe(E.getOrThrow))
            }
            return scripts
          })()
          return [encodedMetadata, encodedScripts]
        }
        case "ShelleyAuxiliaryData": {
          // Encode Shelley era as plain metadata map (no tag)
          {
            const m = yield* ParseResult.encodeEither(Metadata.FromCDDL)(auxData.metadata)
            return new Map(m) as any
          }
        }
      }
    }),
  decode: (input) =>
    E.gen(function* () {
      // Conway tag(259)
      if (CBOR.isTag(input) && input.tag === 259) {
        const struct = input.value
        const meta = struct.get(0n)
        const metadata = meta ? yield* ParseResult.decodeEither(Metadata.FromCDDL)(meta as any) : undefined

        const nScripts = struct.get(1n)
        const nativeScripts = nScripts
          ? yield* ParseResult.decodeUnknownEither(Schema.Array(NativeScripts.FromCDDL))(nScripts)
          : undefined
        const rawPlutusV1 = struct.get(2n)
        const plutusV1Scripts = rawPlutusV1
          ? yield* ParseResult.decodeUnknownEither(Schema.Array(PlutusV1.FromCDDL))(rawPlutusV1)
          : undefined
        const rawPlutusV2 = struct.get(3n)
        const plutusV2Scripts = rawPlutusV2
          ? yield* ParseResult.decodeUnknownEither(Schema.Array(PlutusV2.FromCDDL))(rawPlutusV2)
          : undefined
        const rawPlutusV3 = struct.get(4n)
        const plutusV3Scripts = rawPlutusV3
          ? yield* ParseResult.decodeUnknownEither(Schema.Array(PlutusV3.FromCDDL))(rawPlutusV3)
          : undefined
        return new ConwayAuxiliaryData({
          metadata,
          nativeScripts,
          plutusV1Scripts,
          plutusV2Scripts,
          plutusV3Scripts
        })
      }

      // ShelleyMA array form: [ metadata?, native_scripts? ]
      if (Array.isArray(input)) {
        const arr = input
        let metadata: Metadata.Metadata | undefined
        let nativeScripts: Array<NativeScripts.NativeScript> | undefined

        if (arr.length >= 1 && arr[0] !== undefined) {
          const m = yield* ParseResult.decodeEither(Metadata.FromCDDL)(arr[0] as any)
          metadata = m.size === 0 ? undefined : m
        }
        if (arr.length >= 2 && arr[1] !== undefined) {
          const raw = arr[1] as ReadonlyArray<any>
          if (Array.isArray(raw) && raw.length === 0) {
            nativeScripts = undefined
          } else {
            nativeScripts = []
            for (const s of raw) {
              nativeScripts.push(yield* ParseResult.decodeEither(NativeScripts.FromCDDL)(s))
            }
          }
        }
        return new ShelleyMAAuxiliaryData({ metadata, nativeScripts })
      }

      // Shelley map form: metadata only
      if (input instanceof Map) {
        const metadata = yield* ParseResult.decodeEither(Metadata.FromCDDL)(input as any)
        return new ShelleyAuxiliaryData({ metadata })
      }

      // Fallback (should not happen due to Union) – treat as empty Conway
      return new ConwayAuxiliaryData({})
    })
}).annotations({
  identifier: "AuxiliaryData.FromCDDL",
  title: "AuxiliaryData from tagged CDDL",
  description: "Transforms CBOR tag 259 CDDL structure to AuxiliaryData"
})

/**
 * CBOR bytes transformation schema for AuxiliaryData.
 * Transforms between CBOR bytes and AuxiliaryData using CDDL format.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), FromCDDL).annotations({
    identifier: "AuxiliaryData.FromCBORBytes",
    title: "AuxiliaryData from CBOR bytes",
    description: "Decode AuxiliaryData from CBOR-encoded bytes (tag 259)"
  })

/**
 * CBOR hex transformation schema for AuxiliaryData.
 * Transforms between CBOR hex string and AuxiliaryData using CDDL format.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(Schema.Uint8ArrayFromHex, FromCBORBytes(options)).annotations({
    identifier: "AuxiliaryData.FromCBORHex",
    title: "AuxiliaryData from CBOR hex",
    description: "Decode AuxiliaryData from CBOR-encoded hex (tag 259)"
  })

/**
 * Create an empty Conway AuxiliaryData instance.
 *
 * @since 2.0.0
 * @category constructors
 */
export const emptyConwayAuxiliaryData = (): AuxiliaryData => new ConwayAuxiliaryData({})

/**
 * Backwards-friendly helper returning empty Conway-format auxiliary data.
 * Alias kept for ergonomics and CML-compat tests.
 */
export const empty = (): AuxiliaryData => new ConwayAuxiliaryData({})

/**
 * Create a Conway-era AuxiliaryData instance.
 *
 * @since 2.0.0
 * @category constructors
 */
export const conway = (input: {
  metadata?: Metadata.Metadata
  nativeScripts?: Array<NativeScripts.NativeScript>
  plutusV1Scripts?: Array<PlutusV1.PlutusV1>
  plutusV2Scripts?: Array<PlutusV2.PlutusV2>
  plutusV3Scripts?: Array<PlutusV3.PlutusV3>
}): AuxiliaryData => new ConwayAuxiliaryData({ ...input })

/**
 * Create a ShelleyMA-era AuxiliaryData instance.
 *
 * @since 2.0.0
 * @category constructors
 */
export const shelleyMA = (input: {
  metadata?: Metadata.Metadata
  nativeScripts?: Array<NativeScripts.NativeScript>
}): AuxiliaryData => new ShelleyMAAuxiliaryData({ ...input })

/**
 * Create a Shelley-era AuxiliaryData instance.
 *
 * @since 2.0.0
 * @category constructors
 */
export const shelley = (input: { metadata: Metadata.Metadata }): AuxiliaryData =>
  new ShelleyAuxiliaryData({ metadata: input.metadata })

/**
 * FastCheck arbitrary for generating Conway-era AuxiliaryData instances.
 * Conway era supports all features: metadata, native scripts, and all Plutus script versions.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const conwayArbitrary: FastCheck.Arbitrary<ConwayAuxiliaryData> = FastCheck.record({
  metadata: FastCheck.option(Metadata.arbitrary, { nil: undefined }),
  nativeScripts: FastCheck.option(FastCheck.array(NativeScripts.arbitrary, { maxLength: 3 }), { nil: undefined }),
  plutusV1Scripts: FastCheck.option(FastCheck.array(PlutusV1.arbitrary, { maxLength: 3 }), { nil: undefined }),
  plutusV2Scripts: FastCheck.option(FastCheck.array(PlutusV2.arbitrary, { maxLength: 3 }), { nil: undefined }),
  plutusV3Scripts: FastCheck.option(FastCheck.array(PlutusV3.arbitrary, { maxLength: 3 }), { nil: undefined })
}).map((r) => new ConwayAuxiliaryData(r))

export const shelleyMAArbitrary: FastCheck.Arbitrary<ShelleyMAAuxiliaryData> = FastCheck.record({
  metadata: FastCheck.option(Metadata.arbitrary, { nil: undefined }),
  nativeScripts: FastCheck.option(FastCheck.array(NativeScripts.arbitrary, { maxLength: 3 }), { nil: undefined })
})
  .filter((r) => {
    const hasMeta = r.metadata !== undefined
    // Disallow both undefined and scripts-only (since encoder omits scripts without metadata)
    return hasMeta
  })
  .map(
    (r) =>
      new ShelleyMAAuxiliaryData({
        metadata: r.metadata && r.metadata.size > 0 ? r.metadata : undefined,
        nativeScripts: r.nativeScripts && r.nativeScripts.length > 0 ? r.nativeScripts : undefined
      })
  )

export const shelleyArbitrary: FastCheck.Arbitrary<ShelleyAuxiliaryData> = Metadata.arbitrary.map(
  (metadata) => new ShelleyAuxiliaryData({ metadata })
)

/**
 * FastCheck arbitrary for generating random AuxiliaryData instances.
 * Generates all three era formats with equal probability.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<AuxiliaryData> = FastCheck.oneof(
  conwayArbitrary,
  shelleyMAArbitrary,
  shelleyArbitrary
)

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Decode AuxiliaryData from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Decode AuxiliaryData from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode AuxiliaryData to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: AuxiliaryData, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Encode AuxiliaryData to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: AuxiliaryData, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)
