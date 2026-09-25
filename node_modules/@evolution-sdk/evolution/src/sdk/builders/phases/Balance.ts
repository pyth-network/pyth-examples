/**
 * Balance Verification Phase
 *
 * Verifies that transaction inputs exactly equal outputs + change + fees.
 * Handles three scenarios: balanced (complete), shortfall (retry), or excess (burn/drain).
 *
 * @module Balance
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as CoreAssets from "../../../Assets/index.js"
import * as EvaluationStateManager from "../EvaluationStateManager.js"
import { mintToAssets } from "../operations/Mint.js"
import { BuildOptionsTag, PhaseContextTag, TransactionBuilderError, TxContext } from "../TransactionBuilder.js"
import type { PhaseResult } from "./Phases.js"
import { calculateCertificateBalance, calculateProposalDeposits, calculateWithdrawals } from "./utils.js"

/**
 * Helper: Format assets for logging (BigInt-safe, truncates long unit names)
 */
const formatAssetsForLog = (assets: CoreAssets.Assets): string => {
  const parts: Array<string> = [`lovelace: ${CoreAssets.lovelaceOf(assets)}`]
  for (const unit of CoreAssets.getUnits(assets)) {
    const amount = CoreAssets.getByUnit(assets, unit)
    parts.push(`${unit.substring(0, 16)}...: ${amount.toString()}`)
  }
  return parts.join(", ")
}

/**
 * Balance Verification Phase
 *
 * Verifies that transaction inputs exactly equal outputs + change + fees.
 * Handles three scenarios: balanced (complete), shortfall (retry), or excess (burn/drain).
 *
 * **Decision Flow:**
 * ```
 * Calculate Delta: inputs - outputs - change - fees
 *   ↓
 * Delta == 0?
 *   ├─ YES → BALANCED: Complete transaction
 *   └─ NO → Check delta value
 *           ↓
 *        Delta > 0 (Excess)?
 *           ├─ YES → Check strategy
 *           │         ├─ DrainTo mode? → Merge into target output → Complete
 *           │         ├─ Burn mode? → Accept as implicit fee → Complete
 *           │         └─ Neither? → ERROR (bug in change creation)
 *           └─ NO (Delta < 0, Shortfall) → Return to changeCreation
 * ```
 *
 * **Key Principles:**
 * - Delta must equal exactly 0 (balanced) or negative (shortfall) in normal flow
 * - Positive delta only occurs in burn/drainTo strategies (controlled scenarios)
 * - Shortfall means change was underestimated; retry with adjusted fee
 * - DrainTo merges excess into a specified output for exact balancing
 * - Burn strategy treats excess as implicit fee (leftover becomes network fee)
 * - Native assets in delta indicate a bug (should never happen with proper change creation)
 * - This is the final verification gate before transaction completion
 */
export const executeBalance = (): Effect.Effect<
  PhaseResult,
  TransactionBuilderError,
  PhaseContextTag | TxContext | BuildOptionsTag
