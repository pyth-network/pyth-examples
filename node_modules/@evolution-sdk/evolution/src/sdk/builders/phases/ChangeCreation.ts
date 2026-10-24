/**
 * Change Creation Phase - Change Output Generation
 *
 * Creates change outputs from leftover assets using a cascading retry strategy.
 * Handles both unfrack (N outputs) and single output approaches with fallback options.
 *
 * @module ChangeCreation
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import type * as CoreAddress from "../../../Address.js"
import * as CoreAssets from "../../../Assets/index.js"
import type * as TxOut from "../../../TxOut.js"
import * as CoreUTxO from "../../../UTxO.js"
import { mintToAssets } from "../operations/Mint.js"
import {
  AvailableUtxosTag,
  BuildOptionsTag,
  ChangeAddressTag,
  PhaseContextTag,
  ProtocolParametersTag,
  TransactionBuilderError,
  TxContext
} from "../TransactionBuilder.js"
import { calculateMinimumUtxoLovelace, txOutputToTransactionOutput } from "../TxBuilderImpl.js"
import * as Unfrack from "../Unfrack.js"
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
 * Get UTxOs that haven't been selected yet.
 * Uses Set for O(1) lookup instead of O(n) for better performance.
 */
const getAvailableUtxos = (
  allUtxos: ReadonlyArray<CoreUTxO.UTxO>,
  selectedUtxos: ReadonlyArray<CoreUTxO.UTxO>
): ReadonlyArray<CoreUTxO.UTxO> => {
  const selectedKeys = new Set(selectedUtxos.map((u) => CoreUTxO.toOutRefString(u)))
  return allUtxos.filter((utxo) => !selectedKeys.has(CoreUTxO.toOutRefString(utxo)))
}

/**
 * Helper: Create unfracked change outputs (multiple outputs)
 * Only called when unfrack option is enabled.
 * Returns change outputs array or empty array if unfrack is not viable.
 */
const createChangeOutputs = (
  leftoverAfterFee: CoreAssets.Assets,
  changeAddress: CoreAddress.Address,
  coinsPerUtxoByte: bigint
): Effect.Effect<ReadonlyArray<TxOut.TransactionOutput>, TransactionBuilderError, BuildOptionsTag> =>
  Effect.gen(function* () {
    // Empty leftover = no change needed
    if (CoreAssets.isEmpty(leftoverAfterFee)) {
      return []
    }

    // Create unfracked outputs with proper minUTxO calculation
    const buildOptions = yield* BuildOptionsTag
    const unfrackOptions = buildOptions.unfrack! // Safe: only called when unfrack is enabled

    const changeOutputs = yield* Unfrack.createUnfrackedChangeOutputs(
      changeAddress,
      leftoverAfterFee,
      unfrackOptions,
      coinsPerUtxoByte
    ).pipe(
      Effect.mapError(
        (err) =>
          new TransactionBuilderError({
            message: `Failed to create unfracked change outputs: ${err.message}`,
            cause: err
          })
      )
    )

    yield* Effect.logDebug(`[ChangeCreation] Created ${changeOutputs.length} unfracked change outputs`)

    return changeOutputs
  })

