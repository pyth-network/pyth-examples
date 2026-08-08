import { Schema } from "effect"

import type * as NetworkId from "./NetworkId.js"

/**
 * Schema for Network representing Cardano network types.
 * Supports Mainnet, Preview, Preprod, and Custom networks.
 *
 * @since 2.0.0
 * @category schemas
 */
export const Network = Schema.Literal("Mainnet", "Preview", "Preprod", "Custom")

/**
 * Type alias for Network representing Cardano network types.
 *
 * @since 2.0.0
 * @category model
 */
export type Network = typeof Network.Type

/**
 * Check if a value is a valid Network.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = (value: unknown): value is Network => Schema.is(Network)(value)

/**
 * Converts a Network type to NetworkId number.
 *
 * @since 2.0.0
 * @category conversion
 */
export const toId = <T extends Network>(network: T): NetworkId.NetworkId => {
  switch (network) {
    case "Preview":
    case "Preprod":
    case "Custom":
      return 0 as NetworkId.NetworkId
    case "Mainnet":
      return 1 as NetworkId.NetworkId
    default:
      throw new Error(`Exhaustive check failed: Unhandled case ${network}`)
  }
}

/**
 * Converts a NetworkId to Network type.
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromId = (id: NetworkId.NetworkId): Network => {
  switch (id) {
    case 0:
      return "Preview"
    case 1:
      return "Mainnet"
    default:
      throw new Error(`Exhaustive check failed: Unhandled case ${id}`)
  }
}
