import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as AssetName from "./AssetName.js"
import * as Bytes from "./Bytes.js"
import * as CBOR from "./CBOR.js"
import * as _Codec from "./Codec.js"
import * as NonZeroInt64 from "./NonZeroInt64.js"
import * as PolicyId from "./PolicyId.js"

/**
 * Helper function for content-based Map equality using Equal.equals.
 * Compares two Maps by iterating entries and using Equal.equals for both keys and values.
 *
 * @since 2.0.0
 * @category equality
 */
const mapEquals = <K, V>(a: Map<K, V>, b: Map<K, V>): boolean => {
  if (a.size !== b.size) return false

  for (const [aKey, aValue] of a.entries()) {
    let found = false
    for (const [bKey, bValue] of b.entries()) {
      if (Equal.equals(aKey, bKey)) {
        if (aValue instanceof Map && bValue instanceof Map) {
          if (!mapEquals(aValue, bValue)) return false
        } else {
          if (!Equal.equals(aValue, bValue)) return false
        }
        found = true
        break
      }
    }
    if (!found) return false
  }

  return true
}

/**
 * Helper function for content-based Map hashing.
 * Computes hash by XORing hashes of all entries for order-independence.
 *
 * @since 2.0.0
 * @category hashing
 */
const mapHash = <K, V>(map: Map<K, V>): number => {
  let hash = Hash.hash(map.size)
  for (const [key, value] of map.entries()) {
    hash ^= Hash.hash(key) ^ Hash.hash(value)
  }
  return hash
}

/**
 * Schema for inner asset map
 * ```
 * (asset_name => nonZeroInt64).
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const AssetMap = Schema.Map({
  key: AssetName.AssetName,
  value: NonZeroInt64.NonZeroInt64
}).annotations({
  identifier: "Mint.AssetMap"
})

export type AssetMap = typeof AssetMap.Type

/**
 * Schema for Mint representing token minting/burning operations.
 * ```
 * mint = multiasset<nonZeroInt64>
 *
 * The structure is: policy_id => { asset_name => nonZeroInt64 }
 * - Positive values represent minting
 * - Negative values represent burning
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class Mint extends Schema.Class<Mint>("Mint")({
  map: Schema.Map({
    key: PolicyId.PolicyId,
    value: AssetMap
  })
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    const serializedMap: Record<string, Record<string, string>> = {}
    for (const [policyId, assetMap] of this.map.entries()) {
      const serializedAssets: Record<string, string> = {}
      for (const [assetName, quantity] of assetMap.entries()) {
        serializedAssets[assetName.toString()] = quantity.toString()
      }
      serializedMap[policyId.toString()] = serializedAssets
    }
    return {
      _tag: "Mint",
      map: serializedMap
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
    return that instanceof Mint && mapEquals(this.map, that.map)
  }

  /**
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    let hash = Hash.hash(this.map.size)
    for (const [policyId, assetMap] of this.map.entries()) {
      const policyHash = Hash.hash(policyId)
      const assetMapHash = mapHash(assetMap)
      hash ^= policyHash ^ assetMapHash
    }
    return Hash.cached(this, hash)
  }
}

/**
 * Check if a value is a valid Mint.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = Schema.is(Mint)

/**
 * Create empty Mint.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty = (): Mint => new Mint({ map: new Map<PolicyId.PolicyId, AssetMap>() })

/**
 * Create Mint from a single policy and asset entry.
 *
 * @since 2.0.0
 * @category constructors
 */
export const singleton = (
  policyId: PolicyId.PolicyId,
  assetName: AssetName.AssetName,
  amount: NonZeroInt64.NonZeroInt64
): Mint => {
  const assetMap = new Map([[assetName, amount]])
  return new Mint({ map: new Map([[policyId, assetMap]]) })
}

