/**
 * Evaluation Phase
 *
 * Executes UPLC validators to compute execution units (ExUnits) for redeemers.
 * Re-evaluation occurs every time the Balance phase completes with scripts present.
 *
 * @module Evaluation
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as Bytes from "../../../Bytes.js"
import * as CostModel from "../../../CostModel.js"
import { INT64_MAX } from "../../../Numeric.js"
import * as PolicyId from "../../../PolicyId.js"
import * as CoreUTxO from "../../../UTxO.js"
import type * as Provider from "../../provider/Provider.js"
import * as EvaluationStateManager from "../EvaluationStateManager.js"
import type { IndexedInput } from "../RedeemerBuilder.js"
import {
  BuildOptionsTag,
  type DeferredRedeemerData,
  type EvaluationContext,
  EvaluationError,
  PhaseContextTag,
  type RedeemerData,
  type ScriptFailure,
  TransactionBuilderError,
  TxBuilderConfigTag,
  TxContext
} from "../TransactionBuilder.js"
import { assembleTransaction, buildTransactionInputs } from "../TxBuilderImpl.js"
import type { PhaseResult } from "./Phases.js"
import { voterToKey } from "./utils.js"

/**
 * Convert ProtocolParameters cost models to CostModels core type for evaluation.
 *
 * Takes the cost models from protocol parameters (Record<string, number> format)
 * and converts them to the CostModels core type.
 */
const buildCostModels = (
  protocolParams: Provider.ProtocolParameters
): Effect.Effect<CostModel.CostModels, TransactionBuilderError> =>
  Effect.gen(function* () {
    // Convert Record<string, number> format to bigint arrays
    const plutusV1Costs = Object.values(protocolParams.costModels.PlutusV1).map((v) => BigInt(v))
    const plutusV2Costs = Object.values(protocolParams.costModels.PlutusV2)
      .map((v) => BigInt(v))
      // Filter out devnet placeholder values (2^63) that overflow i64 in WASM CBOR decoder
      .filter((v) => v <= INT64_MAX)
    const plutusV3Costs = Object.values(protocolParams.costModels.PlutusV3).map((v) => BigInt(v))

    // Create and return CostModels instance
    return new CostModel.CostModels({
      PlutusV1: new CostModel.CostModel({ costs: plutusV1Costs }),
      PlutusV2: new CostModel.CostModel({ costs: plutusV2Costs }),
      PlutusV3: new CostModel.CostModel({ costs: plutusV3Costs })
    })
  })

/**
 * Enrich raw script failures with labels and context from builder state.
 *
 * Takes raw failures (from evaluator) and adds user-provided labels,
 * UTxO references, credentials, and policy IDs based on index mappings.
 */
const enrichFailuresWithLabels = (
  failures: ReadonlyArray<ScriptFailure>,
  redeemers: Map<string, RedeemerData>,
  inputIndexMapping: Map<number, string>,
  withdrawalIndexMapping: Map<number, string>,
  mintIndexMapping: Map<number, string>,
  certIndexMapping: Map<number, string>,
  voteIndexMapping: Map<number, string>
): Array<ScriptFailure> => {
  return failures.map((failure) => {
    const { index, purpose } = failure

    // Look up the redeemer key based on purpose and index
    let redeemerKey: string | undefined
    let label: string | undefined
    let utxoRef: string | undefined
    let credential: string | undefined
    let policyId: string | undefined

    if (purpose === "spend") {
      redeemerKey = inputIndexMapping.get(index)
      utxoRef = redeemerKey
    } else if (purpose === "withdraw" || purpose === "reward") {
      redeemerKey = withdrawalIndexMapping.get(index)
      credential = redeemerKey?.replace("reward:", "")
    } else if (purpose === "mint") {
      redeemerKey = mintIndexMapping.get(index)
      policyId = redeemerKey
    } else if (purpose === "publish" || purpose === "cert") {
      redeemerKey = certIndexMapping.get(index)
      credential = redeemerKey?.replace("cert:", "")
    } else if (purpose === "vote") {
      redeemerKey = voteIndexMapping.get(index)
    }

    // Look up label from redeemer state
    if (redeemerKey) {
      const redeemer = redeemers.get(redeemerKey)
      label = redeemer?.label
    }

    return {
      ...failure,
      label,
      redeemerKey,
      utxoRef,
      credential,
      policyId
    }
  })
}