/**
 * Change Creation Phase
 *
 * Creates change outputs from leftover assets using a cascading retry strategy.
 * Both unfrack (N outputs) and single output follow the same retry pattern:
 * try with available funds → if insufficient, reselect (up to MAX_ATTEMPTS) → fallback.
 *
 * **Symmetric Retry Flow (Unfrack vs Single Output):**
 * ```
 * UNFRACK (N outputs)                    SINGLE OUTPUT (1 output)
 * ─────────────────────────────────────────────────────────────────
 *
 * Try: Create N outputs                  Try: Create 1 output
 * ↓                                      ↓
 * Check: leftover >= (minUTxO × N)?      Check: leftover >= minUTxO?
 * ↓                                      ↓
 * If NO (not affordable):                If NO (insufficient):
 *   ├─ attempt < MAX? → Reselect           ├─ attempt < MAX? → Reselect
 *   └─ attempt >= MAX? → Fallback          └─ attempt >= MAX? → Fallback
 *                                                               ↓
 * Fallback:                              Fallback:
 *   └─ Single output                       ├─ drainTo (merge into output)
 *       ├─ (retry/fallback)                ├─ burn (leftover → fee)
 *       └─ ...                             └─ error
 * ```
 *
 * **Detailed Flow:**
 * ```
 * 1. Calculate tentative leftover (inputs - outputs - contextFee)
 *
 * 2. If unfrack enabled and canUnfrack=true:
 *    → Try createUnfrackedChangeOutputs() (N outputs)
 *    → Success: store N outputs, goto FeeCalculation
 *    → Not affordable:
 *       ├─ If attempt < MAX_ATTEMPTS: reselect (add more UTxOs)
 *       └─ If attempt >= MAX_ATTEMPTS: canUnfrack=false, goto step 3
 *
 * 3. Single output approach:
 *    → Create 1 change output with leftover
 *    → Success: store 1 output, goto FeeCalculation
 *    → Not affordable:
 *       ├─ If attempt < MAX_ATTEMPTS: reselect (add more UTxOs)
 *       └─ If attempt >= MAX_ATTEMPTS: goto step 4
 *
 * 4. Insufficient change fallbacks (single-output only):
 *    a. If drainTo specified: merge into existing output
 *    b. If onInsufficientChange="burn": leftover becomes fee
 *    c. If onInsufficientChange="error": throw error
 * ```
 *
 * **Key Principles:**
 * - Unfrack and single output use SAME retry mechanism (reselection up to MAX_ATTEMPTS)
 * - Phase loop handles fee convergence (leftover recalculated each iteration)
 * - Last subdivision output absorbs remainder for exact balance
 * - canUnfrack flag prevents retry loops (once false, stays false)
 * - drainTo and burn are terminal fallbacks (single-output only)
 * - Unfrack outputs bypass drainTo/burn (they're already valid)
 */
export const executeChangeCreation = (): Effect.Effect<
  PhaseResult,
  TransactionBuilderError,
  PhaseContextTag | TxContext | ChangeAddressTag | BuildOptionsTag | ProtocolParametersTag | AvailableUtxosTag
