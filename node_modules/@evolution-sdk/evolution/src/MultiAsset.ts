import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as AssetName from "./AssetName.js"
import * as Bytes from "./Bytes.js"
import * as CBOR from "./CBOR.js"
import * as _Codec from "./Codec.js"
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
        // Special handling for nested Maps
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
 * Schema for inner asset map (asset_name => bigint).
 *
 * This is a **base type** with no constraints. Values can be positive,
 * negative, or zero to support arithmetic operations.
 *
 * Constraints (positive values) are applied at boundaries like
 * `TransactionOutput` where CDDL requires positive_coin.
 *
 * @since 2.0.0
 * @category schemas
 */
export const AssetMap = Schema.Map({
  key: AssetName.AssetName,
  value: Schema.BigInt
}).annotations({
  identifier: "MultiAsset.AssetMap"
})

/**
 * Type alias for the inner asset map.
 *
 * @since 2.0.0
 * @category model
 */
export type AssetMap = typeof AssetMap.Type

/**
 * Schema for MultiAsset representing native assets.
 *
 * This is a **base type** with no constraints on size or values.
 * It supports arithmetic operations (merge, subtract, negate) which may
 * produce empty maps or negative quantities during intermediate calculations.
 *
 * Constraints (non-empty, positive values) are applied at boundaries
 * like `TransactionOutput` where CDDL requires `multiasset<positive_coin>`.
 *
 * ```
 * multiasset<a0> = {* policy_id => {* asset_name => a0}}
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class MultiAsset extends Schema.Class<MultiAsset>("MultiAsset")({
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
    // Convert the nested Map<PolicyId, Map<AssetName, bigint>> to a serializable format
    const serializedMap: Record<string, Record<string, string>> = {}
    for (const [policyId, assetMap] of this.map.entries()) {
      const serializedAssets: Record<string, string> = {}
      for (const [assetName, quantity] of assetMap.entries()) {
        serializedAssets[Bytes.toHex(assetName.bytes)] = quantity.toString()
      }
      serializedMap[Bytes.toHex(policyId.hash)] = serializedAssets
    }
    return {
      _tag: "MultiAsset" as const,
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
    return that instanceof MultiAsset && mapEquals(this.map, that.map)
  }

  /**
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    let hash = Hash.hash(this.map.size)
    for (const [policyId, assetMap] of this.map.entries()) {
      // Hash the policy ID
      const policyHash = Hash.hash(policyId)
      // Hash the asset map (nested Map) using mapHash for content-based hashing
      const assetMapHash = mapHash(assetMap)
      // XOR them together
      hash ^= policyHash ^ assetMapHash
    }
    return Hash.cached(this, hash)
  }
}

export const equals = (a: MultiAsset, b: MultiAsset): boolean => {
  if (a.map.size !== b.map.size) return false

  // Compare using byte arrays directly for all keys
  for (const [aPolicyId, aAssetMap] of a.map.entries()) {
    // Find matching policy in b by comparing bytes
    let bAssetMap: typeof aAssetMap | undefined
    for (const [bPolicyId, bAssets] of b.map.entries()) {
      if (Bytes.equals(aPolicyId.hash, bPolicyId.hash)) {
        bAssetMap = bAssets
        break
      }
    }

    if (bAssetMap === undefined) return false
    if (aAssetMap.size !== bAssetMap.size) return false

    // Compare asset maps
    for (const [aAssetName, aAmount] of aAssetMap.entries()) {
      // Find matching asset name in b by comparing bytes
      let bAmount: bigint | undefined
      for (const [bAssetName, bAmt] of bAssetMap.entries()) {
        if (Bytes.equals(aAssetName.bytes, bAssetName.bytes)) {
          bAmount = bAmt as bigint
          break
        }
      }

      if (bAmount === undefined) return false
      if ((aAmount as bigint) !== bAmount) return false
    }
  }

  return true
}

/**
 * Create an empty MultiAsset
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty = (): MultiAsset => new MultiAsset({ map: new Map() })

/**
 * Create a MultiAsset from a single asset.
 *
 * @since 2.0.0
 * @category constructors
 */
export const singleton = (policyId: PolicyId.PolicyId, assetName: AssetName.AssetName, amount: bigint): MultiAsset => {
  const assetMap = new Map([[assetName, amount]])
  const map = new Map([[policyId, assetMap]])
  return new MultiAsset({ map })
}

/**
 * Add an asset to a MultiAsset, combining amounts if the asset already exists.
 *
 * @since 2.0.0
 * @category transformation
 */
