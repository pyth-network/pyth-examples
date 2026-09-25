import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, Option, ParseResult, Schema } from "effect"

import * as AssetName from "./AssetName.js"
import * as CBOR from "./CBOR.js"
import * as Coin from "./Coin.js"
import * as MultiAsset from "./MultiAsset.js"
import * as PolicyId from "./PolicyId.js"
import * as PositiveCoin from "./PositiveCoin.js"

/**
 * Schema for Value representing both ADA and native assets.
 *
 * ```
 * value = coin / [coin, multiasset<positive_coin>]
 * ```
 *
 * This can be either:
 * 1. Just a coin amount (lovelace only)
 * 2. A tuple of [coin, multiasset] (lovelace + native assets)
 *
 * @since 2.0.0
 * @category schemas
 */
export class OnlyCoin extends Schema.TaggedClass<OnlyCoin>("OnlyCoin")("OnlyCoin", {
  coin: Coin.Coin
}) {
  toJSON() {
    return {
      _tag: this._tag,
      coin: this.coin
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof OnlyCoin && Equal.equals(this.coin, that.coin)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.coin))
  }
}

export class WithAssets extends Schema.TaggedClass<WithAssets>("WithAssets")("WithAssets", {
  coin: Coin.Coin,
  assets: MultiAsset.MultiAsset
}) {
  toJSON() {
    return {
      _tag: this._tag,
      coin: this.coin,
      assets: this.assets
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof WithAssets && Equal.equals(this.coin, that.coin) && Equal.equals(this.assets, that.assets)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.coin) ^ Hash.hash(this.assets))
  }
}

export const Value = Schema.Union(OnlyCoin, WithAssets)
export type Value = typeof Value.Type

/**
 * Create a Value containing only ADA.
 *
 * @since 2.0.0
 * @category constructors
 */
export const onlyCoin = (ada: Coin.Coin) => new OnlyCoin({ coin: ada })

/**
 * Create a Value containing ADA and native assets.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withAssets = (ada: Coin.Coin, assets: MultiAsset.MultiAsset) => new WithAssets({ coin: ada, assets })

/**
 * Extract the ADA amount from a Value.
 *
 * @since 2.0.0
 * @category transformation
 */
export const getAda = (value: Value): Coin.Coin => {
  return value.coin
}

/**
 * Extract the MultiAsset from a Value, if it exists.
 *
 * @since 2.0.0
 * @category transformation
 */
export const getAssets = (value: Value): Option.Option<MultiAsset.MultiAsset> => {
  if (value._tag === "OnlyCoin") {
    return Option.none()
  } else {
    return Option.some(value.assets)
  }
}

/**
 * Check if a Value contains only ADA (no native assets).
 *
 * @since 2.0.0
 * @category predicates
 */
export const isAdaOnly = (value: Value): value is OnlyCoin => value._tag === "OnlyCoin"

/**
 * Check if a Value contains native assets.
 *
 * @since 2.0.0
 * @category predicates
 */
export const hasAssets = (value: Value): value is WithAssets => value._tag === "WithAssets"

/**
 * Add two Values together.
 * Combines ADA amounts and merges MultiAssets.
 *
 * @since 2.0.0
 * @category transformation
 */
export const add = (a: Value, b: Value): Value => {
  const adaA = getAda(a)
  const adaB = getAda(b)
  const totalAda = Coin.add(adaA, adaB)

  const assetsA = getAssets(a)
  const assetsB = getAssets(b)

  if (Option.isNone(assetsA) && Option.isNone(assetsB)) {
    return onlyCoin(totalAda)
  }

  if (Option.isSome(assetsA) && Option.isNone(assetsB)) {
    return withAssets(totalAda, assetsA.value)
  }

  if (Option.isNone(assetsA) && Option.isSome(assetsB)) {
    return withAssets(totalAda, assetsB.value)
  }

  // Both have assets - merge them properly
  if (Option.isSome(assetsA) && Option.isSome(assetsB)) {
    const mergedAssets = MultiAsset.merge(assetsA.value, assetsB.value)
    return withAssets(totalAda, mergedAssets)
  }

  return onlyCoin(totalAda)
}

/**
 * Subtract Value b from Value a.
 * Subtracts ADA amounts and MultiAssets properly.
 *
 * @since 2.0.0
 * @category transformation
 */
export const subtract = (a: Value, b: Value): Value => {
  const adaA = getAda(a)
  const adaB = getAda(b)
  const resultAda = Coin.subtract(adaA, adaB)

  const assetsA = getAssets(a)
  const assetsB = getAssets(b)

  // Both are ADA-only
  if (Option.isNone(assetsA) && Option.isNone(assetsB)) {
    return onlyCoin(resultAda)
  }

  // a has assets, b doesn't - keep a's assets
  if (Option.isSome(assetsA) && Option.isNone(assetsB)) {
    return withAssets(resultAda, assetsA.value)
  }

  // a doesn't have assets, b does - this would result in negative assets, throw error
  if (Option.isNone(assetsA) && Option.isSome(assetsB)) {
    throw new Error("Cannot subtract assets from Value with no assets")
  }

  // Both have assets - subtract them properly
  if (Option.isSome(assetsA) && Option.isSome(assetsB)) {
    try {
      const subtractedAssets = MultiAsset.subtract(assetsA.value, assetsB.value)
      return withAssets(resultAda, subtractedAssets)
    } catch {
      // If subtraction results in empty MultiAsset, return ADA-only value
      return onlyCoin(resultAda)
    }
  }

  return onlyCoin(resultAda)
}