> =>
  Effect.gen(function* () {
    const stateRef = yield* TxContext
    const buildCtxRef = yield* PhaseContextTag
    const buildCtx = yield* Ref.get(buildCtxRef)
    const changeAddress = yield* ChangeAddressTag
    const buildOptions = yield* BuildOptionsTag

    yield* Effect.logDebug(`[ChangeCreation] Fee from context: ${buildCtx.calculatedFee}`)

    // Step 2: Calculate leftover assets (inputs + mint + withdrawals + refunds - outputs - fee - deposits)
    const state = yield* Ref.get(stateRef)
    const inputAssets = state.totalInputAssets
    const outputAssets = state.totalOutputAssets
    const mintAssets = mintToAssets(state.mint)

    // Calculate certificate deposits and refunds
    const { deposits: certificateDeposits, refunds: certificateRefunds } = calculateCertificateBalance(
      state.certificates,
      state.poolDeposits
    )

    // Calculate proposal deposits
    const proposalDeposits = calculateProposalDeposits(state.proposalProcedures)

    // Calculate total withdrawals
    const totalWithdrawals = calculateWithdrawals(state.withdrawals)

    // Minted assets add to available (positive), burned assets subtract (negative)
    // Withdrawals and refunds add to available balance (money IN)
    // Deposits subtract from available balance (money OUT)
    let leftoverBeforeFee = CoreAssets.merge(inputAssets, mintAssets)
    leftoverBeforeFee = CoreAssets.addLovelace(leftoverBeforeFee, totalWithdrawals)
    leftoverBeforeFee = CoreAssets.addLovelace(leftoverBeforeFee, certificateRefunds)
    leftoverBeforeFee = CoreAssets.subtract(leftoverBeforeFee, outputAssets)
    leftoverBeforeFee = CoreAssets.subtractLovelace(leftoverBeforeFee, certificateDeposits)
    leftoverBeforeFee = CoreAssets.subtractLovelace(leftoverBeforeFee, proposalDeposits)

    // Subtract fee and filter out zero-quantity tokens (they shouldn't go into change output)
    const rawLeftover = CoreAssets.subtractLovelace(leftoverBeforeFee, buildCtx.calculatedFee)
    const tentativeLeftover = CoreAssets.filter(rawLeftover, (_unit, amount) => amount > 0n)

    // === SendAll Mode ===
    // If sendAllTo is set, create a single output with all remaining assets to the target address
    if (state.sendAllTo !== undefined) {
      yield* Effect.logDebug(
        `[ChangeCreation] SendAll mode: Creating output to ${state.sendAllTo} with ` +
          `${formatAssetsForLog(tentativeLeftover)}`
      )

      const leftoverLovelace = CoreAssets.lovelaceOf(tentativeLeftover)

      // Validate that we have enough for minUTxO
      const protocolParams = yield* ProtocolParametersTag
      const sendAllMinUtxo = yield* calculateMinimumUtxoLovelace({
        address: state.sendAllTo,
        assets: tentativeLeftover,
        coinsPerUtxoByte: protocolParams.coinsPerUtxoByte
      })

      if (leftoverLovelace < sendAllMinUtxo) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              `sendAll() failed: Insufficient funds to create valid output. ` +
              `Available: ${leftoverLovelace} lovelace, Required: ${sendAllMinUtxo} lovelace (minUTxO). ` +
              `The wallet balance after fees is too low to create a valid UTxO.`
          })
        )
      }

      // Create the sendAll output using the txOutputToTransactionOutput helper
      const sendAllOutput = yield* txOutputToTransactionOutput({
        address: state.sendAllTo,
        assets: tentativeLeftover
      })

      // Store sendAll output in changeOutputs (the standard pattern for outputs created during phases).
      // This follows the same convention as normal change outputs - outputs created during the
      // phase loop go in changeOutputs, while state.outputs contains user-specified outputs.
      yield* Ref.update(buildCtxRef, (ctx) => ({
        ...ctx,
        changeOutputs: [sendAllOutput]
      }))

      yield* Effect.logDebug(`[ChangeCreation] SendAll: Created output with ${formatAssetsForLog(tentativeLeftover)}`)

      return { next: "feeCalculation" as const }
    }

    // === Normal Change Creation ===
    // Step 3: Check if negative - return to selection immediately
    const leftoverLovelace = CoreAssets.lovelaceOf(tentativeLeftover)
    if (leftoverLovelace < 0n) {
      const shortfall = -leftoverLovelace

      yield* Effect.logDebug(
        `[ChangeCreation] Insufficient lovelace for fee: ${leftoverLovelace}. ` +
          `Shortfall: ${shortfall}. Returning to selection.`
      )

      yield* Ref.update(buildCtxRef, (ctx) => ({
        ...ctx,
        shortfall,
        changeOutputs: []
      }))
      return { next: "selection" as const }
    }

    // Step 4: Affordability check - verify minimum (single output) is affordable
    const protocolParams = yield* ProtocolParametersTag
    const minLovelaceForSingle = yield* calculateMinimumUtxoLovelace({
      address: changeAddress,
      assets: tentativeLeftover,
      coinsPerUtxoByte: protocolParams.coinsPerUtxoByte
    })

    if (leftoverLovelace < minLovelaceForSingle) {
      // Not even affordable for single output - trigger reselection
      const shortfall = minLovelaceForSingle - leftoverLovelace
      const buildCtx = yield* Ref.get(buildCtxRef)
      const MAX_ATTEMPTS = 3

      // Check if leftover is ADA-only (no native assets)
      const isAdaOnlyLeftover = CoreAssets.hasOnlyLovelace(tentativeLeftover)

      // Check if we have available UTxOs for reselection
      const state = yield* Ref.get(stateRef)
      const alreadySelected = state.selectedUtxos
      const allAvailableUtxos = yield* AvailableUtxosTag
      const availableUtxos = getAvailableUtxos(allAvailableUtxos, alreadySelected)
      const hasMoreUtxos = availableUtxos.length > 0

      // Try reselection up to MAX_ATTEMPTS (if UTxOs available)
      if (hasMoreUtxos && buildCtx.attempt < MAX_ATTEMPTS) {
        yield* Effect.logDebug(
          `[ChangeCreation] Leftover ${leftoverLovelace} < ${minLovelaceForSingle} minUTxO ` +
            `(shortfall: ${shortfall}${isAdaOnlyLeftover ? ", ADA-only" : ", with native assets"}). ` +
            `Attempting reselection (${buildCtx.attempt + 1}/${MAX_ATTEMPTS})`
        )

        yield* Ref.update(buildCtxRef, (ctx) => ({
          ...ctx,
          shortfall,
          changeOutputs: []
        }))

        return { next: "selection" as const }
      }

      // No more UTxOs OR MAX_ATTEMPTS exhausted - check fallback options
      yield* Effect.logDebug(
        `[ChangeCreation] Cannot reselect: ${!hasMoreUtxos ? "No more UTxOs available" : `MAX_ATTEMPTS (${MAX_ATTEMPTS}) exhausted`}. ` +
          `Leftover (before fee): ${formatAssetsForLog(tentativeLeftover)}, minUTxO: ${minLovelaceForSingle}`
      )

      // CASE 1: Native assets present - cannot use drain/burn fallback
      if (!isAdaOnlyLeftover) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              `Cannot balance transaction: Native assets present in leftover ` +
              `but insufficient lovelace (${leftoverLovelace} < ${minLovelaceForSingle} minUTxO) ` +
              `after ${buildCtx.attempt} selection attempts.\n\n` +
              `Your leftover includes native assets (tokens) which require at least ` +
              `${minLovelaceForSingle} lovelace to create a valid change output, but only ` +
              `${leftoverLovelace} lovelace remains.\n\n` +
              `Solutions:\n` +
              `1. Include the native assets in your payment outputs\n` +
              `2. Add more lovelace to your wallet\n` +
              `3. Use fewer/smaller outputs to reduce fees`,
            cause: undefined
          })
        )
      }

      // CASE 2: ADA-only leftover - check if fallback strategies are configured
      const hasFallbackStrategy = buildOptions.drainTo !== undefined || buildOptions.onInsufficientChange === "burn"

      if (!hasFallbackStrategy) {
        // No fallback configured - fail with clear user-facing error
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              `Cannot create valid change: Insufficient funds to cover payment, fees, and minimum UTxO requirements.\n\n` +
              `Available: ${leftoverLovelace} lovelace\n` +
              `Required: At least ${minLovelaceForSingle} lovelace for change output\n\n` +
              `Solutions:\n` +
              `1. Add more funds to your wallet\n` +
              `2. Reduce payment amounts or number of outputs\n` +
              `3. Use drainTo(index) to merge leftover with an existing output\n` +
              `4. Use onInsufficientChange: 'burn' to explicitly burn leftover as extra fee`,
            cause: undefined
          })
        )
      }

      // Fallback strategies configured - proceed to Fallback phase
      return { next: "fallback" as const }
    }

    // Step 5: Unfrack path (single output IS affordable, try bundles/subdivision)
    if (buildOptions.unfrack && buildCtx.canUnfrack) {
      const protocolParams = yield* ProtocolParametersTag
      const changeOutputs = yield* createChangeOutputs(
        tentativeLeftover,
        changeAddress,
        protocolParams.coinsPerUtxoByte
      )

      yield* Effect.logDebug(`[ChangeCreation] Successfully created ${changeOutputs.length} unfracked outputs`)

      // Store outputs and proceed to fee calculation
      yield* Ref.update(buildCtxRef, (ctx) => ({
        ...ctx,
        changeOutputs
      }))
      return { next: "feeCalculation" as const }
    }

    // Step 6: Single output path - create single change output
    const singleOutput = yield* txOutputToTransactionOutput({
      address: changeAddress,
      assets: tentativeLeftover
    })

    yield* Ref.update(buildCtxRef, (ctx) => ({
      ...ctx,
      changeOutputs: [singleOutput]
    }))

    return { next: "feeCalculation" as const }
  })