/**
 * Resolve deferred redeemers using the final sorted input list.
 *
 * This function is called after coin selection completes, converting
 * SelfRedeemerFn and BatchRedeemerBuilder into resolved RedeemerData.
 *
 */
const resolveDeferredRedeemers = (
  deferredRedeemers: Map<string, DeferredRedeemerData>,
  sortedUtxos: ReadonlyArray<CoreUTxO.UTxO>,
  inputIndexMapping: Map<number, string>
): Effect.Effect<Map<string, RedeemerData>, TransactionBuilderError> =>
  Effect.gen(function* () {
    const resolved = new Map<string, RedeemerData>()

    // Build reverse mapping: UTxO ref -> index
    const refToIndex = new Map<string, number>()
    for (const [index, ref] of inputIndexMapping.entries()) {
      refToIndex.set(ref, index)
    }

    // Build UTxO lookup: ref -> UTxO
    const refToUtxo = new Map<string, CoreUTxO.UTxO>()
    for (const utxo of sortedUtxos) {
      refToUtxo.set(CoreUTxO.toOutRefString(utxo), utxo)
    }

    // Process each deferred redeemer
    for (const [key, deferredData] of deferredRedeemers.entries()) {
      const { deferred, exUnits, tag } = deferredData

      if (deferred._tag === "static") {
        // Static mode - should not be in deferredRedeemers, but handle anyway
        resolved.set(key, {
          tag,
          data: deferred.data,
          exUnits
        })
      } else if (deferred._tag === "self") {
        // Self mode - invoke callback with this input's IndexedInput
        const index = refToIndex.get(key)
        const utxo = refToUtxo.get(key)

        if (index === undefined || !utxo) {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Self redeemer for ${key} could not be resolved: UTxO is not present in the transaction inputs`
            })
          )
        }

        const indexedInput: IndexedInput = { index, utxo }

        const data = yield* Effect.try({
          try: () => deferred.fn(indexedInput),
          catch: (error) =>
            new TransactionBuilderError({
              message: `Self redeemer function failed for ${key}`,
              cause: error
            })
        })

        resolved.set(key, { tag, data, exUnits })
        yield* Effect.logDebug(`[Evaluation] Resolved self redeemer for ${key} at index ${index}`)
      } else if (deferred._tag === "batch") {
        // Batch mode - invoke callback with all specified inputs
        const batchInputs: Array<IndexedInput> = []

        for (const utxo of deferred.inputs) {
          const ref = CoreUTxO.toOutRefString(utxo)
          const index = refToIndex.get(ref)

          if (index === undefined) {
            yield* Effect.logWarning(`[Evaluation] Batch input ${ref} not found in transaction - skipping`)
            continue
          }

          batchInputs.push({ index, utxo })
        }

        if (batchInputs.length === 0) {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Batch redeemer for ${key} has no resolved inputs: none of the specified UTxOs are present in the transaction`
            })
          )
        }

        // Sort by index for consistent ordering
        batchInputs.sort((a, b) => a.index - b.index)

        const data = yield* Effect.try({
          try: () => deferred.fn(batchInputs),
          catch: (error) =>
            new TransactionBuilderError({
              message: `Batch redeemer function failed for ${key}`,
              cause: error
            })
        })

        resolved.set(key, { tag, data, exUnits })
        yield* Effect.logDebug(`[Evaluation] Resolved batch redeemer for ${key} with ${batchInputs.length} inputs`)
      }
    }

    return resolved
  })