export const addAsset = (
  multiAsset: MultiAsset,
  policyId: PolicyId.PolicyId,
  assetName: AssetName.AssetName,
  amount: bigint
): MultiAsset => {
  // Find existing entry by structural equality (not reference equality)
  let existingPolicyId: PolicyId.PolicyId | undefined
  let existingAssetMap: AssetMap | undefined
  for (const [pid, amap] of multiAsset.map.entries()) {
    if (Equal.equals(pid, policyId)) {
      existingPolicyId = pid
      existingAssetMap = amap
      break
    }
  }

  if (existingAssetMap !== undefined && existingPolicyId !== undefined) {
    // Find existing asset by structural equality
    let existingAssetName: AssetName.AssetName | undefined
    let existingAmount: bigint | undefined
    for (const [aname, amt] of existingAssetMap.entries()) {
      if (Equal.equals(aname, assetName)) {
        existingAssetName = aname
        existingAmount = amt
        break
      }
    }

    const newAmount = existingAmount !== undefined ? existingAmount + amount : amount

    const updatedAssetMap = new Map(existingAssetMap)
    // Use the existing key if found, otherwise use the new one
    if (existingAssetName !== undefined) {
      updatedAssetMap.delete(existingAssetName)
    }
    updatedAssetMap.set(assetName, newAmount)

    const result = new Map(multiAsset.map)
    result.delete(existingPolicyId)
    result.set(policyId, updatedAssetMap)
    return new MultiAsset({ map: result })
  } else {
    const newAssetMap = new Map([[assetName, amount]])
    const result = new Map(multiAsset.map)
    result.set(policyId, newAssetMap)
    return new MultiAsset({ map: result })
  }
}

/**
 * Get the amount of a specific asset from a MultiAsset.
 *
 * @since 2.0.0
 * @category transformation
 */
export const getAsset = (multiAsset: MultiAsset, policyId: PolicyId.PolicyId, assetName: AssetName.AssetName) => {
  const assetMap = multiAsset.map.get(policyId)
  if (assetMap !== undefined) {
    const amount = assetMap.get(assetName)
    return amount !== undefined ? amount : undefined
  }
  return undefined
}

/**
 * Check if a MultiAsset contains a specific asset.
 *
 * @since 2.0.0
 * @category predicates
 */
export const hasAsset = (
  multiAsset: MultiAsset,
  policyId: PolicyId.PolicyId,
  assetName: AssetName.AssetName
): boolean => {
  const result = getAsset(multiAsset, policyId, assetName)
  return result !== undefined
}

/**
 * Get all policy IDs in a MultiAsset.
 *
 * @since 2.0.0
 * @category transformation
 */
export const getPolicyIds = (multiAsset: MultiAsset): Array<PolicyId.PolicyId> => Array.from(multiAsset.map.keys())

/**
 * Get all assets for a specific policy ID.
 *
 * @since 2.0.0
 * @category transformation
 */
export const getAssetsByPolicy = (multiAsset: MultiAsset, policyId: PolicyId.PolicyId) => {
  const assetMap = multiAsset.map.get(policyId)
  return assetMap !== undefined ? Array.from(assetMap.entries()) : []
}

