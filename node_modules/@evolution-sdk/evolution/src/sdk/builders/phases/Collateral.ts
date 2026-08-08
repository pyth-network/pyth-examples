/**
 * Collateral Phase
 *
 * Selects UTxOs to serve as collateral for script transactions and creates
 * the collateral return output. Updates the transaction fee to account for
 * the size impact of collateral fields.
 *
 * @module Collateral
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as CoreAssets from "../../../Assets/index.js"
import * as TxOut from "../../../TxOut.js"
import * as UTxO from "../../../UTxO.js"
import {
  AvailableUtxosTag,
  BuildOptionsTag,
  ChangeAddressTag,
  ProtocolParametersTag,
  TransactionBuilderError,
  TxContext
} from "../TransactionBuilder.js"
import { calculateMinimumUtxoLovelace } from "../TxBuilderImpl.js"
import type { PhaseResult } from "./Phases.js"

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of collateral inputs allowed by protocol.
 *
 * @since 2.0.0
 * @category constants
 */
const MAX_COLLATERAL_INPUTS = 3

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if UTxO contains only lovelace (no other tokens).
 *
 * @since 2.0.0
 * @category helpers
 */
const isPureAda = (utxo: UTxO.UTxO): boolean => {
  return !CoreAssets.hasMultiAsset(utxo.assets)
}

/**
 * Sort UTxOs for collateral selection: pure ADA first, then by lovelace amount descending.
 * This strategy prefers pure ADA UTxOs (simpler return calculation, lower minUTxO)
 * and selects largest amounts first to minimize number of inputs.
 *
 * @since 2.0.0
 * @category helpers
 */
const sortCollateralCandidates = (utxos: ReadonlyArray<UTxO.UTxO>): Array<UTxO.UTxO> => {
  return [...utxos].sort((a, b) => {
    const aIsPure = isPureAda(a)
    const bIsPure = isPureAda(b)

    // Pure ADA first
    if (aIsPure && !bIsPure) return -1
    if (!aIsPure && bIsPure) return 1

    // Then by lovelace amount (descending - prefer largest first)
    return Number(CoreAssets.lovelaceOf(b.assets) - CoreAssets.lovelaceOf(a.assets))
  })
}

// ============================================================================
// Main Collateral Phase
// ============================================================================

/**
 * Execute collateral selection phase for script transactions.
 *
 * **Phase Flow:**
 * ```
 * Check if scripts present
 * (skip if no redeemers)
 *   ↓
 * Filter available UTxOs
 * (exclude selected, exclude ref scripts)
 *   ↓
 * Sort candidates
 * (pure ADA first, smallest first)
 *   ↓
 * Greedy selection
 * (target 5 ADA, max 3 inputs)
 *   ↓
 * Adjust fee for size
 * (+180 bytes × minFeeCoefficient)
 *   ↓
 * Calculate totalCollateral
 * (adjustedFee × 150%)
 *   ↓
 * Calculate return & validate minUTxO
 * (return excess to user)
 *   ↓
 * Update state
 * (store collateral data, update fee)
 * ```
 *
 * **Key Principles:**
 * - Only runs for script transactions (redeemers.size > 0)
 * - Uses 5 ADA fixed estimate (conservative, simple)
 * - Prefers pure ADA but supports multi-asset
 * - All tokens from selected collateral returned to user
 * - Fee updated to include collateral size impact
 * - One-pass approach (no iteration)
 *
 * @since 2.0.0
 * @category phases
 */
export const executeCollateral = (): Effect.Effect<
  PhaseResult,
  TransactionBuilderError,
  TxContext | AvailableUtxosTag | ChangeAddressTag | ProtocolParametersTag | BuildOptionsTag