/**
 * Create Mint from entries array.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromEntries = (
  entries: Array<[PolicyId.PolicyId, Array<[AssetName.AssetName, NonZeroInt64.NonZeroInt64]>]>
): Mint => {
  const innerMap = new Map(entries.map(([policyId, assetEntries]) => [policyId, new Map(assetEntries)]))
  return new Mint({ map: innerMap })
}

/**
 * Add or update an asset in the Mint.
 * Uses content-based equality (Equal.equals) to find matching PolicyId and AssetName
 * since JavaScript Maps use reference equality by default.
 *
 * @since 2.0.0
 * @category transformation
 */
export const insert = (
  mint: Mint,
  policyId: PolicyId.PolicyId,
  assetName: AssetName.AssetName,
  amount: NonZeroInt64.NonZeroInt64
): Mint => {
  // Find existing policy by content equality
  let existingPolicyKey: PolicyId.PolicyId | undefined
  let existingAssetMap: Map<AssetName.AssetName, NonZeroInt64.NonZeroInt64> | undefined

  for (const [key, value] of mint.map.entries()) {
    if (Equal.equals(key, policyId)) {
      existingPolicyKey = key
      existingAssetMap = value
      break
    }
  }

  // Build the new asset map for this policy
  let assetMap: Map<AssetName.AssetName, NonZeroInt64.NonZeroInt64>

  if (existingAssetMap !== undefined) {
    // Find existing asset by content equality
    let existingAssetKey: AssetName.AssetName | undefined
    for (const key of existingAssetMap.keys()) {
      if (Equal.equals(key, assetName)) {
        existingAssetKey = key
        break
      }
    }

    assetMap = new Map(existingAssetMap)
    // Remove old key if exists (to ensure we use the new key reference)
    if (existingAssetKey !== undefined) {
      assetMap.delete(existingAssetKey)
    }
    assetMap.set(assetName, amount)
  } else {
    assetMap = new Map([[assetName, amount]])
  }

  // Build result map, replacing existing policy entry if found
  const result = new Map(mint.map)
  if (existingPolicyKey !== undefined) {
    result.delete(existingPolicyKey)
  }
  result.set(policyId, assetMap)
  return new Mint({ map: result })
}

/**
 * Remove a policy from the Mint.
 * Uses content-based equality (Equal.equals) to find matching PolicyId.
 *
 * @since 2.0.0
 * @category transformation
 */
export const removePolicy = (mint: Mint, policyId: PolicyId.PolicyId): Mint => {
  // Find existing policy by content equality
  let existingPolicyKey: PolicyId.PolicyId | undefined
  for (const key of mint.map.keys()) {
    if (Equal.equals(key, policyId)) {
      existingPolicyKey = key
      break
    }
  }

  if (existingPolicyKey === undefined) {
    return mint // Policy not found, nothing to remove
  }

  const result = new Map(mint.map)
  result.delete(existingPolicyKey)
  return new Mint({ map: result })
}

/**
 * Remove an asset from the Mint.
 * Uses content-based equality (Equal.equals) to find matching PolicyId and AssetName.
 *
 * @since 2.0.0
 * @category transformation
 */
export const removeAsset = (mint: Mint, policyId: PolicyId.PolicyId, assetName: AssetName.AssetName): Mint => {
  // Find existing policy by content equality
  let existingPolicyKey: PolicyId.PolicyId | undefined
  let existingAssetMap: Map<AssetName.AssetName, NonZeroInt64.NonZeroInt64> | undefined

  for (const [key, value] of mint.map.entries()) {
    if (Equal.equals(key, policyId)) {
      existingPolicyKey = key
      existingAssetMap = value
      break
    }
  }

  if (existingAssetMap === undefined || existingPolicyKey === undefined) {
    return mint // No assets for this policy, nothing to remove
  }

  // Find existing asset by content equality
  let existingAssetKey: AssetName.AssetName | undefined
  for (const key of existingAssetMap.keys()) {
    if (Equal.equals(key, assetName)) {
      existingAssetKey = key
      break
    }
  }

  if (existingAssetKey === undefined) {
    return mint // Asset not found, nothing to remove
  }

  const updatedAssets = new Map(existingAssetMap)
  updatedAssets.delete(existingAssetKey)

  if (updatedAssets.size === 0) {
    // If no assets left, remove the policyId entry
    const result = new Map(mint.map)
    result.delete(existingPolicyKey)
    return new Mint({ map: result })
  }

  const result = new Map(mint.map)
  result.delete(existingPolicyKey)
  result.set(existingPolicyKey, updatedAssets)
  return new Mint({ map: result })
}

