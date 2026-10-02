/**
 * Evaluation State Manager
 *
 * Centralized module for managing evaluation-related state mutations.
 * Provides utilities to invalidate and track redeemer execution units.
 *
 * @module EvaluationStateManager
 * @since 2.0.0
 */

import type { TxBuilderState } from "./TransactionBuilder.js"

/**
 * Invalidate all redeemer exUnits.
 *
 * Sets all redeemer execution units to zero, signaling that re-evaluation
 * is required. This should be called when transaction structure changes
 * (e.g., new inputs added) that would affect validator execution.
 *
 * Returns a new Map with invalidated exUnits (immutable operation).
 *
 * @param redeemers - Map of redeemers to invalidate
 * @returns New Map with all exUnits set to zero
 *
 * @since 2.0.0
 * @category state-management
 */
export const invalidateExUnits = (redeemers: TxBuilderState["redeemers"]): TxBuilderState["redeemers"] => {
  const invalidated = new Map<string, TxBuilderState["redeemers"] extends Map<string, infer V> ? V : never>()

  for (const [key, redeemer] of redeemers.entries()) {
    invalidated.set(key, {
      ...redeemer,
      exUnits: { mem: 0n, steps: 0n }
    })
  }

  return invalidated
}

/**
 * Check if any redeemers need evaluation.
 *
 * Returns true if there are redeemers without valid execution units
 * (exUnits are missing or set to zero).
 *
 * @param redeemers - Map of redeemers to check
 * @returns True if any redeemer needs evaluation
 *
 * @since 2.0.0
 * @category state-management
 */
export const hasUnevaluatedRedeemers = (redeemers: TxBuilderState["redeemers"]): boolean => {
  return Array.from(redeemers.values()).some(
    (redeemer) => !redeemer.exUnits || redeemer.exUnits.mem === 0n || redeemer.exUnits.steps === 0n
  )
}

/**
 * Check if all redeemers have been evaluated.
 *
 * Returns true if all redeemers have valid execution units (mem > 0 and steps > 0).
 *
 * @param redeemers - Map of redeemers to check
 * @returns True if all redeemers are evaluated
 *
 * @since 2.0.0
 * @category state-management
 */
export const allRedeemersEvaluated = (redeemers: TxBuilderState["redeemers"]): boolean => {
  if (redeemers.size === 0) return false

  return Array.from(redeemers.values()).every(
    (redeemer) => redeemer.exUnits && redeemer.exUnits.mem > 0n && redeemer.exUnits.steps > 0n
  )
}
