import * as Data from "../Data.js"
import * as TSchema from "../TSchema.js"

/**
 * Policy ID (28 bytes script hash)
 */
export const PolicyId = TSchema.ByteArray

/**
 * Asset Name - Token name within a policy
 */
export const AssetName = TSchema.ByteArray

/**
 * Lovelace - ADA in lovelace (1 ADA = 1,000,000 lovelace)
 */
export const Lovelace = TSchema.Integer

/**
 * Assets Map - Map of AssetName to quantity
 */
export const AssetsMap = TSchema.Map(AssetName, TSchema.Integer)

/**
 * Value - Map of PolicyId to AssetsMap
 * Represents multi-asset value including native tokens
 */
export const Value = TSchema.Map(PolicyId, AssetsMap)

// Export codec objects with all conversion functions
export const Codec = Data.withSchema(Value)
export const PolicyIdCodec = Data.withSchema(PolicyId)
export const AssetNameCodec = Data.withSchema(AssetName)
export const LovelaceCodec = Data.withSchema(Lovelace)

// Type exports
export type Value = typeof Value.Type
export type PolicyId = typeof PolicyId.Type
export type AssetName = typeof AssetName.Type
export type Lovelace = typeof Lovelace.Type
export type AssetsMap = typeof AssetsMap.Type