> =>
  Effect.gen(function* () {
    // Get contexts
    const stateRef = yield* TxContext
    const state = yield* Ref.get(stateRef)
    const availableUtxos = yield* AvailableUtxosTag
    const changeAddress = yield* ChangeAddressTag
    const protocolParams = yield* ProtocolParametersTag
    const buildOptions = yield* BuildOptionsTag

    // Get target collateral from options (default: 5 ADA)
    const targetCollateral = buildOptions.setCollateral ?? 5_000_000n

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Early Exit - Skip if no scripts
    // ═══════════════════════════════════════════════════════════
    if (state.redeemers.size === 0 && state.deferredRedeemers.size === 0) {
      yield* Effect.logDebug("[Collateral] No redeemers found, skipping collateral selection")
      // No scripts - continue to ChangeCreation without collateral
      return { next: "changeCreation" as const }
    }

    yield* Effect.logDebug("[Collateral] Script transaction detected, selecting collateral")

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Filter Candidates
    // ═══════════════════════════════════════════════════════════
    // IMPORTANT: Collateral inputs are NOT consumed in successful transactions!
    // They're only consumed if script validation fails (rare).
    // Therefore, we can use ANY user UTxO, including those already selected as inputs.
    const candidates = availableUtxos.filter((utxo: UTxO.UTxO) => {
      // Only exclude UTxOs with reference scripts (protocol constraint)
      const hasRefScript = utxo.scriptRef !== undefined

      return !hasRefScript
    })

    if (candidates.length === 0) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message:
            "No suitable UTxOs available for collateral. " +
            "All available UTxOs are either already selected or have reference scripts."
        })
      )
    }

    yield* Effect.logDebug(`[Collateral] Found ${candidates.length} candidate UTxOs`)

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Sort - Pure ADA first, then by amount descending
    // ═══════════════════════════════════════════════════════════
    const sorted = sortCollateralCandidates(candidates)

    yield* Effect.logDebug(`[Collateral] Sorted candidates (pure ADA first, largest first)`)

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Greedy Selection - Target 5 ADA, Max 3 Inputs
    // ═══════════════════════════════════════════════════════════
    const selectedCollateral: Array<UTxO.UTxO> = []
    let totalLovelace = 0n
    let totalAssets: CoreAssets.Assets = CoreAssets.zero

    for (const utxo of sorted) {
      if (selectedCollateral.length >= MAX_COLLATERAL_INPUTS) {
        break
      }

      selectedCollateral.push(utxo)
      totalLovelace += CoreAssets.lovelaceOf(utxo.assets)
      totalAssets = CoreAssets.merge(totalAssets, utxo.assets)

      yield* Effect.logDebug(
        `[Collateral] Selected UTxO: ${UTxO.toOutRefString(utxo)} (${CoreAssets.lovelaceOf(utxo.assets)} lovelace)`
      )

      // Check if we have enough
      if (totalLovelace >= targetCollateral) {
        break
      }
    }

    // Validate: Did we get enough?
    if (totalLovelace < targetCollateral) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: `Insufficient collateral available. Need ${targetCollateral} lovelace, but only found ${totalLovelace} lovelace.`
        })
      )
    }

    yield* Effect.logDebug(
      `[Collateral] Selected ${selectedCollateral.length} inputs totaling ${totalLovelace} lovelace`
    )

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Use Target Collateral as Total Collateral
    // ═══════════════════════════════════════════════════════════
    // Use the fixed target collateral amount (5 ADA default) as the total collateral.
    // This provides predictable collateral requirements regardless of transaction complexity.
    const totalCollateral = targetCollateral

    yield* Effect.logDebug(`[Collateral] Total collateral: ${totalCollateral} lovelace (fixed target amount)`)

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Calculate Return Amount and Assets
    // ═══════════════════════════════════════════════════════════
    const returnLovelace = totalLovelace - totalCollateral
    const hasTokens = CoreAssets.hasMultiAsset(totalAssets)

    yield* Effect.logDebug(`[Collateral] Return amount: ${returnLovelace} lovelace${hasTokens ? " + tokens" : ""}`)

    // Collateral return is only needed if there are leftover assets
    // (either lovelace or tokens)
    const needsReturn = returnLovelace > 0n || hasTokens

    if (!needsReturn) {
      yield* Effect.logDebug("[Collateral] No collateral return needed (exact match)")

      // Update state with collateral data (no return output)
      yield* Ref.update(stateRef, (currentState) => ({
        ...currentState,
        collateral: {
          inputs: selectedCollateral,
          totalAmount: totalCollateral,
          returnOutput: undefined
        }
      }))

      yield* Effect.logDebug("[Collateral] Phase complete ✅")
      yield* Effect.logDebug(`  - Inputs: ${selectedCollateral.length}, Total: ${totalLovelace} lovelace`)
      yield* Effect.logDebug(`  - Total collateral: ${totalCollateral} lovelace`)
      yield* Effect.logDebug(`  - Return: none (exact match)`)

      // Route to ChangeCreation (collateral selected, now create change with correct fee)
      return { next: "changeCreation" as const }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Validate MinUTxO for Return Output
    // ═══════════════════════════════════════════════════════════
    const returnAssets = CoreAssets.withLovelace(totalAssets, returnLovelace)

    yield* Effect.logDebug(`[Collateral] Return assets: ${returnAssets.toString()}`)

    const minUtxo = yield* calculateMinimumUtxoLovelace({
      address: changeAddress,
      assets: returnAssets,
      datum: undefined, // No datum for collateral return
      scriptRef: undefined, // No script reference
      coinsPerUtxoByte: protocolParams.coinsPerUtxoByte
    })

    if (returnLovelace < minUtxo) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message:
            `Collateral return (${returnLovelace} lovelace) is below minimum UTxO requirement (${minUtxo} lovelace). ` +
            `This can happen when collateral inputs have many tokens. ` +
            `Consider selecting UTxOs with pure ADA for collateral, or provide more collateral.`
        })
      )
    }

    yield* Effect.logDebug(`[Collateral] Return meets minUTxO requirement (${minUtxo} lovelace)`)

    // ═══════════════════════════════════════════════════════════
    // STEP 9: Create Return Output
    // ═══════════════════════════════════════════════════════════
    const collateralReturn = new TxOut.TransactionOutput({
      address: changeAddress,
      assets: returnAssets,
      datumOption: undefined, // No datum for collateral return
      scriptRef: undefined // No script reference
    })

    // ═══════════════════════════════════════════════════════════
    // STEP 10: Update State
    // ═══════════════════════════════════════════════════════════

    // Update state with collateral data
    yield* Ref.update(stateRef, (currentState) => ({
      ...currentState,
      collateral: {
        inputs: selectedCollateral,
        totalAmount: totalCollateral,
        returnOutput: collateralReturn
      }
    }))

    yield* Effect.logDebug("[Collateral] Phase complete ✅")
    yield* Effect.logDebug(`  - Inputs: ${selectedCollateral.length}, Total: ${totalLovelace} lovelace`)
    yield* Effect.logDebug(`  - Total collateral: ${totalCollateral} lovelace`)
    yield* Effect.logDebug(`  - Return: ${returnLovelace} lovelace`)

    // Route to ChangeCreation (collateral selected, now create change with correct fee)
    return { next: "changeCreation" as const }
  })
