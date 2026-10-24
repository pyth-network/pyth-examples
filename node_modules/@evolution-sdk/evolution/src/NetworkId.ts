import { FastCheck, Schema } from "effect"

/**
 * Schema for NetworkId representing a Cardano network identifier.
 * 0 = Testnet, 1 = Mainnet
 *
 * @since 2.0.0
 * @category schemas
 */
export const NetworkId = Schema.NonNegativeInt.annotations({
  identifier: "NetworkId"
})

export type NetworkId = typeof NetworkId.Type

/**
 * FastCheck generator for creating NetworkId instances.
 * Generates values 0 (Testnet) or 1 (Mainnet).
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.integer({
  min: 0,
  max: 2
}).map((number) => number as NetworkId)