> =>
  Effect.gen(function* () {
    // Step 1: Get contexts and log start
    const ctx = yield* TxContext
    const buildCtxRef = yield* PhaseContextTag
    const buildCtx = yield* Ref.get(buildCtxRef)

    yield* Effect.logDebug(`[Balance] Starting balance verification (attempt ${buildCtx.attempt})`)

    // Step 2: Calculate delta = inputs + mint + withdrawals + refunds - outputs - change - fee - deposits
    const state = yield* Ref.get(ctx)
    const inputAssets = state.totalInputAssets
    const outputAssets = state.totalOutputAssets
    const mintAssets = mintToAssets(state.mint)

    // Calculate certificate deposits and refunds
    const { deposits: certificateDeposits, refunds: certificateRefunds } = calculateCertificateBalance(
      state.certificates,
      state.poolDeposits
    )

    // Calculate proposal deposits (governance actions require deposits)
    const proposalDeposits = calculateProposalDeposits(state.proposalProcedures)

    // Calculate total withdrawals
    const totalWithdrawals = calculateWithdrawals(state.withdrawals)

    // Calculate total change assets
    const changeAssets = buildCtx.changeOutputs.reduce(
      (acc, output) => CoreAssets.merge(acc, output.assets),
      CoreAssets.zero
    )

    // Delta = inputs + mint + withdrawals + refunds - outputs - change - fee - deposits
    // Mint adds assets (positive) or removes assets (negative for burns)
    // Withdrawals and refunds add to available balance (money IN)
    // Deposits subtract from available balance (money OUT)
    let delta = CoreAssets.merge(inputAssets, mintAssets)
    delta = CoreAssets.addLovelace(delta, totalWithdrawals)
    delta = CoreAssets.addLovelace(delta, certificateRefunds)
    delta = CoreAssets.subtract(delta, outputAssets)
    delta = CoreAssets.subtract(delta, changeAssets)
    delta = CoreAssets.subtractLovelace(delta, buildCtx.calculatedFee)
    delta = CoreAssets.subtractLovelace(delta, certificateDeposits)
    delta = CoreAssets.subtractLovelace(delta, proposalDeposits)

    // Check if balanced: lovelace must be exactly 0 and all native assets must be 0
    const deltaLovelace = CoreAssets.lovelaceOf(delta)
    const isBalanced = deltaLovelace === 0n

    yield* Effect.logDebug(
      `[Balance] Inputs: ${formatAssetsForLog(inputAssets)}, ` +
        `Outputs: ${formatAssetsForLog(outputAssets)}, ` +
        `Change: ${formatAssetsForLog(changeAssets)}, ` +
        `Fee: ${buildCtx.calculatedFee}, ` +
        `Delta: ${formatAssetsForLog(delta)}, ` +
        `Balanced: ${isBalanced}`
    )

    // Step 3: Check if balanced (delta is empty) → complete or evaluate
    if (isBalanced) {
      yield* Effect.logDebug("[Balance] Transaction balanced!")

      // Check if transaction has scripts that need evaluation
      // Route to evaluation if there are:
      // 1. Resolved redeemers WITHOUT exUnits, OR
      // 2. Any deferred redeemers (need resolution before evaluation)
      if (EvaluationStateManager.hasUnevaluatedRedeemers(state.redeemers) || state.deferredRedeemers.size > 0) {
        yield* Effect.logDebug("[Balance] Unevaluated redeemers detected - routing to Evaluation phase")
        return { next: "evaluation" as const }
      }

      // Balanced and evaluated - transaction is complete
      // Note: Collateral already ran earlier (before ChangeCreation)
      yield* Effect.logDebug("[Balance] Transaction balanced and evaluated - complete!")
      return { next: "complete" as const }
    }

    // Step 4: Not balanced - check for native assets in delta (shouldn't happen)
    // getUnits always includes "lovelace" at index 0, so length > 1 means native assets present
    const hasNativeAssets = CoreAssets.getUnits(delta).length > 1
    if (hasNativeAssets) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: `Balance verification failed: Delta contains native assets. This indicates a bug in change creation logic.`,
          cause: { delta: formatAssetsForLog(delta) }
        })
      )
    }

    // Step 5: Handle imbalance (excess or shortfall)
    // Excess: inputs > outputs + change + fee
    if (deltaLovelace > 0n) {
      // Check if this is expected from burn strategy
      const buildOptions = yield* BuildOptionsTag
      const isBurnMode = buildOptions.onInsufficientChange === "burn" && buildCtx.changeOutputs.length === 0

      // Check if this is expected from drainTo strategy
      const isDrainToMode = buildOptions.drainTo !== undefined && buildCtx.changeOutputs.length === 0

      if (isDrainToMode) {
        // DrainTo mode: Merge positive delta (leftover after fee) into target output
        const drainToIndex = buildOptions.drainTo!
        const state = yield* Ref.get(ctx)
        const outputs = state.outputs

        // Validate drainTo index (should already be validated in Fallback, but double-check)
        if (drainToIndex < 0 || drainToIndex >= outputs.length) {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Invalid drainTo index: ${drainToIndex}. Must be between 0 and ${outputs.length - 1}`,
              cause: { drainToIndex, outputCount: outputs.length }
            })
          )
        }

        // Merge delta into target output
        const targetOutput = outputs[drainToIndex]
        const newAssets = CoreAssets.addLovelace(targetOutput.assets, deltaLovelace)

        // Create new TransactionOutput with updated assets
        const updatedOutput = new (targetOutput.constructor as any)({
          address: targetOutput.address,
          assets: newAssets,
          datumOption: targetOutput.datumOption,
          scriptRef: targetOutput.scriptRef
        })

        // Update outputs
        const newOutputs = [...outputs]
        newOutputs[drainToIndex] = updatedOutput

        // Recalculate totalOutputAssets
        const newTotalOutputAssets = newOutputs.reduce(
          (acc, output) => CoreAssets.merge(acc, output.assets),
          CoreAssets.zero
        )

        yield* Ref.update(ctx, (s) => ({
          ...s,
          outputs: newOutputs,
          totalOutputAssets: newTotalOutputAssets
        }))

        yield* Effect.logDebug(
          `[Balance] DrainTo mode: Merged ${deltaLovelace} lovelace into output[${drainToIndex}]. ` +
            `New output value: ${CoreAssets.lovelaceOf(newAssets)}. Transaction balanced.`
        )
        return { next: "complete" as const }
      } else if (isBurnMode) {
        // Burn mode: Positive delta is the burned leftover (becomes implicit fee)
        yield* Effect.logDebug(
          `[Balance] Burn mode: ${deltaLovelace} lovelace burned as implicit fee. ` + `Transaction balanced.`
        )
        return { next: "complete" as const }
      } else {
        // Check if this is from fee convergence (output count changed, fee reduced)
        // This happens when unfrack falls back from N outputs to 1 output:
        // - Change was created with fee for N outputs
        // - Transaction rebuilt with 1 output has smaller fee
        // - Delta is the fee difference that should go into change
        // Solution: Route back to ChangeCreation to recreate change with updated fee

        yield* Effect.logDebug(
          `[Balance] Positive delta detected: ${deltaLovelace} lovelace. ` +
            `Likely from fee reduction after output count change. ` +
            `Routing back to changeCreation for convergence.`
        )

        return { next: "changeCreation" as const }
      }
    }

    // Shortfall: inputs < outputs + change + fee
    // Return to changeCreation to recreate change with correct fee
    // If leftover < minLovelace, changeCreation will trigger selection

    yield* Effect.logDebug(
      `[Balance] Shortfall detected: ${-deltaLovelace} lovelace. ` +
        `Returning to changeCreation to adjust change output.`
    )

    return { next: "changeCreation" as const }
  })