/**
 * Evaluation Phase
 *
 * Executes UPLC validators to determine execution units (ExUnits) for script redeemers.
 * This phase is triggered after Balance when scripts are present in the transaction.
 *
 * **Flow:**
 * ```
 * Balance (balanced && hasScripts)
 *   ↓
 * Evaluation
 *   ├─ Build transaction CBOR
 *   ├─ Prepare evaluation context (cost models, slot config, etc.)
 *   ├─ Execute UPLC evaluator
 *   ├─ Match results to redeemers by tag+index
 *   ├─ Update redeemer ExUnits
 *   └─ Route to FeeCalculation (fee needs recalc with new ExUnits)
 * ```
 *
 * **Key Principles:**
 * - Re-evaluation happens every Balance pass (no change detection)
 * - Loop prevention via existing MAX_BALANCE_ATTEMPTS
 * - Evaluation errors fail immediately (no fallback)
 * - ExUnits affect transaction size → affect fees → may change balance
 * - Process repeats until transaction stabilizes or max attempts reached
 *
 * **Why Re-evaluation is Mandatory:**
 * Validators can check outputs, fees, or other transaction properties that change
 * after reselection or fee adjustments. Re-evaluation ensures ExUnits remain valid
 * for the final transaction structure.
 */
export const executeEvaluation = (): Effect.Effect<
  PhaseResult,
  TransactionBuilderError,
  BuildOptionsTag | TxContext | PhaseContextTag | TxBuilderConfigTag
