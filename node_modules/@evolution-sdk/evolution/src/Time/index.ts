/**
 * Time utilities for Cardano blockchain time operations.
 * Provides type-safe conversions between slots and Unix time.
 *
 * @module Time
 * @since 2.0.0
 */

import type * as Network from "../Network.js"
import type { Slot } from "./Slot.js"
import type { SlotConfig } from "./SlotConfig.js"
import { SLOT_CONFIG_NETWORK } from "./SlotConfig.js"
import type { UnixTime } from "./UnixTime.js"
import { now as nowFn } from "./UnixTime.js"

// Re-export types
export type { Slot } from "./Slot.js"
export type { SlotConfig } from "./SlotConfig.js"
export type { UnixTime } from "./UnixTime.js"

// Re-export slot config
export { getSlotConfig, SLOT_CONFIG_NETWORK } from "./SlotConfig.js"

// Re-export UnixTime utilities
export { fromDate, fromSeconds, now, toDate, toSeconds } from "./UnixTime.js"

/**
 * Convert a slot number to Unix time (in milliseconds).
 *
 * @param slot - The slot number to convert
 * @param slotConfig - The network's slot configuration
 * @returns Unix timestamp in milliseconds
 *
 * @category Conversion
 * @since 2.0.0
 *
 * @example
 * ```typescript
 * import * as Time from "@evolution-sdk/core/Time"
 *
 * const slot = 12345678n
 * const config = Time.SLOT_CONFIG_NETWORK.Mainnet
 * const unixTime = Time.slotToUnixTime(slot, config)
 * console.log(unixTime) // Unix time in milliseconds
 * ```
 */
export const slotToUnixTime = (slot: Slot, slotConfig: SlotConfig): UnixTime => {
  const msAfterBegin = (slot - slotConfig.zeroSlot) * BigInt(slotConfig.slotLength)
  return slotConfig.zeroTime + msAfterBegin
}

/**
 * Convert Unix time (in milliseconds) to the enclosing slot number.
 * Uses floor division to find the slot that contains the given time.
 *
 * @param unixTime - Unix timestamp in milliseconds
 * @param slotConfig - The network's slot configuration
 * @returns The slot number that contains this Unix time
 *
 * @category Conversion
 * @since 2.0.0
 *
 * @example
 * ```typescript
 * import * as Time from "@evolution-sdk/core/Time"
 *
 * const unixTime = 1596059091000n // Mainnet Shelley start
 * const config = Time.SLOT_CONFIG_NETWORK.Mainnet
 * const slot = Time.unixTimeToSlot(unixTime, config)
 * console.log(slot) // 4492800n
 * ```
 */
export const unixTimeToSlot = (unixTime: UnixTime, slotConfig: SlotConfig): Slot => {
  const timePassed = unixTime - slotConfig.zeroTime
  const slotsPassed = timePassed / BigInt(slotConfig.slotLength)
  return slotsPassed + slotConfig.zeroSlot
}

/**
 * Get the current slot number for a network.
 *
 * @param network - The network to get current slot for
 * @returns Current slot number
 *
 * @category Utility
 * @since 2.0.0
 *
 * @example
 * ```typescript
 * import * as Time from "@evolution-sdk/core/Time"
 *
 * const currentSlot = Time.getCurrentSlot("Mainnet")
 * console.log(currentSlot) // Current mainnet slot
 * ```
 */
export const getCurrentSlot = (network: Network.Network): Slot => {
  const config = SLOT_CONFIG_NETWORK[network]
  const currentTime = nowFn()
  return unixTimeToSlot(currentTime, config)
}

/**
 * Check if a slot is in the future relative to current time.
 *
 * @param slot - The slot to check
 * @param slotConfig - The network's slot configuration
 * @returns True if the slot is in the future
 *
 * @category Utility
 * @since 2.0.0
 */
export const isSlotInFuture = (slot: Slot, slotConfig: SlotConfig): boolean => {
  const currentTime = nowFn()
  const slotTime = slotToUnixTime(slot, slotConfig)
  return slotTime > currentTime
}

/**
 * Check if a slot is in the past relative to current time.
 *
 * @param slot - The slot to check
 * @param slotConfig - The network's slot configuration
 * @returns True if the slot is in the past
 *
 * @category Utility
 * @since 2.0.0
 */
export const isSlotInPast = (slot: Slot, slotConfig: SlotConfig): boolean => {
  const currentTime = nowFn()
  const slotTime = slotToUnixTime(slot, slotConfig)
  return slotTime < currentTime
}

/**
 * Get the slot at a specific offset from now (in milliseconds).
 *
 * @param offsetMs - Offset in milliseconds (positive for future, negative for past)
 * @param network - The network
 * @returns Slot number at the offset time
 *
 * @category Utility
 * @since 2.0.0
 *
 * @example
 * ```typescript
 * import * as Time from "@evolution-sdk/core/Time"
 *
 * // Get slot 5 minutes from now
 * const futureSlot = Time.getSlotAt(5 * 60 * 1000, "Mainnet")
 *
 * // Get slot 10 minutes ago
 * const pastSlot = Time.getSlotAt(-10 * 60 * 1000, "Mainnet")
 * ```
 */
export const getSlotAt = (offsetMs: number, network: Network.Network): Slot => {
  const config = SLOT_CONFIG_NETWORK[network]
  const targetTime = nowFn() + BigInt(offsetMs)
  return unixTimeToSlot(targetTime, config)
}
