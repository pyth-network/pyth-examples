/**
 * Fallback Phase - Terminal Strategy Selection
 *
 * Handles insufficient change scenarios after MAX_ATTEMPTS exhausted in ChangeCreation.
 * Routes to one of two terminal strategies: drainTo (merge leftover) or burn (implicit fee).
 *
 * @module Fallback
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import { BuildOptionsTag, PhaseContextTag, TransactionBuilderError, TxContext } from "../TransactionBuilder.js"
import type { PhaseResult } from "./Phases.js"

/**
 * Fallback Phase - Terminal Strategy Selection
 *
 * Handles insufficient change scenarios after MAX_ATTEMPTS exhausted in ChangeCreation.
 * Routes to one of two terminal strategies: drainTo (merge leftover) or burn (implicit fee).
 * This phase is only reached when change creation cannot create a valid change output
 * and a fallback strategy is configured.
 *
 * **Decision Flow:**
 * ```
 * Fallback Phase Triggered
 * (MAX_ATTEMPTS exhausted in changeCreation)
 *   ↓
 * Check: drainTo configured?
 *   ├─ YES → Validate drainTo index
 *   │         ├─ Valid → Clear change outputs
 *   │         │          Return to feeCalculation
 *   │         │          (leftover merged in balance phase)
 *   │         └─ Invalid → ERROR (invalid output index)
 *   └─ NO → Check: burn strategy?
 *           ├─ YES → Clear change outputs
 *           │        Return to feeCalculation
 *           │        (leftover becomes implicit fee)
 *           └─ NO → ERROR (no strategy configured)
 *                   (ChangeCreation should prevent this)
 * ```
 *
 * **Key Principles:**
 * - Fallback only handles ADA-only leftover (ChangeCreation filters native asset cases)
 * - DrainTo merges excess into a specified output, deferring actual merge to Balance phase
 * - Burn strategy accepts leftover as implicit network fee
 * - Both strategies clear change outputs and recalculate fee (leftover not in outputs)
 * - Invalid drainTo index is caught here with validation
 * - Reaching fallback without a strategy configured indicates a bug in ChangeCreation routing
 * - Fee recalculation after clearing change ensures accurate final fee
 */
export const executeFallback = (): Effect.Effect<
  PhaseResult,
  TransactionBuilderError,
  PhaseContextTag | TxContext | BuildOptionsTag
> =>
  Effect.gen(function* () {
    yield* Effect.logDebug("Phase: Fallback")

    const ctx = yield* TxContext
    const buildCtxRef = yield* PhaseContextTag
    // Note: We don't merge the leftover here. Instead, we just clear change outputs
    // and let the balance phase handle the merge after fee calculation.
    // This avoids circular dependency: fee depends on outputs, but drain amount depends on fee.

    // ---------------------------------------------------------------
    // Strategy 1: drainTo - Merge leftover into existing output
    // ---------------------------------------------------------------

    const buildOptions = yield* BuildOptionsTag

    if (buildOptions.drainTo !== undefined) {
      // Validate drainTo index
      const state = yield* Ref.get(ctx)
      const outputs = state.outputs
      const drainToIndex = buildOptions.drainTo

      if (drainToIndex < 0 || drainToIndex >= outputs.length) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              `Invalid drainTo index: ${drainToIndex}. ` +
              `Transaction has ${outputs.length} output(s), valid indices are 0-${outputs.length - 1}.`,
            cause: {
              drainToIndex,
              totalOutputs: outputs.length
            }
          })
        )
      }

      // Clear change outputs - leftover will be merged in Balance phase
      yield* Ref.update(buildCtxRef, (ctx) => ({
        ...ctx,
        changeOutputs: []
      }))

      yield* Effect.logDebug(
        `[Fallback] DrainTo strategy: Change outputs cleared. ` +
          `Leftover will be merged into output[${drainToIndex}] after fee calculation.`
      )

      // Go to fee calculation to recalculate without change outputs
      return { next: "feeCalculation" as const }
    }

    // ---------------------------------------------------------------
    // Strategy 2: burn - Allow leftover as implicit fee
    // ---------------------------------------------------------------

    if (buildOptions.onInsufficientChange === "burn") {
      // Clear change outputs (leftover becomes part of fee)
      yield* Ref.update(buildCtxRef, (ctx) => ({
        ...ctx,
        changeOutputs: []
      }))

      yield* Effect.logDebug(
        `[Fallback] Burn strategy: Leftover will be burned as implicit fee ` +
          `(recalculating fee without change outputs).`
      )

      // Go to fee calculation to recalculate fee for transaction without change outputs
      return { next: "feeCalculation" as const }
    }

    // ---------------------------------------------------------------
    // Should never reach here
    // ---------------------------------------------------------------
    // ChangeCreation should only route to fallback if drainTo or burn is configured

    return yield* Effect.fail(
      new TransactionBuilderError({
        message:
          `[Fallback] CRITICAL BUG: Fallback phase reached without drainTo or burn configured. ` +
          `ChangeCreation should have prevented this.`,
        cause: {
          hasDrainTo: buildOptions.drainTo !== undefined,
          hasOnInsufficientChange: buildOptions.onInsufficientChange !== undefined
        }
      })
    )
  })