/**
 * Check if a value is a valid MultiAsset.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = (value: unknown): value is MultiAsset => Schema.is(MultiAsset)(value)

/**
 * Change generator to arbitrary and rename CBOR schemas.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<MultiAsset> = FastCheck.uniqueArray(PolicyId.arbitrary, {
  minLength: 1,
  maxLength: 5,
  selector: (p) => Bytes.toHex(p.hash)
}).chain((policies) => {
  // For each unique policy, generate a unique set of asset names with aligned positive amounts
  const assetsForPolicy = () =>
    FastCheck.uniqueArray(AssetName.arbitrary, {
      minLength: 1,
      maxLength: 5,
      selector: (a) => Bytes.toHex(a.bytes)
    }).chain((names) =>
      // Generate exactly names.length amounts to pair with the unique names
      FastCheck.array(FastCheck.bigInt({ min: 1n, max: 18446744073709551615n }), {
        minLength: names.length,
        maxLength: names.length
      }).map((amounts) => {
        const entries = names.map((n, i) => [n, amounts[i]] as const)
        return new Map(entries)
      })
    )

  return FastCheck.array(assetsForPolicy(), { minLength: policies.length, maxLength: policies.length }).map(
    (assetMaps) => {
      // Build a properly typed Map<PolicyId, AssetMap>
      const result = new Map<PolicyId.PolicyId, Map<AssetName.AssetName, bigint>>()
      for (let i = 0; i < policies.length; i++) {
        const policy = policies[i]!
        const assetMap = assetMaps[i]!
        // assetMap is generated to be a Map<AssetName, bigint>
        result.set(policy, assetMap as Map<AssetName.AssetName, bigint>)
      }

      return new MultiAsset({ map: result })
    }
  )
})

/**
 * CDDL schema for MultiAsset.
 *
 * ```
 * multiasset<positive_coin> = {+ policy_id => {+ asset_name => positive_coin}}
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(
  Schema.MapFromSelf({
    key: CBOR.ByteArray,
    value: Schema.MapFromSelf({
      key: CBOR.ByteArray,
      value: CBOR.Integer
    })
  }),
  Schema.typeSchema(MultiAsset),
  {
    strict: true,
    encode: (toI, _, __, toA) =>
      Eff.gen(function* () {
        // Convert MultiAsset to raw Map data for CBOR encoding
        const outerMap = new Map<Uint8Array, Map<Uint8Array, bigint>>()

        for (const [policyId, assetMap] of toA.map.entries()) {
          const policyIdBytes = yield* ParseResult.encode(PolicyId.FromBytes)(policyId)
          const innerMap = new Map<Uint8Array, bigint>()

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
        const result = new Map<PolicyId.PolicyId, AssetMap>()

        for (const [policyIdBytes, assetMapCddl] of fromA.entries()) {
          const policyId = yield* ParseResult.decode(PolicyId.FromBytes)(policyIdBytes)

          const assetMap = new Map<AssetName.AssetName, bigint>()
          for (const [assetNameBytes, amount] of assetMapCddl.entries()) {
            const assetName = yield* ParseResult.decode(AssetName.FromBytes)(assetNameBytes)
            assetMap.set(assetName, amount)
          }

          result.set(policyId, assetMap)
        }

        return new MultiAsset({ map: result })
      })
  }
)

/**
 * CBOR bytes transformation schema for MultiAsset.
 * Transforms between CBOR bytes and MultiAsset using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → MultiAsset
  ).annotations({
    identifier: "MultiAsset.FromCBORBytes",
    title: "MultiAsset from CBOR Bytes",
    description: "Transforms CBOR bytes to MultiAsset"
  })

/**
 * CBOR hex transformation schema for MultiAsset.
 * Transforms between CBOR hex string and MultiAsset using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → MultiAsset
  ).annotations({
    identifier: "MultiAsset.FromCBORHex",
    title: "MultiAsset from CBOR Hex",
    description: "Transforms CBOR hex string to MultiAsset"
  })

/**
 * Root Functions
 * ============================================================================
 */

/**
 * Parse MultiAsset from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse MultiAsset from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode MultiAsset to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: MultiAsset, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Encode MultiAsset to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: MultiAsset, options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.encodeSync(FromCBORHex(options))(data)

/**
 * Merge two MultiAsset instances, combining amounts for assets that exist in both.
 *
 * @since 2.0.0
 * @category transformation
 */
export const merge = (a: MultiAsset, b: MultiAsset): MultiAsset => {
  let result = a

  for (const [policyId, assetMap] of b.map.entries()) {
    for (const [assetName, amount] of assetMap.entries()) {
      result = addAsset(result, policyId, assetName, amount)
    }
  }

  return result
}

/**
 * Subtract MultiAsset b from MultiAsset a.
 * Returns a new MultiAsset with amounts reduced by the amounts in b.
 * If any asset would result in zero or negative amount, it's removed from the result.
 * If the result would be empty, an error is thrown since MultiAsset cannot be empty.
 *
 * @since 2.0.0
 * @category transformation
 */
export const subtract = (a: MultiAsset, b: MultiAsset): MultiAsset => {
  const result = new Map<PolicyId.PolicyId, AssetMap>()

  // Start with all assets from a
  for (const [policyId, assetMapA] of a.map.entries()) {
    const assetMapB = b.map.get(policyId)

    if (assetMapB === undefined) {
      // No assets to subtract for this policy, keep all
      result.set(policyId, assetMapA)
    } else {
      // Subtract assets for this policy
      const newAssetMap = new Map<AssetName.AssetName, bigint>()

      for (const [assetName, amountA] of assetMapA.entries()) {
        const amountB = assetMapB.get(assetName)

        if (amountB === undefined) {
          // No amount to subtract, keep the original
          newAssetMap.set(assetName, amountA)
        } else {
          // Subtract amounts
          const diff = amountA - amountB
          if (diff > 0n) {
            // Only keep positive amounts
            newAssetMap.set(assetName, diff)
          }
          // If diff <= 0, the asset is removed (not added to newAssetMap)
        }
      }

      // Only add the policy if it has remaining assets
      if (newAssetMap.size > 0) {
        result.set(policyId, newAssetMap)
      }
    }
  }

  // Check if result is empty
  if (result.size === 0) {
    throw new Error("Subtraction would result in empty MultiAsset")
  }

  return new MultiAsset({ map: result })
}
