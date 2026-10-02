/**
 * Fee Calculation Phase
 *
 * Calculates transaction fee based on current inputs and outputs (including change).
 * Stores both calculated fee and leftover amount for the Balance phase to verify.
 *
 * @module FeeCalculation
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as CoreAssets from "../../../Assets/index.js"
import type { BuildOptionsTag, TransactionBuilderError } from "../TransactionBuilder.js"
import { PhaseContextTag, ProtocolParametersTag, TxContext } from "../TransactionBuilder.js"
import { buildTransactionInputs, calculateFeeIteratively, calculateReferenceScriptFee } from "../TxBuilderImpl.js"
import type { PhaseResult } from "./Phases.js"

/**
 * Fee Calculation Phase
 *
 * Calculates transaction fee based on current inputs and outputs (including change).
 * Stores both calculated fee and leftover amount for the Balance phase to verify.
 * This phase is deterministic once inputs and outputs are fixed.
 *
 * **Decision Flow:**
 * ```
 * Combine Inputs & Outputs
 * (base outputs + change outputs)
 *   ↓
 * Calculate Fee Iteratively
 * (account for changing tx size during fee calculation)
 *   ↓
 * Calculate Leftover After Fee
 * (inputs - outputs - change - fee)
 *   ↓
 * Store Fee & Leftover
 * (in build context for Balance phase)
 *   ↓
 * goto balance
 * ```
 *
 * **Key Principles:**
 * - Fee calculation is deterministic given fixed inputs/outputs/change
 * - Iterative calculation accounts for fee size affecting tx size
 * - Leftover = inputs - outputs - change - fee (can be 0, positive, or negative)
 * - Positive leftover triggers Balance → drainTo/burn strategies
 * - Negative leftover (shortfall) triggers Balance → reselection
 * - Zero leftover means perfectly balanced (ideal case)
 * - Change outputs are always included in fee calculation
 * - Fee is stored in context for Balance phase validation
 * - No phase retries here; Balance phase decides next step based on leftover
 */
export const executeFeeCalculation = (): Effect.Effect<
  PhaseResult,
  TransactionBuilderError,
  PhaseContextTag | TxContext | ProtocolParametersTag | BuildOptionsTag
> =>
  Effect.gen(function* () {
    // Step 1: Get contexts and current state
    const ctx = yield* TxContext
    const buildCtxRef = yield* PhaseContextTag
    const buildCtx = yield* Ref.get(buildCtxRef)

    const state = yield* Ref.get(ctx)
    const selectedUtxos = state.selectedUtxos
    const baseOutputs = state.outputs

    // Step 2: Build transaction inputs
    const inputs = yield* buildTransactionInputs(selectedUtxos)

    // Step 3: Combine base outputs + change outputs
    yield* Effect.logDebug(
      `[FeeCalculation] Starting fee calculation with ${baseOutputs.length} base outputs + ${buildCtx.changeOutputs.length} change outputs`
    )

    const allOutputs = [...baseOutputs, ...buildCtx.changeOutputs]

    // Step 4: Calculate base fee WITH change outputs
    const protocolParams = yield* ProtocolParametersTag
    const baseFee = yield* calculateFeeIteratively(selectedUtxos, inputs, allOutputs, state.redeemers, {
      minFeeCoefficient: protocolParams.minFeeCoefficient,
      minFeeConstant: protocolParams.minFeeConstant,
      priceMem: protocolParams.priceMem,
      priceStep: protocolParams.priceStep
    })

    yield* Effect.logDebug(`[FeeCalculation] Base fee: ${baseFee}`)

    // Step 4a: Add reference script fee for scripts on spent inputs and reference inputs
    const costPerByte = protocolParams.minFeeRefScriptCostPerByte ?? 44
    const refScriptFee = yield* calculateReferenceScriptFee(
      [...state.selectedUtxos, ...state.referenceInputs],
      costPerByte
    )
    yield* Effect.logDebug(`[FeeCalculation] Reference script fee: ${refScriptFee}`)

    const calculatedFee = baseFee + refScriptFee
    yield* Effect.logDebug(`[FeeCalculation] Total fee: ${calculatedFee}`)

    // Step 5: Calculate leftover after fee NOW (after fee is known)
    const inputAssets = state.totalInputAssets
    const outputAssets = state.totalOutputAssets
    const leftoverBeforeFee = CoreAssets.subtract(inputAssets, outputAssets)

    const leftoverAfterFee = CoreAssets.subtractLovelace(leftoverBeforeFee, calculatedFee)

    // Step 6: Store both fee and leftoverAfterFee in context
    yield* Ref.update(buildCtxRef, (ctx) => ({
      ...ctx,
      calculatedFee,
      leftoverAfterFee
    }))

    return { next: "balance" as const }
  })