/**
 * Check if Value a is greater than or equal to Value b.
 * This means after subtracting b from a, the result would not be negative.
 *
 * @since 2.0.0
 * @category ordering
 */
export const geq = (a: Value, b: Value): boolean => {
  try {
    subtract(a, b)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a value is a valid Value.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = (value: unknown): value is Value => Schema.is(Value)(value)

/**
 * Generate a random Value.
 *
 * @since 2.0.0
 * @category generators
 */
export const arbitrary: FastCheck.Arbitrary<Value> = FastCheck.oneof(
  Coin.arbitrary.map((coin) => new OnlyCoin({ coin }, { disableValidation: true })),
  FastCheck.record({ assets: MultiAsset.arbitrary, coin: Coin.arbitrary }).map(
    ({ assets, coin }) => new WithAssets({ assets, coin }, { disableValidation: true })
  )
)

export const CDDLSchema = Schema.Union(
  CBOR.Integer,
  Schema.Tuple(
    CBOR.Integer,
    Schema.encodedSchema(
      MultiAsset.FromCDDL // MultiAsset CDDL structure
    )
  )
)

/**
 * CDDL schema for Value as union structure.
 *
 * ```
 * value = coin / [coin, multiasset<positive_coin>]
 * ```
 *
 * This represents either:
 * - A single coin amount (for ADA-only values)
 * - An array with [coin, multiasset] (for values with native assets)
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(Value), {
  strict: true,
  encode: (toI) =>
    Eff.gen(function* () {
      // expected encode result
      // readonly [bigint, readonly (readonly [Uint8Array<ArrayBufferLike>, readonly (readonly [Uint8Array<ArrayBufferLike>, bigint])[]])[]]
      if (toI._tag === "OnlyCoin") {
        // This is OnlyCoin, encode just the coin amount
        return toI.coin
      } else {
        // Value with assets (WithAssets)
        // Convert MultiAsset to raw Map data for CBOR encoding
        const outerMap = new Map<Uint8Array, Map<Uint8Array, bigint>>()

        for (const [policyId, assetMap] of toI.assets.map.entries()) {
          const policyIdBytes = yield* ParseResult.encode(PolicyId.FromBytes)(policyId)
          const innerMap = new Map<Uint8Array, bigint>()

          for (const [assetName, amount] of assetMap.entries()) {
            const assetNameBytes = yield* ParseResult.encode(AssetName.FromBytes)(assetName)
            innerMap.set(assetNameBytes, amount)
          }

          outerMap.set(policyIdBytes, innerMap)
        }

        return [toI.coin, outerMap] as const // Return as tuple
      }
    }),
  decode: (fromA) =>
    Eff.gen(function* () {
      if (typeof fromA === "bigint") {
        // ADA-only value - create OnlyCoin instance
        return new OnlyCoin({
          coin: yield* ParseResult.decodeUnknown(Schema.typeSchema(Coin.Coin))(fromA)
        })
      } else {
        // Value with assets [coin, multiasset]
        const [coinAmount, multiAssetCddl] = fromA

        // Convert from CDDL format to MultiAsset manually
        const result = new Map<PolicyId.PolicyId, MultiAsset.AssetMap>()

        for (const [policyIdBytes, assetMapCddl] of multiAssetCddl.entries()) {
          const policyId = yield* ParseResult.decode(PolicyId.FromBytes)(policyIdBytes)

          const assetMap = new Map<AssetName.AssetName, PositiveCoin.PositiveCoin>()
          for (const [assetNameBytes, amount] of assetMapCddl.entries()) {
            const assetName = yield* ParseResult.decode(AssetName.FromBytes)(assetNameBytes)
            const positiveCoin = yield* ParseResult.decodeUnknown(Schema.typeSchema(PositiveCoin.PositiveCoinSchema))(
              amount
            )
            assetMap.set(assetName, positiveCoin)
          }

          result.set(policyId, assetMap)
        }

        return new WithAssets({
          coin: yield* ParseResult.decodeUnknown(Schema.typeSchema(Coin.Coin))(coinAmount),
          assets: new MultiAsset.MultiAsset({ map: result })
        })
      }
    })
})

/**
 * TypeScript type for the raw CDDL representation.
 * This is what gets encoded/decoded to/from CBOR.
 *
 * @since 2.0.0
 * @category model
 */
export type ValueCDDL = typeof FromCDDL.Type

/**
 * CBOR bytes transformation schema for Value.
 * Transforms between CBOR bytes and Value using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → Value
  ).annotations({
    identifier: "Value.FromCBORBytes",
    title: "Value from CBOR Bytes",
    description: "Transforms CBOR bytes to Value"
  })

/**
 * CBOR hex transformation schema for Value.
 * Transforms between CBOR hex string and Value using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → Value
  ).annotations({
    identifier: "Value.FromCBORHex",
    title: "Value from CBOR Hex",
    description: "Transforms CBOR hex string to Value"
  })

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse Value from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse Value from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode Value to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: Value, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Encode Value to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: Value, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)