/**
 * Get the amount for a specific policy and asset.
 * Uses content-based equality (Equal.equals) to find matching PolicyId and AssetName.
 *
 * @since 2.0.0
 * @category transformation
 */
export const get = (mint: Mint, policyId: PolicyId.PolicyId, assetName: AssetName.AssetName) => {
  // Find policy by content equality
  let existingAssetMap: Map<AssetName.AssetName, NonZeroInt64.NonZeroInt64> | undefined

  for (const [key, value] of mint.map.entries()) {
    if (Equal.equals(key, policyId)) {
      existingAssetMap = value
      break
    }
  }

  if (existingAssetMap === undefined) {
    return undefined
  }

  // Find asset by content equality
  for (const [key, value] of existingAssetMap.entries()) {
    if (Equal.equals(key, assetName)) {
      return value
    }
  }

  return undefined
}

/**
 * Check if Mint contains a specific policy and asset.
 *
 * @since 2.0.0
 * @category predicates
 */
export const has = (mint: Mint, policyId: PolicyId.PolicyId, assetName: AssetName.AssetName): boolean =>
  get(mint, policyId, assetName) !== undefined

/**
 * Get an asset amount by policy ID hex and asset name hex strings.
 * Convenience function for tests and lookups using hex strings.
 *
 * @since 2.0.0
 * @category lookup
 */
export const getByHex = (
  mint: Mint,
  policyIdHex: string,
  assetNameHex: string
): NonZeroInt64.NonZeroInt64 | undefined => {
  const policyId = PolicyId.fromHex(policyIdHex)
  const assetName = AssetName.fromHex(assetNameHex)
  return get(mint, policyId, assetName)
}

/**
 * Get the asset map for a specific policy by hex string.
 * Uses content-based equality (Equal.equals) to find matching PolicyId.
 *
 * @since 2.0.0
 * @category lookup
 */
export const getAssetsByPolicyHex = (
  mint: Mint,
  policyIdHex: string
): Map<AssetName.AssetName, NonZeroInt64.NonZeroInt64> | undefined => {
  const policyId = PolicyId.fromHex(policyIdHex)

  for (const [key, value] of mint.map.entries()) {
    if (Equal.equals(key, policyId)) {
      return value
    }
  }

  return undefined
}

/**
 * Check if Mint is empty.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isEmpty = (mint: Mint): boolean => mint.map.size === 0

/**
 * Get the number of policies in the Mint.
 *
 * @since 2.0.0
 * @category transformation
 */
export const policyCount = (mint: Mint): number => mint.map.size

export const CDDLSchema = Schema.MapFromSelf({
  key: CBOR.ByteArray, // Policy ID as 28-byte Uint8Array
  value: Schema.MapFromSelf({
    key: CBOR.ByteArray, // Asset name as Uint8Array (variable length)
    value: CBOR.Integer // Amount as nonZeroInt64
  })
})