> =>
  Effect.gen(function* () {
    yield* Effect.logDebug("[Evaluation] Starting UPLC evaluation")

    // Step 1: Get contexts
    const ctx = yield* TxContext
    const buildOptions = yield* BuildOptionsTag
    const buildCtxRef = yield* PhaseContextTag
    const buildCtx = yield* Ref.get(buildCtxRef)
    const config = yield* TxBuilderConfigTag
    const state = yield* Ref.get(ctx)

    // Step 2: Get evaluator from BuildOptions or fail
    // Note: The evaluator can come from either:
    // 1. BuildOptions.evaluator (explicit evaluator provided by user)
    // 2. Provider.evaluateTx (wrapped as Evaluator during build setup)
    // The resolution happens in TransactionBuilder.makeBuild via resolveEvaluator()
    const evaluator = buildOptions.evaluator

    if (!evaluator) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Script evaluation required but no evaluator provided in BuildOptions or config.provider",
          cause: { redeemerCount: state.redeemers.size }
        })
      )
    }

    // Step 2.5: Fetch full protocol parameters (needed for cost models and execution limits)
    if (!config.provider) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message:
            "Script evaluation requires a provider to fetch full protocol parameters (cost models, execution limits)",
          cause: { redeemerCount: state.redeemers.size }
        })
      )
    }

    const fullProtocolParams = yield* config.provider.Effect.getProtocolParameters().pipe(
      Effect.mapError(
        (providerError) =>
          new TransactionBuilderError({
            message: `Failed to fetch full protocol parameters for evaluation: ${providerError.message}`,
            cause: providerError
          })
      )
    )

    // Step 3: Check if there are redeemers to evaluate (resolved or deferred)
    const hasResolvedRedeemers = state.redeemers.size > 0
    const hasDeferredRedeemers = state.deferredRedeemers.size > 0

    if (!hasResolvedRedeemers && !hasDeferredRedeemers) {
      yield* Effect.logDebug("[Evaluation] No redeemers found - skipping evaluation")
      return { next: "feeCalculation" as const }
    }

    // Step 3.5: Check if redeemers already have exUnits (already evaluated)
    // If all redeemers have non-zero exUnits, skip re-evaluation to prevent infinite loops
    // Note: We only check resolved redeemers - deferred ones need resolution first
    if (
      hasResolvedRedeemers &&
      !hasDeferredRedeemers &&
      EvaluationStateManager.allRedeemersEvaluated(state.redeemers)
    ) {
      yield* Effect.logDebug("[Evaluation] All redeemers already evaluated - skipping re-evaluation")
      return { next: "feeCalculation" as const }
    }

    yield* Effect.logDebug(
      `[Evaluation] Processing ${state.redeemers.size} resolved + ${state.deferredRedeemers.size} deferred redeemer(s)`
    )

    // Step 4: Build transaction for evaluation AND get input index mapping
    // We need to assemble the current transaction state into a Transaction object
    // IMPORTANT: We also need to know which input index corresponds to which UTxO
    // so we can match evaluation results back to our redeemers in state
    const inputIndexMapping = new Map<number, string>() // index -> "txHash#outputIndex"

    // Build inputs from selectedUtxos (this will sort them canonically)
    const sortedUtxos = Array.from(state.selectedUtxos.values()).sort((a, b) => {
      // MUST use same sorting as buildTransactionInputs: byte comparison of tx hash
      const hashA = a.transactionId.hash
      const hashB = b.transactionId.hash

      for (let i = 0; i < hashA.length; i++) {
        if (hashA[i] !== hashB[i]) {
          return hashA[i]! - hashB[i]!
        }
      }

      // If hashes equal, compare by output index
      return Number(a.index - b.index)
    })

    // Build the mapping while preserving the same order
    for (let i = 0; i < sortedUtxos.length; i++) {
      const utxo = sortedUtxos[i]!
      const key = CoreUTxO.toOutRefString(utxo)
      inputIndexMapping.set(i, key)
      yield* Effect.logDebug(`[Evaluation] Input ${i} maps to UTxO: ${key}`)
    }

    // Step 4.5: Resolve deferred redeemers now that we have final input indices
    if (hasDeferredRedeemers) {
      yield* Effect.logDebug(`[Evaluation] Resolving ${state.deferredRedeemers.size} deferred redeemer(s)`)

      const resolvedDeferred = yield* resolveDeferredRedeemers(state.deferredRedeemers, sortedUtxos, inputIndexMapping)

      // Merge resolved deferred redeemers into state.redeemers
      yield* Ref.update(ctx, (s) => {
        const mergedRedeemers = new Map(s.redeemers)
        for (const [key, data] of resolvedDeferred.entries()) {
          mergedRedeemers.set(key, data)
        }
        return {
          ...s,
          redeemers: mergedRedeemers,
          deferredRedeemers: new Map() // Clear deferred after resolution
        }
      })

      yield* Effect.logDebug(`[Evaluation] Resolved ${resolvedDeferred.size} deferred redeemer(s)`)
    }

    // Re-read state after deferred resolution
    const updatedState = yield* Ref.get(ctx)

    // Build mint index mapping: index → policyIdHex
    // Mint redeemers are indexed by sorted policy ID order
    const mintIndexMapping = new Map<number, string>()
    if (updatedState.mint && updatedState.mint.map.size > 0) {
      const sortedPolicyIds = Array.from(updatedState.mint.map.keys())
        .map((pid) => PolicyId.toHex(pid))
        .sort()

      for (let i = 0; i < sortedPolicyIds.length; i++) {
        mintIndexMapping.set(i, sortedPolicyIds[i]!)
        yield* Effect.logDebug(`[Evaluation] Mint ${i} maps to policy: ${sortedPolicyIds[i]}`)
      }
    }

    // Build certificate index mapping: index → "cert:{credentialHex}"
    // Certificate redeemers are indexed by their position in the certificates array
    const certIndexMapping = new Map<number, string>()
    for (let i = 0; i < updatedState.certificates.length; i++) {
      const cert = updatedState.certificates[i]!
      // Handle stake-related certificates (stakeCredential)
      if ("stakeCredential" in cert && cert.stakeCredential) {
        const credHex = Bytes.toHex(cert.stakeCredential.hash)
        const key = `cert:${credHex}`
        certIndexMapping.set(i, key)
        yield* Effect.logDebug(`[Evaluation] Cert ${i} maps to stake credential: ${key}`)
      }
      // Handle DRep-related certificates (drepCredential): RegDrepCert, UnregDrepCert, UpdateDrepCert
      else if ("drepCredential" in cert && cert.drepCredential) {
        const credHex = Bytes.toHex(cert.drepCredential.hash)
        const key = `cert:${credHex}`
        certIndexMapping.set(i, key)
        yield* Effect.logDebug(`[Evaluation] Cert ${i} maps to drep credential: ${key}`)
      }
    }

    // Build withdrawal index mapping: index → "reward:{credentialHex}"
    // Withdrawals are sorted by credential hash for canonical ordering
    const withdrawalIndexMapping = new Map<number, string>()
    if (updatedState.withdrawals.size > 0) {
      const sortedWithdrawals = Array.from(updatedState.withdrawals.entries()).sort((a, b) => {
        const aHex = Bytes.toHex(a[0].stakeCredential.hash)
        const bHex = Bytes.toHex(b[0].stakeCredential.hash)
        return aHex.localeCompare(bHex)
      })

      for (let i = 0; i < sortedWithdrawals.length; i++) {
        const [rewardAccount] = sortedWithdrawals[i]!
        const credHex = Bytes.toHex(rewardAccount.stakeCredential.hash)
        const key = `reward:${credHex}`
        withdrawalIndexMapping.set(i, key)
        yield* Effect.logDebug(`[Evaluation] Withdrawal ${i} maps to credential: ${key}`)
      }
    }

    // Build vote index mapping: index → "drep:{credentialHex}" | "cc:{credentialHex}" | "pool:{poolKeyHashHex}"
    // Votes are sorted by voter key lexicographically (matching CBOR sorting)
    const voteIndexMapping = new Map<number, string>()
    if (updatedState.votingProcedures) {
      const voters = Array.from(updatedState.votingProcedures.procedures.keys())
      const sortedVoterKeys: Array<string> = []

      for (const voter of voters) {
        sortedVoterKeys.push(voterToKey(voter))
      }

      sortedVoterKeys.sort()

      for (let i = 0; i < sortedVoterKeys.length; i++) {
        voteIndexMapping.set(i, sortedVoterKeys[i]!)
        yield* Effect.logDebug(`[Evaluation] Vote ${i} maps to voter: ${sortedVoterKeys[i]}`)
      }
    }

    const inputs = yield* buildTransactionInputs(sortedUtxos)
    const allOutputs = [...updatedState.outputs, ...buildCtx.changeOutputs]
    const transaction = yield* assembleTransaction(inputs, allOutputs, buildCtx.calculatedFee)

    // Debug: Log transaction details
    yield* Effect.logDebug(
      `[Evaluation] Transaction has ${transaction.body.inputs.length} inputs, ${transaction.body.outputs.length} outputs`
    )
    yield* Effect.logDebug(
      `[Evaluation] Transaction has ${transaction.body.referenceInputs?.length ?? 0} reference inputs`
    )
    yield* Effect.logDebug(`[Evaluation] Has collateral return: ${!!transaction.body.collateralReturn}`)
    if (transaction.body.collateralReturn) {
      const assets = transaction.body.collateralReturn.assets
      yield* Effect.logDebug(`[Evaluation] Collateral return lovelace: ${assets.lovelace}`)
      if (assets.multiAsset) {
        const assetCount = assets.multiAsset.map.size
        yield* Effect.logDebug(`[Evaluation] Collateral return has ${assetCount} asset policies`)
      }
    }

    // Step 6: Prepare evaluation context
    // Build cost models from full protocol parameters
    const costModels = yield* buildCostModels(fullProtocolParams)

    // Get slot configuration from BuildOptions (resolved from network or explicit override)
    const slotConfig = buildOptions.slotConfig ?? {
      zeroTime: 0n,
      zeroSlot: 0n,
      slotLength: 1000
    }

    const evaluationContext: EvaluationContext = {
      costModels,
      maxTxExSteps: fullProtocolParams.maxTxExSteps,
      maxTxExMem: fullProtocolParams.maxTxExMem,
      slotConfig
    }

    // Step 7: Call evaluator
    // Always pass additionalUtxos - provider-based evaluators ignore them by default
    // (they resolve UTxOs from chain). Custom evaluators (Aiken, Scalus) use them.
    // Use passAdditionalUtxos: true in BuildOptions to override for edge cases.
    const additionalUtxos = [...Array.from(updatedState.selectedUtxos.values()), ...updatedState.referenceInputs]

    const evalResults = yield* evaluator.evaluate(transaction, additionalUtxos, evaluationContext).pipe(
      Effect.mapError((evalError) => {
        // Enrich failures with labels from builder state
        // evalError.failures contains raw failures from evaluator (provider or aiken)
        const enrichedFailures = enrichFailuresWithLabels(
          evalError.failures ?? [],
          updatedState.redeemers,
          inputIndexMapping,
          withdrawalIndexMapping,
          mintIndexMapping,
          certIndexMapping,
          voteIndexMapping
        )

        // Create enhanced evaluation error with enriched failures
        const enhancedError = new EvaluationError({
          message: "Script evaluation failed",
          cause: evalError.cause,
          failures: enrichedFailures
        })

        return new TransactionBuilderError({
          message: `Script evaluation failed: ${evalError.message}`,
          cause: enhancedError
        })
      })
    )

    yield* Effect.logDebug(`[Evaluation] Received ${evalResults.length} evaluation result(s)`)

    // Validation: If we have redeemers but received zero results, something went wrong
    if (updatedState.redeemers.size > 0 && evalResults.length === 0) {
      yield* Effect.logError(
        `[Evaluation] Expected evaluation results for ${updatedState.redeemers.size} redeemer(s) but received 0 results. ` +
          `This may indicate a provider schema parsing issue or network error.`
      )
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: `Evaluation returned zero results despite having ${updatedState.redeemers.size} redeemer(s) to evaluate`,
          cause: new Error("Provider may have returned malformed response")
        })
      )
    }

    // Step 8: Match evaluation results to redeemers and update ExUnits
    // The evaluator returns results keyed by (tag, index) where index is the position in the transaction
    // Our state stores redeemers keyed by UTxO reference (txHash#outputIndex)
    // We built inputIndexMapping earlier to map from transaction position → UTxO reference

    // Build updated redeemers map with ExUnits from evaluation
    const evaluatedRedeemers = new Map(updatedState.redeemers)

    for (const evalRedeemer of evalResults) {
      if (evalRedeemer.redeemer_tag === "spend") {
        // For spend redeemers, map input index to UTxO reference
        const utxoRef = inputIndexMapping.get(evalRedeemer.redeemer_index)
        if (!utxoRef) {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned spend result at index ${evalRedeemer.redeemer_index} but no UTxO exists at that position in the transaction`
            })
          )
        }

        const redeemer = evaluatedRedeemers.get(utxoRef)
        if (redeemer) {
          // Update redeemer with ExUnits from evaluation
          evaluatedRedeemers.set(utxoRef, {
            ...redeemer,
            exUnits: evalRedeemer.ex_units
          })

          yield* Effect.logDebug(
            `[Evaluation] Updated redeemer at ${utxoRef} (spend:${evalRedeemer.redeemer_index}): ` +
              `mem=${evalRedeemer.ex_units.mem}, steps=${evalRedeemer.ex_units.steps}`
          )
        } else {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned spend result for ${utxoRef} but no redeemer exists in builder state for that UTxO`
            })
          )
        }
      } else if (evalRedeemer.redeemer_tag === "mint") {
        // For mint redeemers, map mint index to policy ID hex
        const policyIdHex = mintIndexMapping.get(evalRedeemer.redeemer_index)
        if (!policyIdHex) {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned mint result at index ${evalRedeemer.redeemer_index} but no policy exists at that position in the transaction`
            })
          )
        }

        const redeemer = evaluatedRedeemers.get(policyIdHex)
        if (redeemer) {
          // Update redeemer with ExUnits from evaluation
          evaluatedRedeemers.set(policyIdHex, {
            ...redeemer,
            exUnits: evalRedeemer.ex_units
          })

          yield* Effect.logDebug(
            `[Evaluation] Updated redeemer for policy ${policyIdHex} (mint:${evalRedeemer.redeemer_index}): ` +
              `mem=${evalRedeemer.ex_units.mem}, steps=${evalRedeemer.ex_units.steps}`
          )
        } else {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned mint result for policy ${policyIdHex} but no redeemer exists in builder state for that policy`
            })
          )
        }
      } else if (evalRedeemer.redeemer_tag === "cert") {
        // For certificate redeemers, map index to credential key
        const certKey = certIndexMapping.get(evalRedeemer.redeemer_index)
        if (!certKey) {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned cert result at index ${evalRedeemer.redeemer_index} but no certificate exists at that position in the transaction`
            })
          )
        }

        const redeemer = evaluatedRedeemers.get(certKey)
        if (redeemer) {
          // Update redeemer with ExUnits from evaluation
          evaluatedRedeemers.set(certKey, {
            ...redeemer,
            exUnits: evalRedeemer.ex_units
          })

          yield* Effect.logDebug(
            `[Evaluation] Updated redeemer for cert ${certKey} (publish:${evalRedeemer.redeemer_index}): ` +
              `mem=${evalRedeemer.ex_units.mem}, steps=${evalRedeemer.ex_units.steps}`
          )
        } else {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned cert result for ${certKey} but no redeemer exists in builder state for that credential`
            })
          )
        }
      } else if (evalRedeemer.redeemer_tag === "reward") {
        // For withdrawal redeemers, map index to credential key
        const rewardKey = withdrawalIndexMapping.get(evalRedeemer.redeemer_index)
        if (!rewardKey) {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned reward result at index ${evalRedeemer.redeemer_index} but no withdrawal exists at that position in the transaction`
            })
          )
        }

        const redeemer = evaluatedRedeemers.get(rewardKey)
        if (redeemer) {
          // Update redeemer with ExUnits from evaluation
          evaluatedRedeemers.set(rewardKey, {
            ...redeemer,
            exUnits: evalRedeemer.ex_units
          })

          yield* Effect.logDebug(
            `[Evaluation] Updated redeemer for withdrawal ${rewardKey} (reward:${evalRedeemer.redeemer_index}): ` +
              `mem=${evalRedeemer.ex_units.mem}, steps=${evalRedeemer.ex_units.steps}`
          )
        } else {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned reward result for ${rewardKey} but no redeemer exists in builder state for that withdrawal`
            })
          )
        }
      } else if (evalRedeemer.redeemer_tag === "vote") {
        // For vote redeemers, map index to voter key
        const voterKey = voteIndexMapping.get(evalRedeemer.redeemer_index)
        if (!voterKey) {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned vote result at index ${evalRedeemer.redeemer_index} but no voter exists at that position in the transaction`
            })
          )
        }

        const redeemer = evaluatedRedeemers.get(voterKey)
        if (redeemer) {
          // Update redeemer with ExUnits from evaluation
          evaluatedRedeemers.set(voterKey, {
            ...redeemer,
            exUnits: {
              mem: BigInt(evalRedeemer.ex_units.mem),
              steps: BigInt(evalRedeemer.ex_units.steps)
            }
          })

          yield* Effect.logDebug(
            `[Evaluation] Updated redeemer for vote ${voterKey} (vote:${evalRedeemer.redeemer_index}): ` +
              `mem=${evalRedeemer.ex_units.mem}, steps=${evalRedeemer.ex_units.steps}`
          )
        } else {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Evaluator returned vote result for ${voterKey} but no redeemer exists in builder state for that voter`
            })
          )
        }
      } else {
        // Unknown redeemer type returned by the evaluator — fail immediately.
        // Silently ignoring this would leave the redeemer at exUnits = 0, which
        // looks "unevaluated" to Balance and triggers an infinite retry loop.
        return yield* Effect.fail(
          new TransactionBuilderError({
            message: `Evaluator returned unknown redeemer tag "${evalRedeemer.redeemer_tag}" at index ${evalRedeemer.redeemer_index}. This is likely a provider bug or an unsupported evaluator format.`
          })
        )
      }
    }

    // Update state with evaluated redeemers
    yield* Ref.update(ctx, (s) => ({
      ...s,
      redeemers: evaluatedRedeemers
    }))

    yield* Effect.logDebug("[Evaluation] UPLC evaluation complete - routing to FeeCalculation")

    // Step 9: Route to FeeCalculation
    // Fee must be recalculated because ExUnits affect transaction size
    return { next: "feeCalculation" as const }
  })