/**
 * CDDL schema for Mint as map structure.
 * ```
 * mint = {* policy_id => {* asset_name => nonZeroInt64}}
 * ```
 *
 * Where:
 * - policy_id: 28-byte Uint8Array (from CBOR byte string)
 * - asset_name: variable-length Uint8Array (from CBOR byte string, can be empty)
 * - nonZeroInt64: signed 64-bit integer (positive = mint, negative = burn, cannot be zero)
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(Schema.encodedSchema(CDDLSchema), Schema.typeSchema(Mint), {
  strict: true,
  encode: (toA) =>
    Eff.gen(function* () {
      // Convert Mint to raw Map data for CBOR encoding
      const outerMap = new Map() as Map<Uint8Array, Map<Uint8Array, bigint>>

      for (const [policyId, assetMap] of toA.map.entries()) {
        const policyIdBytes = yield* ParseResult.encode(PolicyId.FromBytes)(policyId)
        const innerMap = new Map() as Map<Uint8Array, bigint>

        for (const [assetName, amount] of assetMap.entries()) {
          const assetNameBytes = yield* ParseResult.encode(AssetName.FromBytes)(assetName)
          innerMap.set(assetNameBytes, amount)
        }

        outerMap.set(policyIdBytes, innerMap)
      }

      return outerMap
    }),

  decode: (fromA) =>
    Eff.gen(function* () {
      const innerMap = new Map<PolicyId.PolicyId, AssetMap>()

      for (const [policyIdBytes, assetMapCddl] of fromA.entries()) {
        const policyId = yield* ParseResult.decode(PolicyId.FromBytes)(policyIdBytes)

        const assetMap = new Map<AssetName.AssetName, NonZeroInt64.NonZeroInt64>()
        for (const [assetNameBytes, amount] of assetMapCddl.entries()) {
          const assetName = yield* ParseResult.decode(AssetName.FromBytes)(assetNameBytes)
          const nonZeroAmount = yield* ParseResult.decode(Schema.typeSchema(NonZeroInt64.NonZeroInt64))(amount)

          assetMap.set(assetName, nonZeroAmount)
        }

        innerMap.set(policyId, assetMap)
      }

      return new Mint({ map: innerMap })
    })
})

/**
 * CBOR bytes transformation schema for Mint.
 * Transforms between CBOR bytes and Mint using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → Mint
  ).annotations({
    identifier: "Mint.FromCBORBytes",
    title: "Mint from CBOR Bytes",
    description: "Transforms CBOR bytes to Mint"
  })

/**
 * CBOR hex transformation schema for Mint.
 * Transforms between CBOR hex string and Mint using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → Mint
  ).annotations({
    identifier: "Mint.FromCBORHex",
    title: "Mint from CBOR Hex",
    description: "Transforms CBOR hex string to Mint"
  })

/**
 * FastCheck arbitrary for generating random Mint instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<Mint> = FastCheck.oneof(
  // Sometimes generate an empty mint map
  FastCheck.constant(empty()),
  // Non-empty unique policies with unique assets per policy
  FastCheck.uniqueArray(PolicyId.arbitrary, {
    minLength: 1,
    maxLength: 5,
    selector: (p) => Bytes.toHex(p.hash)
  }).chain((policies) => {
    const assetsForPolicy = () =>
      FastCheck.uniqueArray(AssetName.arbitrary, {
        minLength: 1,
        maxLength: 5,
        selector: (a) => Bytes.toHex(a.bytes)
      }).chain((names) =>
        FastCheck.array(NonZeroInt64.arbitrary, {
          minLength: names.length,
          maxLength: names.length
        }).map((amounts) => names.map((n, i) => [n, amounts[i]] as const))
      )

    return FastCheck.array(assetsForPolicy(), { minLength: policies.length, maxLength: policies.length }).map(
      (assetsEntries) =>
        fromEntries(
          policies.map((policy, idx) => [
            policy,
            assetsEntries[idx] as Array<[AssetName.AssetName, NonZeroInt64.NonZeroInt64]>
          ])
        )
    )
  })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse Mint from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): Mint =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse Mint from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): Mint =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode Mint to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (mint: Mint, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): Uint8Array =>
  Schema.encodeSync(FromCBORBytes(options))(mint)

/**
 * Encode Mint to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (mint: Mint, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS): string =>
  Schema.encodeSync(FromCBORHex(options))(mint)
