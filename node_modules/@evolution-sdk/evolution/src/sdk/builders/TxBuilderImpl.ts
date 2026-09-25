// Effect-TS imports
import { Effect, Ref } from "effect"
import type * as Array from "effect/Array"

// Core imports
import * as CoreAddress from "../../Address.js"
import * as CoreAssets from "../../Assets/index.js"
import * as Bytes from "../../Bytes.js"
import type * as Certificate from "../../Certificate.js"
import * as CostModel from "../../CostModel.js"
import type * as PlutusData from "../../Data.js"
import type * as DatumOption from "../../DatumOption.js"
import * as Ed25519Signature from "../../Ed25519Signature.js"
import type * as KeyHash from "../../KeyHash.js"
import * as NativeScripts from "../../NativeScripts.js"
import type * as PlutusV1 from "../../PlutusV1.js"
import type * as PlutusV2 from "../../PlutusV2.js"
import type * as PlutusV3 from "../../PlutusV3.js"
import * as PolicyId from "../../PolicyId.js"
import * as Redeemer from "../../Redeemer.js"
import * as Redeemers from "../../Redeemers.js"
import type * as RewardAccount from "../../RewardAccount.js"
import * as CoreScript from "../../Script.js"
import * as ScriptDataHash from "../../ScriptDataHash.js"
import * as ScriptRef from "../../ScriptRef.js"
import * as Time from "../../Time/index.js"
import * as Transaction from "../../Transaction.js"
import * as TransactionBody from "../../TransactionBody.js"
import * as TransactionHash from "../../TransactionHash.js"
import * as TransactionInput from "../../TransactionInput.js"
import * as TransactionWitnessSet from "../../TransactionWitnessSet.js"
import * as TxOut from "../../TxOut.js"
import { hashAuxiliaryData, hashScriptData } from "../../utils/Hash.js"
import * as CoreUTxO from "../../UTxO.js"
import * as VKey from "../../VKey.js"
import * as Withdrawals from "../../Withdrawals.js"
// Internal imports
import { voterToKey } from "./phases/utils.js"
import type { UnfrackOptions } from "./TransactionBuilder.js"
import { BuildOptionsTag, TransactionBuilderError, TxBuilderConfigTag, TxContext } from "./TransactionBuilder.js"
import * as Unfrack from "./Unfrack.js"

// ============================================================================
// TransactionBuilder Effect Programs Implementation
// ============================================================================

/**
 * This file contains the program creators that generate ProgramSteps.
 * ProgramSteps are deferred Effects executed during build() with fresh state.
 *
 * Architecture:
 * - Program creators return deferred Effects (ProgramSteps)
 * - Programs access TxContext (single unified Context) containing config, state, and options
 * - Programs are executed with fresh state on each build() call
 * - No state mutation between builds - complete isolation
 * - No prop drilling - everything accessible via single Context
 */

// ============================================================================
// Helper Functions - Address Utilities
// ============================================================================

/**
 * Check if an address is a script address (payment credential is ScriptHash).
 * Works with Core Address type.
 *
 * @since 2.0.0
 * @category helpers
 */
export const isScriptAddressCore = (address: CoreAddress.Address): boolean => {
  return address.paymentCredential?._tag === "ScriptHash"
}

/**
 * Check if an address string is a script address (payment credential is ScriptHash).
 * Parses the address to extract its structure and checks the payment credential type.
 *
 * @since 2.0.0
 * @category helpers
 */
export const isScriptAddress = (address: string): Effect.Effect<boolean, TransactionBuilderError> =>
  Effect.gen(function* () {
    // Parse address to structure
    const addressStructure = yield* Effect.try({
      try: () => CoreAddress.fromBech32(address),
      catch: (error) =>
        new TransactionBuilderError({
          message: `Failed to parse address: ${address}`,
          cause: error
        })
    })

    // Check if payment credential is a script hash
    return addressStructure.paymentCredential._tag === "ScriptHash"
  })

/**
 * Filter UTxOs to find those locked by scripts (script-locked UTxOs).
 *
 * @since 2.0.0
 * @category helpers
 */
export const filterScriptUtxos = (
  utxos: ReadonlyArray<CoreUTxO.UTxO>
): Effect.Effect<ReadonlyArray<CoreUTxO.UTxO>, TransactionBuilderError> =>
  Effect.gen(function* () {
    const scriptUtxos: Array<CoreUTxO.UTxO> = []

    for (const utxo of utxos) {
      // Core UTxO has address as Address class, check directly
      if (isScriptAddressCore(utxo.address)) {
        scriptUtxos.push(utxo)
      }
    }

    return scriptUtxos
  })

// ============================================================================
// Helper Functions - Asset Utilities
// ============================================================================

/**
 * Calculate total assets from a set of UTxOs.
 *
 * @since 2.0.0
 * @category helpers
 */
export const calculateTotalAssets = (utxos: ReadonlyArray<CoreUTxO.UTxO> | Set<CoreUTxO.UTxO>): CoreAssets.Assets => {
  const utxoArray = (
    globalThis.Array.isArray(utxos) ? utxos : globalThis.Array.from(utxos)
  ) as ReadonlyArray<CoreUTxO.UTxO>
  return utxoArray.reduce(
    (total: CoreAssets.Assets, utxo: CoreUTxO.UTxO) => CoreAssets.merge(total, utxo.assets),
    CoreAssets.zero
  )
}

/**
 * Calculate reference script fees using tiered pricing.
 *
 * Direct port of the Cardano ledger's `tierRefScriptFee` function.
 * Each `sizeIncrement`-byte chunk is priced at `curTierPrice` per byte,
 * then `curTierPrice *= multiplier` for the next chunk. Final result: `floor(total)`.
 *
 * @since 2.0.0
 * @category helpers
 */
export const tierRefScriptFee = (multiplier: number, sizeIncrement: number, baseFee: number, totalSize: number): bigint => {
  let acc = 0
  let curTierPrice = baseFee
  let remaining = totalSize

  while (remaining >= sizeIncrement) {
    acc += sizeIncrement * curTierPrice
    curTierPrice *= multiplier
    remaining -= sizeIncrement
  }
  acc += remaining * curTierPrice

  return BigInt(Math.floor(acc))
}

/**
 * Calculate reference script fees using tiered pricing.
 *
 * Matches the Cardano node's `tierRefScriptFee` from Conway ledger:
 * - Stride: 25,600 bytes (hardcoded, becomes a protocol param post-Conway)
 * - Multiplier: 1.2× per tier (hardcoded, becomes a protocol param post-Conway)
 * - Base cost: `minFeeRefScriptCostPerByte` protocol parameter
 *
 * For each 25,600-byte chunk the price per byte increases by 1.2×.
 * The final (partial) chunk is charged proportionally. Result is `floor(total)`.
 *
 * The Cardano node sums scriptRef sizes from both spent inputs and reference
 * inputs (`txNonDistinctRefScriptsSize`), so callers must pass both.
 *
 * @param utxos - All UTxOs (spent inputs + reference inputs) to scan for scriptRefs
 * @param costPerByte - The minFeeRefScriptCostPerByte protocol parameter
 * @returns Total reference script fee in lovelace
 *
 * @since 2.0.0
 * @category helpers
 */
export const calculateReferenceScriptFee = (
  utxos: ReadonlyArray<CoreUTxO.UTxO>,
  costPerByte: number
): Effect.Effect<bigint, TransactionBuilderError> =>
  Effect.gen(function* () {
    let totalScriptSize = 0

    for (const utxo of utxos) {
      if (utxo.scriptRef) {
        const scriptBytes = CoreScript.toCBOR(utxo.scriptRef).length
        totalScriptSize += scriptBytes
        const scriptType = utxo.scriptRef._tag === "NativeScript" ? "Native" : "Plutus"
        yield* Effect.logDebug(`[RefScriptFee] ${scriptType} script: ${scriptBytes} bytes`)
      }
    }

    if (totalScriptSize === 0) {
      return 0n
    }

    yield* Effect.logDebug(`[RefScriptFee] Total reference script size: ${totalScriptSize} bytes`)

    if (totalScriptSize > 200_000) {
      // maxRefScriptSizePerTx from Conway ledger rules (CIP-0069 / CIP-0112)
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: `Total reference script size (${totalScriptSize} bytes) exceeds maximum limit of 200,000 bytes`
        })
      )
    }

    const fee = tierRefScriptFee(1.2, 25_600, costPerByte, totalScriptSize)
    yield* Effect.logDebug(`[RefScriptFee] Tiered fee: ${fee} lovelace`)

    return fee
  })

    // ============================================================================
    // Helper Functions - Output Construction
    // ============================================================================

    .pipe(
      Effect.mapError(
        (error) =>
          new TransactionBuilderError({
            message: `Failed to parse datum: ${error.message}`,
            cause: error
          })
      )
    )

/**
 * Create a TransactionOutput from user-friendly parameters.
 * Uses Core types directly.
 *
 * TransactionOutput represents an output being created in a transaction.
 *
 * @since 2.0.0
 * @category helpers
 */
export const makeTxOutput = (params: {
  address: CoreAddress.Address
  assets: CoreAssets.Assets
  datum?: DatumOption.DatumOption
  scriptRef?: CoreScript.Script
}): Effect.Effect<TxOut.TransactionOutput, never> =>
  Effect.gen(function* () {
    // Convert Script to ScriptRef for CBOR encoding if provided
    const scriptRefEncoded = params.scriptRef
      ? new ScriptRef.ScriptRef({ bytes: CoreScript.toCBOR(params.scriptRef) })
      : undefined

    // Create Core TransactionOutput directly with core types
    const output = new TxOut.TransactionOutput({
      address: params.address,
      assets: params.assets,
      datumOption: params.datum,
      scriptRef: scriptRefEncoded
    })

    return output
  })

/**
 * Convert parameters to core TransactionOutput.
 * This is an internal conversion function used during transaction assembly.
 * Now uses Core types directly.
 *
 * @since 2.0.0
 * @category helpers
 * @internal
 */
export const txOutputToTransactionOutput = (params: {
  address: CoreAddress.Address
  assets: CoreAssets.Assets
  datum?: DatumOption.DatumOption
  scriptRef?: CoreScript.Script
}): Effect.Effect<TxOut.TransactionOutput, never> =>
  Effect.gen(function* () {
    // Convert Script to ScriptRef for CBOR encoding if provided
    const scriptRefEncoded = params.scriptRef
      ? new ScriptRef.ScriptRef({ bytes: CoreScript.toCBOR(params.scriptRef) })
      : undefined

    // Create TransactionOutput directly with core types
    const output = new TxOut.TransactionOutput({
      address: params.address,
      assets: params.assets,
      datumOption: params.datum,
      scriptRef: scriptRefEncoded
    })

    return output
  })

/**
 * Merge additional assets into an existing UTxO.
 * Creates a new UTxO with combined assets from the original UTxO and additional assets.
 *
 * Use case: Draining wallet by merging leftover into an existing payment output.
 *
 * @since 2.0.0
 * @category helpers
 */
export const mergeAssetsIntoUTxO = (
  utxo: CoreUTxO.UTxO,
  additionalAssets: CoreAssets.Assets
): Effect.Effect<CoreUTxO.UTxO, never> =>
  Effect.gen(function* () {
    // Merge assets using Core Assets helper
    const mergedAssets = CoreAssets.merge(utxo.assets, additionalAssets)
    // Create new UTxO with merged assets
    return new CoreUTxO.UTxO({
      transactionId: utxo.transactionId,
      index: utxo.index,
      address: utxo.address,
      assets: mergedAssets,
      datumOption: utxo.datumOption,
      scriptRef: utxo.scriptRef
    })
  })

/**
 * Merge additional assets into an existing TransactionOutput.
 * Creates a new output with combined assets from the original output and leftover assets.
 *
 * Use case: Draining wallet by merging leftover into an existing payment output.
 *
 * @since 2.0.0
 * @category helpers
 */
export const mergeAssetsIntoOutput = (
  output: TxOut.TransactionOutput,
  additionalAssets: CoreAssets.Assets
): Effect.Effect<TxOut.TransactionOutput, never> =>
  Effect.gen(function* () {
    // Merge assets using Core Assets helper
    const mergedAssets = CoreAssets.merge(output.assets, additionalAssets)

    // Create new output with merged assets, preserving optional fields
    const newOutput = new TxOut.TransactionOutput({
      address: output.address,
      assets: mergedAssets,
      datumOption: output.datumOption,
      scriptRef: output.scriptRef
    })
    return newOutput
  })

// ============================================================================
// Transaction Assembly
// ============================================================================

/**
 * Convert an array of UTxOs to an array of TransactionInputs.
 * Inputs are sorted by txHash then outputIndex for deterministic ordering.
 * Uses Core UTxO types directly.
 *
 * @since 2.0.0
 * @category assembly
 */
export const buildTransactionInputs = (
  utxos: ReadonlyArray<CoreUTxO.UTxO>
): Effect.Effect<ReadonlyArray<TransactionInput.TransactionInput>, never> =>
  Effect.gen(function* () {
    // Convert each Core UTxO to TransactionInput
    const inputs: Array<TransactionInput.TransactionInput> = []

    for (const utxo of utxos) {
      // Create TransactionInput directly from Core UTxO fields
      const input = new TransactionInput.TransactionInput({
        transactionId: utxo.transactionId,
        index: utxo.index
      })

      inputs.push(input)
    }

    // Sort inputs for deterministic ordering:
    // First by transaction hash, then by output index
    inputs.sort((a, b) => {
      // Compare transaction hashes (byte arrays)
      const hashA = a.transactionId.hash
      const hashB = b.transactionId.hash

      for (let i = 0; i < hashA.length; i++) {
        if (hashA[i] !== hashB[i]) {
          return hashA[i] - hashB[i]
        }
      }

      // If hashes are equal, compare by index
      return Number(a.index - b.index)
    })

    return inputs
  })

/**
 * Assemble a Transaction from inputs, outputs, and calculated fee.
 * Creates TransactionBody with all required fields.
 *
 * Uses Core TransactionOutput directly.
 *
 * This is minimal assembly with accurate fee:
 * - Build witness set with redeemers and signatures (Step 4 - future)
 * - Run script evaluation to fill ExUnits (Step 5 - future)
 * - Add change output (Step 6 - future)
 *
 * @since 2.0.0
 * @category assembly
 */
export const assembleTransaction = (
  inputs: ReadonlyArray<TransactionInput.TransactionInput>,
  outputs: ReadonlyArray<TxOut.TransactionOutput>,
  fee: bigint
): Effect.Effect<Transaction.Transaction, TransactionBuilderError, TxContext | TxBuilderConfigTag | BuildOptionsTag> =>
  Effect.gen(function* () {
    // Get state ref to access scripts and redeemers
    const stateRef = yield* TxContext
    const state = yield* Ref.get(stateRef)

    yield* Effect.logDebug(`[Assembly] Building transaction with ${inputs.length} inputs, ${outputs.length} outputs`)
    yield* Effect.logDebug(`[Assembly] Reference inputs in state: ${state.referenceInputs.length}`)
    yield* Effect.logDebug(`[Assembly] Scripts in state: ${state.scripts.size}`)
    yield* Effect.logDebug(`[Assembly] Redeemers in state: ${state.redeemers.size}`)

    // Outputs are already Core TransactionOutputs
    const transactionOutputs = outputs as Array<TxOut.TransactionOutput>

    // Build collateral inputs if present
    let collateralInputs: Array.NonEmptyReadonlyArray<TransactionInput.TransactionInput> | undefined
    let collateralReturn: TxOut.TransactionOutput | undefined
    let totalCollateral: bigint | undefined

    if (state.collateral) {
      yield* Effect.logDebug(
        `[Assembly] Adding collateral: ${state.collateral.inputs.length} inputs, ` +
          `total ${state.collateral.totalAmount} lovelace`
      )

      // Collateral phase guarantees at least one input for script transactions
      collateralInputs = (yield* buildTransactionInputs(
        state.collateral.inputs
      )) as Array.NonEmptyReadonlyArray<TransactionInput.TransactionInput>
      totalCollateral = state.collateral.totalAmount

      // Collateral return is already a Core TransactionOutput
      if (state.collateral.returnOutput) {
        yield* Effect.logDebug(
          `[Assembly] Collateral return lovelace: ${state.collateral.returnOutput.assets.lovelace}`
        )
        collateralReturn = state.collateral.returnOutput
      }
    }

    // Convert reference inputs from UTxOs to TransactionInputs (only if there are any)
    let referenceInputs:
      | readonly [TransactionInput.TransactionInput, ...Array<TransactionInput.TransactionInput>]
      | undefined
    if (state.referenceInputs.length > 0) {
      const refInputs = yield* buildTransactionInputs(state.referenceInputs)
      referenceInputs = refInputs as readonly [
        TransactionInput.TransactionInput,
        ...Array<TransactionInput.TransactionInput>
      ]
    }

    // Populate witness set with scripts from state
    const plutusV1Scripts: Array<PlutusV1.PlutusV1> = []
    const plutusV2Scripts: Array<PlutusV2.PlutusV2> = []
    const plutusV3Scripts: Array<PlutusV3.PlutusV3> = []
    const nativeScripts: Array<any> = [] // TODO: Add native script type

    // Group scripts by type
    for (const [scriptHash, coreScript] of state.scripts) {
      yield* Effect.logDebug(`[Assembly] Processing script with hash: ${scriptHash}, type: ${coreScript._tag}`)

      switch (coreScript._tag) {
        case "PlutusV1":
          plutusV1Scripts.push(coreScript)
          break
        case "PlutusV2":
          plutusV2Scripts.push(coreScript)
          break
        case "PlutusV3":
          plutusV3Scripts.push(coreScript)
          break
        case "NativeScript":
          nativeScripts.push(coreScript)
          break
      }
    }

    // Build redeemers array from state FIRST (needed for scriptDataHash)
    const redeemers: Array<Redeemer.Redeemer> = []

    // Create a mapping from UTxO reference (txHash#outputIndex) to input index
    const inputIndexMap = new Map<string, number>()
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i]!
      const txHashHex = TransactionHash.toHex(input.transactionId)
      const key = `${txHashHex}#${input.index}`
      yield* Effect.logDebug(`[Assembly] Input ${i}: ${key}`)
      inputIndexMap.set(key, i)
    }

    yield* Effect.logDebug(`[Assembly] Input index map has ${inputIndexMap.size} entries`)
    yield* Effect.logDebug(`[Assembly] Redeemer map keys: ${globalThis.Array.from(state.redeemers.keys()).join(", ")}`)

    // Create a mapping from PolicyId hex to mint index (sorted order)
    const mintIndexMap = new Map<string, number>()
    if (state.mint && state.mint.map.size > 0) {
      // Get sorted policy IDs (Cardano redeemer indices require sorted order)
      const sortedPolicyIds = globalThis.Array.from(state.mint.map.keys())
        .map((pid) => PolicyId.toHex(pid))
        .sort()

      for (let i = 0; i < sortedPolicyIds.length; i++) {
        mintIndexMap.set(sortedPolicyIds[i]!, i)
        yield* Effect.logDebug(`[Assembly] Mint policy ${i}: ${sortedPolicyIds[i]}`)
      }
    }

    // Build redeemers with correct indices
    // For cert/reward redeemers, we need to find their index in the certificates/withdrawals arrays
    // Keys are stored as `cert:{hex}` and `reward:{hex}` in state.redeemers

    for (const [key, redeemerData] of state.redeemers) {
      yield* Effect.logDebug(`[Assembly] Processing redeemer for key: ${key}, tag: ${redeemerData.tag}`)

      let redeemerIndex: number | undefined

      if (redeemerData.tag === "mint") {
        // For mint redeemers, look up in mint index map
        redeemerIndex = mintIndexMap.get(key)
        if (redeemerIndex === undefined) {
          yield* Effect.logWarning(`[Assembly] Could not find mint index for policy: ${key}`)
          continue
        }
      } else if (redeemerData.tag === "cert") {
        // For cert redeemers, find matching certificate by credential hash
        // Key format: `cert:{credentialHex}`
        const credentialHex = key.slice(5) // Remove "cert:" prefix
        for (let i = 0; i < state.certificates.length; i++) {
          const cert = state.certificates[i]!
          // Check stakeCredential (for stake-related certs)
          if ("stakeCredential" in cert && cert.stakeCredential) {
            const certCredHex = Bytes.toHex((cert.stakeCredential as { hash: Uint8Array }).hash)
            if (certCredHex === credentialHex) {
              redeemerIndex = i
              break
            }
          }
          // Check drepCredential (for DRep-related certs: RegDrepCert, UnregDrepCert, UpdateDrepCert)
          if ("drepCredential" in cert && cert.drepCredential) {
            const certCredHex = Bytes.toHex((cert.drepCredential as { hash: Uint8Array }).hash)
            if (certCredHex === credentialHex) {
              redeemerIndex = i
              break
            }
          }
        }
        if (redeemerIndex === undefined) {
          yield* Effect.logWarning(`[Assembly] Could not find cert index for key: ${key}`)
          continue
        }
      } else if (redeemerData.tag === "reward") {
        // For reward redeemers, find matching withdrawal by credential hash (sorted order)
        // Key format: `reward:{credentialHex}`
        const credentialHex = key.slice(7) // Remove "reward:" prefix
        // Withdrawals must be in sorted order for redeemer indices
        const sortedWithdrawals = globalThis.Array.from(state.withdrawals.entries()).sort((a, b) => {
          const aHex = Bytes.toHex(a[0].stakeCredential.hash)
          const bHex = Bytes.toHex(b[0].stakeCredential.hash)
          return aHex.localeCompare(bHex)
        })
        for (let i = 0; i < sortedWithdrawals.length; i++) {
          const [rewardAccount] = sortedWithdrawals[i]!
          const rewardCredHex = Bytes.toHex(rewardAccount.stakeCredential.hash)
          if (rewardCredHex === credentialHex) {
            redeemerIndex = i
            break
          }
        }
        if (redeemerIndex === undefined) {
          yield* Effect.logWarning(`[Assembly] Could not find withdrawal index for key: ${key}`)
          continue
        }
      } else if (redeemerData.tag === "vote") {
        // For vote redeemers, find matching voter in votingProcedures (sorted order)
        // Key format: `drep:{credentialHex}` | `cc:{credentialHex}` | `pool:{poolKeyHashHex}`

        if (!state.votingProcedures) {
          yield* Effect.logWarning(`[Assembly] Vote redeemer found but no votingProcedures in state`)
          continue
        }

        // Build sorted voter keys from votingProcedures using shared utility
        const sortedVoterKeys: Array<string> = []
        for (const voter of state.votingProcedures.procedures.keys()) {
          sortedVoterKeys.push(voterToKey(voter))
        }

        // Sort keys lexicographically (as per Cardano ledger rules)
        sortedVoterKeys.sort()

        // Find the index of our voter key
        for (let i = 0; i < sortedVoterKeys.length; i++) {
          if (sortedVoterKeys[i] === key) {
            redeemerIndex = i
            break
          }
        }
        if (redeemerIndex === undefined) {
          yield* Effect.logWarning(`[Assembly] Could not find voter index for key: ${key}`)
          continue
        }
      } else {
        // For spend redeemers, look up in input index map
        redeemerIndex = inputIndexMap.get(key)
        if (redeemerIndex === undefined) {
          yield* Effect.logWarning(`[Assembly] Could not find input index for redeemer key: ${key}`)
          continue
        }
      }

      yield* Effect.logDebug(
        `[Assembly] Redeemer exUnits before creating: mem=${redeemerData.exUnits?.mem ?? 0n}, steps=${redeemerData.exUnits?.steps ?? 0n}`
      )

      // Create proper Redeemer object
      const redeemer = new Redeemer.Redeemer({
        tag: redeemerData.tag, // "spend", "mint", "cert", or "reward"
        index: BigInt(redeemerIndex), // Use actual redeemer index
        data: redeemerData.data,
        exUnits: redeemerData.exUnits
          ? new Redeemer.ExUnits({ mem: redeemerData.exUnits.mem, steps: redeemerData.exUnits.steps })
          : new Redeemer.ExUnits({ mem: 0n, steps: 0n }) // will be updated by script evaluation
      })

      yield* Effect.logDebug(
        `[Assembly] Created redeemer: tag=${redeemer.tag}, index=${redeemer.index}, exUnits=[${redeemer.exUnits.mem}, ${redeemer.exUnits.steps}]`
      )

      redeemers.push(redeemer)
    }

    // Extract plutus data (datums) from selected UTxOs
    // NOTE: Only datum hashes need to be resolved in the witness set's plutusData field.
    // Inline datums (Babbage era feature) are already embedded in the UTxO output
    // and should NOT be included in the witness set - doing so causes "extraneous datums" error.
    const plutusDataArray: Array<PlutusData.Data> = []
    for (const utxo of state.selectedUtxos) {
      if (utxo.datumOption?._tag === "DatumHash") {
        // For datum hash, we need to resolve and include the actual datum
        // TODO: Implement datum resolution from provider or state
        yield* Effect.logDebug(`[Assembly] Found datum hash UTxO (resolution not yet implemented)`)
      }
      // Inline datums (InlineDatum) are NOT added to plutusData - they're already in the UTxO
    }

    // Compute scriptDataHash if there are Plutus scripts (redeemers present)
    let scriptDataHash: ReturnType<typeof hashScriptData> | undefined
    let redeemersConcrete: Redeemers.RedeemerMap | undefined
    if (redeemers.length > 0) {
      // Get config to access provider for full protocol parameters
      const config = yield* TxBuilderConfigTag

      if (!config.provider) {
        throw new TransactionBuilderError({
          message:
            "Script transactions require a provider to fetch full protocol parameters for scriptDataHash calculation",
          cause: { redeemerCount: redeemers.length }
        })
      }

      // Fetch full protocol params from provider (includes cost models)
      const fullProtocolParams = yield* config.provider.Effect.getProtocolParameters().pipe(
        Effect.mapError(
          (providerError) =>
            new TransactionBuilderError({
              message: `Failed to fetch full protocol parameters for scriptDataHash calculation: ${providerError.message}`,
              cause: providerError
            })
        )
      )

      // Only include cost models for Plutus versions actually used in the transaction
      // The scriptDataHash must use the same languages as the node will compute
      // Check: 1) witness set scripts (attachScript), 2) reference inputs (readFrom),
      // 3) spent UTxO scriptRefs (inline scripts on inputs being consumed)
      let hasPlutusV1 = plutusV1Scripts.length > 0
      let hasPlutusV2 = plutusV2Scripts.length > 0
      let hasPlutusV3 = plutusV3Scripts.length > 0

      // Also check reference inputs for Plutus scripts
      for (const refUtxo of state.referenceInputs) {
        if (refUtxo.scriptRef) {
          switch (refUtxo.scriptRef._tag) {
            case "PlutusV1":
              hasPlutusV1 = true
              break
            case "PlutusV2":
              hasPlutusV2 = true
              break
            case "PlutusV3":
              hasPlutusV3 = true
              break
          }
        }
      }

      // Also check spent UTxOs for inline scriptRef (scripts embedded in the UTxO itself)
      // When a script-locked UTxO carries its own script as scriptRef, the node uses that
      // script for validation. The SDK must include the corresponding language's cost model.
      for (const utxo of state.selectedUtxos) {
        if (utxo.scriptRef) {
          switch (utxo.scriptRef._tag) {
            case "PlutusV1":
              hasPlutusV1 = true
              break
            case "PlutusV2":
              hasPlutusV2 = true
              break
            case "PlutusV3":
              hasPlutusV3 = true
              break
          }
        }
      }

      const plutusV1Costs = hasPlutusV1
        ? Object.values(fullProtocolParams.costModels.PlutusV1).map((v) => BigInt(v))
        : [] // Empty array = not included in language_views
      const plutusV2Costs = hasPlutusV2
        ? Object.values(fullProtocolParams.costModels.PlutusV2).map((v) => BigInt(v))
        : [] // Empty array = not included in language_views
      const plutusV3Costs = hasPlutusV3
        ? Object.values(fullProtocolParams.costModels.PlutusV3).map((v) => BigInt(v))
        : [] // Empty array = not included in language_views

      yield* Effect.logDebug(`[Assembly] Cost models included: V1=${hasPlutusV1}, V2=${hasPlutusV2}, V3=${hasPlutusV3}`)

      const costModels = new CostModel.CostModels({
        PlutusV1: new CostModel.CostModel({ costs: plutusV1Costs }),
        PlutusV2: new CostModel.CostModel({ costs: plutusV2Costs }),
        PlutusV3: new CostModel.CostModel({ costs: plutusV3Costs })
      })

      // Compute the hash of script data (redeemers + optional datums + cost models)
      // Use the same concrete Redeemers type that goes into the witness set
      redeemersConcrete = Redeemers.makeRedeemerMap(redeemers)
      scriptDataHash = hashScriptData(
        redeemersConcrete,
        costModels,
        plutusDataArray.length > 0 ? plutusDataArray : undefined
      )
      yield* Effect.logDebug(
        `[Assembly] Computed scriptDataHash: ${scriptDataHash.hash.toString()}`
      )
    }

    yield* Effect.logDebug(`[Assembly] WitnessSet populated:`)
    yield* Effect.logDebug(`  - PlutusV1 scripts: ${plutusV1Scripts.length}`)
    yield* Effect.logDebug(`  - PlutusV2 scripts: ${plutusV2Scripts.length}`)
    yield* Effect.logDebug(`  - PlutusV3 scripts: ${plutusV3Scripts.length}`)
    yield* Effect.logDebug(`  - Redeemers: ${redeemers.length}`)
    yield* Effect.logDebug(`  - Plutus data: ${plutusDataArray.length}`)

    // Create TransactionBody with calculated fee and scriptDataHash
    // Build certificates array (NonEmptyArray or undefined)
    const certificates =
      state.certificates.length > 0
        ? (state.certificates as [Certificate.Certificate, ...Array<Certificate.Certificate>])
        : undefined

    // Build withdrawals (Withdrawals object or undefined)
    const withdrawals =
      state.withdrawals.size > 0
        ? new Withdrawals.Withdrawals({ withdrawals: state.withdrawals as Map<RewardAccount.RewardAccount, bigint> })
        : undefined

    // Convert validity interval from Unix time to slots
    // Use resolved slot config from BuildOptionsTag (respects BuildOptions > TxBuilderConfig > network default priority)
    const buildOptions = yield* BuildOptionsTag
    const slotConfig = buildOptions.slotConfig!

    let ttl: bigint | undefined
    let validityIntervalStart: bigint | undefined

    if (state.validity?.to !== undefined) {
      ttl = Time.unixTimeToSlot(state.validity.to, slotConfig)
      yield* Effect.logDebug(`[Assembly] Validity TTL: ${ttl} (from unix ${state.validity.to})`)
    }
    if (state.validity?.from !== undefined) {
      validityIntervalStart = Time.unixTimeToSlot(state.validity.from, slotConfig)
      yield* Effect.logDebug(`[Assembly] Validity start: ${validityIntervalStart} (from unix ${state.validity.from})`)
    }

    // Build required signers (NonEmptyArray or undefined)
    const requiredSigners =
      state.requiredSigners.length > 0
        ? (state.requiredSigners as [KeyHash.KeyHash, ...Array<KeyHash.KeyHash>])
        : undefined

    if (requiredSigners) {
      yield* Effect.logDebug(`[Assembly] Required signers: ${requiredSigners.length}`)
    }

    // Compute auxiliary data hash if auxiliary data is present
    let auxiliaryDataHash: ReturnType<typeof hashAuxiliaryData> | undefined
    if (state.auxiliaryData) {
      auxiliaryDataHash = hashAuxiliaryData(state.auxiliaryData)
      yield* Effect.logDebug(`[Assembly] Computed auxiliaryDataHash: ${auxiliaryDataHash.toString()}`)
    }

    const body = new TransactionBody.TransactionBody({
      inputs: inputs as Array<TransactionInput.TransactionInput>,
      outputs: transactionOutputs,
      fee, // Now using actual calculated fee, not placeholder
      ttl, // Transaction expiration slot
      validityIntervalStart, // Transaction valid-from slot
      collateralInputs, // Collateral inputs from Collateral phase
      collateralReturn, // Collateral return output from Collateral phase
      totalCollateral, // Total collateral amount from Collateral phase
      referenceInputs, // Reference inputs for reading on-chain data (undefined if none)
      mint: state.mint && state.mint.map.size > 0 ? state.mint : undefined, // Mint field from minting operations
      scriptDataHash, // Hash of redeemers + datums + cost models (required for Plutus scripts)
      auxiliaryDataHash, // Hash of auxiliary data (required when metadata is present)
      certificates, // Certificates for staking operations
      withdrawals, // Withdrawals for claiming staking rewards
      requiredSigners, // Extra signers required for script validation
      votingProcedures: state.votingProcedures, // Voting procedures for governance voting
      proposalProcedures: state.proposalProcedures // Proposal procedures for governance proposals
    })

    // Create witness set with scripts and redeemers
    const witnessSet = new TransactionWitnessSet.TransactionWitnessSet({
      vkeyWitnesses: [],
      nativeScripts,
      bootstrapWitnesses: [],
      plutusV1Scripts,
      plutusData: plutusDataArray,
      redeemers: redeemers.length > 0 ? redeemersConcrete : undefined,
      plutusV2Scripts,
      plutusV3Scripts
    })

    // Create Transaction
    const transaction = new Transaction.Transaction({
      body,
      witnessSet,
      isValid: true, // Assume valid until script evaluation proves otherwise
      auxiliaryData: state.auxiliaryData ?? null
    })

    return transaction
  }).pipe(
    Effect.mapError(
      (error) =>
        new TransactionBuilderError({
          message: `Failed to assemble transaction: ${error.message}`,
          cause: error
        })
    )
  )

// ============================================================================
// Fee Calculation
// ============================================================================

/**
 * Calculate the size of a transaction in bytes for fee estimation.
 * Uses CBOR serialization to get accurate size.
 *
 * @since 2.0.0
 * @category fee-calculation
 */
export const calculateTransactionSize = (
  transaction: Transaction.Transaction
): Effect.Effect<number, TransactionBuilderError> =>
  Effect.gen(function* () {
    // Serialize transaction to CBOR bytes using sync function
    const cborBytes = yield* Effect.try({
      try: () => Transaction.toCBORBytes(transaction),
      catch: (error) =>
        new TransactionBuilderError({
          message: "Failed to encode transaction to CBOR",
          cause: error
        })
    })

    return cborBytes.length
  }).pipe(
    Effect.mapError(
      (error) =>
        new TransactionBuilderError({
          message: `Failed to calculate transaction size: ${error.message}`,
          cause: error
        })
    )
  )

/**
 * Calculate minimum transaction fee based on protocol parameters.
 *
 * Formula: minFee = txSizeInBytes × minFeeCoefficient + minFeeConstant
 *
 * @since 2.0.0
 * @category fee-calculation
 */
export const calculateMinimumFee = (
  transactionSizeBytes: number,
  protocolParams: {
    minFeeCoefficient: bigint // minFeeA
    minFeeConstant: bigint // minFeeB
  }
): bigint => {
  const { minFeeCoefficient, minFeeConstant } = protocolParams

  return BigInt(transactionSizeBytes) * minFeeCoefficient + minFeeConstant
}

/**
 * Extract payment key hash from a Cardano address.
 * Returns null if address has script credential or no payment credential.
 *
 * @since 2.0.0
 * @category fee-calculation
 * @internal
 */
export const extractPaymentKeyHash = (address: string): Effect.Effect<Uint8Array | null, TransactionBuilderError> =>
  Effect.gen(function* () {
    const addressStructure = yield* Effect.try({
      try: () => CoreAddress.fromBech32(address),
      catch: (error) =>
        new TransactionBuilderError({
          message: `Failed to parse address ${address}`,
          cause: error
        })
    })

    // Check if payment credential is a KeyHash
    if (addressStructure.paymentCredential?._tag === "KeyHash" && addressStructure.paymentCredential.hash) {
      return addressStructure.paymentCredential.hash
    }

    return null
  })

/**
 * Extract payment key hash from a Core Address.
 * Returns null if address has script credential or no payment credential.
 *
 * @since 2.0.0
 * @category fee-calculation
 * @internal
 */
const extractPaymentKeyHashFromCore = (address: CoreAddress.Address): Uint8Array | null => {
  // Check if payment credential is a KeyHash
  if (address.paymentCredential._tag === "KeyHash" && address.paymentCredential.hash) {
    return address.paymentCredential.hash
  }
  return null
}

/**
 * Build a fake VKeyWitness for fee estimation.
 * Creates a witness with 32-byte vkey and 64-byte signature (96 bytes total).
 * This matches CML's approach for accurate witness size calculation.
 *
 * @since 2.0.0
 * @category fee-calculation
 * @internal
 */
const buildFakeVKeyWitness = (
  keyHash: Uint8Array
): Effect.Effect<TransactionWitnessSet.VKeyWitness, TransactionBuilderError> =>
  Effect.gen(function* () {
    // Pad key hash to 32 bytes for vkey (Ed25519 public key size)
    const vkeyBytes = new Uint8Array(32)
    vkeyBytes.set(keyHash.slice(0, Math.min(keyHash.length, 32)))

    // Create 64-byte dummy signature (Ed25519 signature size)
    const signatureBytes = new Uint8Array(64)

    const vkey = yield* Effect.try({
      try: () => new VKey.VKey({ bytes: vkeyBytes }),
      catch: (error) =>
        new TransactionBuilderError({
          message: "Failed to create fake VKey",
          cause: error
        })
    })

    const signature = yield* Effect.try({
      try: () => new Ed25519Signature.Ed25519Signature({ bytes: signatureBytes }),
      catch: (error) =>
        new TransactionBuilderError({
          message: "Failed to create fake signature",
          cause: error
        })
    })

    return new TransactionWitnessSet.VKeyWitness({
      vkey,
      signature
    })
  })

/**
 * Build a fake witness set for fee estimation from transaction inputs.
 * Extracts unique payment key hashes from input addresses and creates
 * fake witnesses to accurately estimate witness set size in CBOR.
 * Includes any attached scripts from builder state for accurate size estimation.
 *
 * @since 2.0.0
 * @category fee-calculation
 */
export const buildFakeWitnessSet = (
  inputUtxos: ReadonlyArray<CoreUTxO.UTxO>
): Effect.Effect<TransactionWitnessSet.TransactionWitnessSet, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const stateRef = yield* TxContext
    const state = yield* Ref.get(stateRef)

    // Extract unique key hashes from input addresses (Core Address)
    const keyHashesSet = new Set<string>()
    const keyHashes: Array<Uint8Array> = []

    for (const utxo of inputUtxos) {
      const keyHash = extractPaymentKeyHashFromCore(utxo.address)
      if (keyHash) {
        const keyHashHex = Bytes.toHex(keyHash)
        if (!keyHashesSet.has(keyHashHex)) {
          keyHashesSet.add(keyHashHex)
          keyHashes.push(keyHash)
        }
      }
    }

    // Collect attached scripts from state and count required signers for native scripts
    const nativeScripts: Array<NativeScripts.NativeScript> = []
    const plutusV1Scripts: Array<PlutusV1.PlutusV1> = []
    const plutusV2Scripts: Array<PlutusV2.PlutusV2> = []
    const plutusV3Scripts: Array<PlutusV3.PlutusV3> = []

    // Helper to add dummy witnesses for native script required signers
    const addNativeScriptWitnesses = (script: NativeScripts.NativeScript) => {
      const requiredSigners = NativeScripts.countRequiredSigners(script.script)
      for (let i = 0; i < requiredSigners; i++) {
        const dummyKeyHash = new Uint8Array(28)
        // Fill with unique pattern: 0xFF prefix + counter to distinguish from real keys
        dummyKeyHash[0] = 0xff
        dummyKeyHash[1] = (keyHashesSet.size + i) & 0xff
        const dummyHashHex = Bytes.toHex(dummyKeyHash)

        // Only add if not already in the set
        if (!keyHashesSet.has(dummyHashHex)) {
          keyHashesSet.add(dummyHashHex)
          keyHashes.push(dummyKeyHash)
        }
      }
      return requiredSigners
    }

    for (const script of state.scripts.values()) {
      switch (script._tag) {
        case "NativeScript": {
          nativeScripts.push(script)
          // Count required signers for this native script and add fake witnesses
          const requiredSigners = addNativeScriptWitnesses(script)
          yield* Effect.logDebug(`[buildFakeWitnessSet] Native script requires ${requiredSigners} signers`)
          break
        }
        case "PlutusV1":
          plutusV1Scripts.push(script)
          break
        case "PlutusV2":
          plutusV2Scripts.push(script)
          break
        case "PlutusV3":
          plutusV3Scripts.push(script)
          break
      }
    }

    // Also count required signers from reference scripts (scripts in referenceInputs)
    for (const refUtxo of state.referenceInputs) {
      if (refUtxo.scriptRef && refUtxo.scriptRef._tag === "NativeScript") {
        const requiredSigners = addNativeScriptWitnesses(refUtxo.scriptRef)
        yield* Effect.logDebug(`[buildFakeWitnessSet] Reference native script requires ${requiredSigners} signers`)
      }
    }

    // Build fake witnesses for each unique key hash (inputs + native script signers)
    const vkeyWitnesses: Array<TransactionWitnessSet.VKeyWitness> = []
    for (const keyHash of keyHashes) {
      const witness = yield* buildFakeVKeyWitness(keyHash)
      vkeyWitnesses.push(witness)
    }

    // Add fake witnesses for certificates that require key signatures
    // Certificates like RegCert, UnregCert, StakeDelegation etc. require the stake key to sign
    for (const cert of state.certificates) {
      let credentialHash: Uint8Array | undefined

      // Extract credential from certificate types that require signing
      if ("stakeCredential" in cert && cert.stakeCredential._tag === "KeyHash") {
        credentialHash = cert.stakeCredential.hash
      }

      if (credentialHash) {
        const hashHex = Bytes.toHex(credentialHash)
        if (!keyHashesSet.has(hashHex)) {
          keyHashesSet.add(hashHex)
          const witness = yield* buildFakeVKeyWitness(credentialHash)
          vkeyWitnesses.push(witness)
        }
      }
    }

    // Add fake witnesses for withdrawals that require key signatures
    for (const [rewardAccount, _amount] of state.withdrawals) {
      // RewardAccount has stakeCredential property
      const credential = rewardAccount.stakeCredential
      if (credential._tag === "KeyHash") {
        const hashHex = Bytes.toHex(credential.hash)
        if (!keyHashesSet.has(hashHex)) {
          keyHashesSet.add(hashHex)
          const witness = yield* buildFakeVKeyWitness(credential.hash)
          vkeyWitnesses.push(witness)
        }
      }
    }

    // Add fake witnesses for required signers (from addSigner operation)
    // These key hashes are explicitly required to sign the transaction
    for (const keyHash of state.requiredSigners) {
      const hashHex = Bytes.toHex(keyHash.hash)
      if (!keyHashesSet.has(hashHex)) {
        keyHashesSet.add(hashHex)
        const witness = yield* buildFakeVKeyWitness(keyHash.hash)
        vkeyWitnesses.push(witness)
      }
    }

    // Build fake redeemers from state.redeemers for accurate size estimation
    // Redeemers contribute to transaction size and must be included in fee calculation
    const fakeRedeemers: Array<Redeemer.Redeemer> = []
    let fakeIndex = 0n
    for (const [_key, redeemerData] of state.redeemers) {
      // Use placeholder exUnits if not yet evaluated (will be updated after UPLC evaluation)
      const exUnits = redeemerData.exUnits ?? { mem: 0n, steps: 0n }

      // Use unique placeholder indices — actual indices will be computed in assembly.
      // For fee calculation, we just need accurate CBOR size estimation.
      fakeRedeemers.push(
        new Redeemer.Redeemer({
          tag: redeemerData.tag,
          index: fakeIndex++, // Unique placeholder, will be set correctly in assembly
          data: redeemerData.data,
          exUnits: new Redeemer.ExUnits({ mem: exUnits.mem, steps: exUnits.steps })
        })
      )
    }

    return new TransactionWitnessSet.TransactionWitnessSet({
      vkeyWitnesses,
      nativeScripts,
      bootstrapWitnesses: [],
      plutusV1Scripts,
      plutusData: [],
      redeemers: fakeRedeemers.length > 0 ? Redeemers.makeRedeemerMap(fakeRedeemers) : undefined,
      plutusV2Scripts,
      plutusV3Scripts
    })
  })

/**
 * Calculate transaction fee iteratively until stable.
 *
 * Algorithm:
 * 1. Build fake witness set from input UTxOs for accurate size estimation
 * 2. Build transaction with fee = 0
 * 3. Calculate size and fee
 * 4. Rebuild transaction with calculated fee
 * 5. If size changed, recalculate (usually converges in 1-2 iterations)
 *
 * @since 2.0.0
 * @category fee-calculation
 */
export const calculateFeeIteratively = (
  inputUtxos: ReadonlyArray<CoreUTxO.UTxO>,
  inputs: ReadonlyArray<TransactionInput.TransactionInput>,
  outputs: ReadonlyArray<TxOut.TransactionOutput>,
  redeemers: Map<
    string,
    {
      readonly tag: "spend" | "mint" | "cert" | "reward" | "vote"
      readonly data: PlutusData.Data
      readonly exUnits?: { readonly mem: bigint; readonly steps: bigint }
    }
  >,
  protocolParams: {
    minFeeCoefficient: bigint
    minFeeConstant: bigint
    priceMem?: number
    priceStep?: number
  }
): Effect.Effect<bigint, TransactionBuilderError, TxContext | BuildOptionsTag> =>
  Effect.gen(function* () {
    // Get state to access mint field and collateral
    const stateRef = yield* TxContext
    const state = yield* Ref.get(stateRef)

    // Include collateral UTxOs in witness estimation - they require VKey witnesses too!
    const allUtxosForWitnesses = state.collateral ? [...inputUtxos, ...state.collateral.inputs] : inputUtxos

    // Build fake witness set once for accurate size estimation
    const fakeWitnessSet = yield* buildFakeWitnessSet(allUtxosForWitnesses)

    // Outputs are already Core TransactionOutputs
    const transactionOutputs = outputs as Array<TxOut.TransactionOutput>

    // Get mint field from state (if present)
    const mint = state.mint && state.mint.map.size > 0 ? state.mint : undefined

    // Get collateral from state (for script transactions)
    let collateralInputs: Array.NonEmptyReadonlyArray<TransactionInput.TransactionInput> | undefined
    let collateralReturn: TxOut.TransactionOutput | undefined
    let totalCollateral: bigint | undefined
    if (state.collateral) {
      const builtCollateralInputs = yield* buildTransactionInputs(state.collateral.inputs)
      // Only set collateralInputs if there's at least one input
      if (builtCollateralInputs.length > 0) {
        collateralInputs = builtCollateralInputs as Array.NonEmptyReadonlyArray<TransactionInput.TransactionInput>
      }
      collateralReturn = state.collateral.returnOutput
      totalCollateral = state.collateral.totalAmount
    }

    // Check if Plutus scripts are present (need scriptDataHash for accurate size)
    // Must check: witness set scripts, redeemers (covers scriptRef spending), and reference input scripts
    const hasPlutusScripts =
      (fakeWitnessSet.plutusV1Scripts && fakeWitnessSet.plutusV1Scripts.length > 0) ||
      (fakeWitnessSet.plutusV2Scripts && fakeWitnessSet.plutusV2Scripts.length > 0) ||
      (fakeWitnessSet.plutusV3Scripts && fakeWitnessSet.plutusV3Scripts.length > 0) ||
      state.redeemers.size > 0

    // Create placeholder scriptDataHash if Plutus scripts are present
    // This is needed for accurate size estimation (32 bytes + CBOR overhead)
    const placeholderScriptDataHash = hasPlutusScripts
      ? new ScriptDataHash.ScriptDataHash({
          hash: new Uint8Array(32) // Placeholder hash for size calculation
        })
      : undefined

    // Create placeholder auxiliaryDataHash if auxiliary data is present
    // This is needed for accurate size estimation (32 bytes + CBOR overhead)
    const placeholderAuxiliaryDataHash = state.auxiliaryData ? hashAuxiliaryData(state.auxiliaryData) : undefined

    let currentFee = 0n
    let previousSize = 0
    let previousFee = 0n
    let iterations = 0
    const maxIterations = 10 // Increase to ensure convergence

    // Build certificates array for size estimation (NonEmptyArray or undefined)
    const certificates =
      state.certificates.length > 0
        ? (state.certificates as [Certificate.Certificate, ...Array<Certificate.Certificate>])
        : undefined

    // Build withdrawals for size estimation
    const withdrawals =
      state.withdrawals.size > 0 ? new Withdrawals.Withdrawals({ withdrawals: state.withdrawals }) : undefined

    // Build requiredSigners for size estimation (NonEmptyArray or undefined)
    const requiredSigners =
      state.requiredSigners.length > 0
        ? (state.requiredSigners as [KeyHash.KeyHash, ...Array<KeyHash.KeyHash>])
        : undefined

    // Build referenceInputs for size estimation
    // Reference inputs add to transaction size and must be included in fee calculation
    let referenceInputsForFee:
      | readonly [TransactionInput.TransactionInput, ...Array<TransactionInput.TransactionInput>]
      | undefined
    if (state.referenceInputs.length > 0) {
      const refInputs = yield* buildTransactionInputs(state.referenceInputs)
      referenceInputsForFee = refInputs as readonly [
        TransactionInput.TransactionInput,
        ...Array<TransactionInput.TransactionInput>
      ]
    }

    // Convert validity interval to slots for fee calculation
    // Validity fields affect transaction size and must be included
    const buildOptions = yield* BuildOptionsTag
    const slotConfig = buildOptions.slotConfig!
    let ttl: bigint | undefined
    let validityIntervalStart: bigint | undefined
    if (state.validity?.to !== undefined) {
      ttl = Time.unixTimeToSlot(state.validity.to, slotConfig)
    }
    if (state.validity?.from !== undefined) {
      validityIntervalStart = Time.unixTimeToSlot(state.validity.from, slotConfig)
    }

    while (iterations < maxIterations) {
      // Build transaction with current fee estimate
      const body = new TransactionBody.TransactionBody({
        inputs: inputs as Array<TransactionInput.TransactionInput>,
        outputs: transactionOutputs,
        fee: currentFee,
        ttl, // Include TTL for accurate size calculation
        validityIntervalStart, // Include validity start for accurate size calculation
        mint, // Include mint field for accurate size calculation
        scriptDataHash: placeholderScriptDataHash, // Include scriptDataHash for accurate size
        auxiliaryDataHash: placeholderAuxiliaryDataHash, // Include auxiliaryDataHash for accurate size
        collateralInputs, // Include collateral for accurate size
        collateralReturn, // Include collateral return for accurate size
        totalCollateral, // Include total collateral for accurate size
        certificates, // Include certificates for accurate size calculation
        withdrawals, // Include withdrawals for accurate size calculation
        requiredSigners, // Include requiredSigners for accurate size calculation
        referenceInputs: referenceInputsForFee, // Include reference inputs for accurate size calculation
        votingProcedures: state.votingProcedures, // Include voting procedures for accurate size calculation
        proposalProcedures: state.proposalProcedures // Include proposal procedures for accurate size calculation
      })

      const transaction = new Transaction.Transaction({
        body,
        witnessSet: fakeWitnessSet, // Use fake witness set for accurate size
        isValid: true,
        auxiliaryData: state.auxiliaryData ?? null
      })

      // Calculate size
      const size = yield* calculateTransactionSize(transaction)

      // Calculate base fee from serialized transaction size
      // Note: reference script fees are a separate additive component, NOT included in base fee
      const baseFee = calculateMinimumFee(size, {
        minFeeCoefficient: protocolParams.minFeeCoefficient,
        minFeeConstant: protocolParams.minFeeConstant
      })

      // Calculate ExUnits cost from redeemers (if pricing available)
      let exUnitsCost = 0n
      if (protocolParams.priceMem && protocolParams.priceStep) {
        for (const [_, redeemerData] of redeemers) {
          if (redeemerData.exUnits) {
            const memCost = BigInt(Math.ceil(protocolParams.priceMem * Number(redeemerData.exUnits.mem)))
            const stepsCost = BigInt(Math.ceil(protocolParams.priceStep * Number(redeemerData.exUnits.steps)))
            exUnitsCost += memCost + stepsCost
          }
        }
      }

      const calculatedFee = baseFee + exUnitsCost

      // Check if fully converged: fee is stable AND size is stable
      if (currentFee === previousFee && size === previousSize && currentFee >= calculatedFee) {
        if (iterations > 1) {
          yield* Effect.logDebug(
            `Fee converged after ${iterations} iterations: ${currentFee} lovelace (tx size: ${size} bytes)`
          )
        }
        return currentFee
      }

      // Update for next iteration
      previousFee = currentFee
      currentFee = calculatedFee
      previousSize = size
      iterations++
    }

    // Didn't converge within max iterations - return the calculated fee
    yield* Effect.logDebug(`Fee calculation reached max iterations (${maxIterations}): ${currentFee} lovelace`)
    return currentFee
  }).pipe(
    Effect.mapError(
      (error) =>
        new TransactionBuilderError({
          message: `Fee calculation failed to converge: ${error.message}`,
          cause: error
        })
    )
  )

// ============================================================================
// Balance Verification for Re-selection Loop
// ============================================================================

/**
 * Verify if selected UTxOs can cover outputs + fee for ALL assets.
 * Used by the re-selection loop to determine if more UTxOs are needed.
 *
 * Checks both lovelace AND native assets (tokens/NFTs) to ensure complete balance.
 *
 * @since 2.0.0
 * @category fee-calculation
 */
export const verifyTransactionBalance = (
  selectedUtxos: ReadonlyArray<CoreUTxO.UTxO>,
  outputs: ReadonlyArray<TxOut.TransactionOutput>,
  fee: bigint
): { sufficient: boolean; shortfall: bigint; change: bigint } => {
  // Sum all input assets using Core Assets
  const totalInputAssets = selectedUtxos.reduce((acc, utxo) => CoreAssets.merge(acc, utxo.assets), CoreAssets.zero)

  // Sum all output assets using Core Assets
  const totalOutputAssets = outputs.reduce((acc, output) => CoreAssets.merge(acc, output.assets), CoreAssets.zero)

  // Add fee to required lovelace
  const requiredAssets = CoreAssets.withLovelace(totalOutputAssets, totalOutputAssets.lovelace + fee)

  // Calculate balance for ALL assets: inputs - (outputs + fee)
  const balance = CoreAssets.subtract(totalInputAssets, requiredAssets)

  // Check if ANY asset is negative (insufficient)
  let hasShortfall = false
  let lovelaceShortfall = 0n

  // Check lovelace
  const balanceLovelace = balance.lovelace
  if (balanceLovelace < 0n) {
    hasShortfall = true
    lovelaceShortfall = -balanceLovelace
  }

  // Check all native assets using Core Assets helpers
  for (const unit of CoreAssets.getUnits(balance)) {
    if (unit !== "lovelace") {
      const amount = CoreAssets.getByUnit(balance, unit)
      if (amount < 0n) {
        hasShortfall = true
        // For native asset shortfalls, we still return lovelace shortfall
        // since coin selection will need to find UTxOs with both lovelace AND the missing asset
        // Add some lovelace buffer to encourage selection of UTxOs with native assets
        lovelaceShortfall = lovelaceShortfall > 0n ? lovelaceShortfall : 100_000n
        break
      }
    }
  }

  return {
    sufficient: !hasShortfall,
    shortfall: lovelaceShortfall,
    change: balanceLovelace > 0n ? balanceLovelace : 0n
  }
}

// ============================================================================
// Balance Validation
// ============================================================================

/**
 * Validate that inputs cover outputs plus fee.
 * This is the ONLY validation for minimal build - no coin selection.
 *
 * @since 2.0.0
 * @category validation
 */
export const validateTransactionBalance = (params: {
  totalInputAssets: CoreAssets.Assets
  totalOutputAssets: CoreAssets.Assets
  fee: bigint
}): Effect.Effect<void, TransactionBuilderError> =>
  Effect.gen(function* () {
    const { fee, totalInputAssets, totalOutputAssets } = params

    // Calculate total outputs including fee (outputs + fee)
    const totalRequired = CoreAssets.withLovelace(totalOutputAssets, totalOutputAssets.lovelace + fee)

    // Check each asset using Core Assets helpers
    for (const unit of CoreAssets.getUnits(totalRequired)) {
      const requiredAmount = CoreAssets.getByUnit(totalRequired, unit)
      const availableAmount = CoreAssets.getByUnit(totalInputAssets, unit)

      if (availableAmount < requiredAmount) {
        const shortfall = requiredAmount - availableAmount

        return yield* Effect.fail(
          new TransactionBuilderError({
            message: `Insufficient ${unit}: need ${requiredAmount}, have ${availableAmount} (short by ${shortfall})`,
            cause: {
              unit,
              required: String(requiredAmount),
              available: String(availableAmount),
              shortfall: String(shortfall)
            }
          })
        )
      }
    }

    // All assets covered
  })

/**
 * Calculate leftover assets (will become excess fee in minimal build).
 *
 * @since 2.0.0
 * @category validation
 */
export const calculateLeftoverAssets = (params: {
  totalInputAssets: CoreAssets.Assets
  totalOutputAssets: CoreAssets.Assets
  fee: bigint
}): CoreAssets.Assets => {
  const { fee, totalInputAssets, totalOutputAssets } = params

  // Start with inputs, subtract outputs using Core Assets
  const afterOutputs = CoreAssets.subtract(totalInputAssets, totalOutputAssets)
  // Subtract fee from lovelace
  const leftover = CoreAssets.withLovelace(afterOutputs, afterOutputs.lovelace - fee)

  // Filter out zero or negative amounts using Core Assets filter
  return CoreAssets.filter(leftover, (_unit, amount) => amount > 0n)
}

/**
 * Constant overhead in bytes for a UTxO entry in the ledger state.
 * Accounts for the transaction hash (32 bytes) and output index that are
 * part of the UTxO key but not serialized in the transaction output itself.
 *
 * @see Babbage ledger spec: utxoEntrySizeWithoutVal = 160
 * @since 2.0.0
 * @category constants
 */
const UTXO_ENTRY_OVERHEAD_BYTES = 160n

/**
 * Maximum iterations for exact min-UTxO fixed-point solving.
 * In practice this converges in 1-3 iterations because only lovelace CBOR
 * width changes can affect output size.
 *
 * @since 2.0.0
 * @category constants
 */
const MAX_MIN_UTXO_ITERATIONS = 10

/**
 * Calculate minimum ADA required for a UTxO based on its actual CBOR size.
 * Uses the Babbage/Conway-era formula: coinsPerUtxoByte * (160 + serializedOutputSize).
 *
 * The 160-byte constant accounts for the UTxO entry overhead in the ledger state
 * (transaction hash + index). A lovelace placeholder is used during CBOR encoding
 * to ensure the coin field width matches the final result.
 *
 * This function creates a temporary TransactionOutput, encodes it to CBOR,
 * and calculates the exact size to determine the minimum lovelace required.
 *
 * @since 2.0.0
 * @category change
 */
export const calculateMinimumUtxoLovelace = (params: {
  address: CoreAddress.Address
  assets: CoreAssets.Assets
  datum?: DatumOption.DatumOption
  scriptRef?: CoreScript.Script
  coinsPerUtxoByte: bigint
}): Effect.Effect<bigint, TransactionBuilderError> =>
  Effect.gen(function* () {
    const calculateRequiredLovelace = (lovelace: bigint): Effect.Effect<bigint, TransactionBuilderError> =>
      Effect.gen(function* () {
        const assetsForSizing = CoreAssets.withLovelace(params.assets, lovelace)

        const tempOutput = yield* txOutputToTransactionOutput({
          address: params.address,
          assets: assetsForSizing,
          datum: params.datum,
          scriptRef: params.scriptRef
        })

        const cborBytes = yield* Effect.try({
          try: () => TxOut.toCBORBytes(tempOutput),
          catch: (error) =>
            new TransactionBuilderError({
              message: "Failed to encode output to CBOR for min UTxO calculation",
              cause: error
            })
        })

        return params.coinsPerUtxoByte * (UTXO_ENTRY_OVERHEAD_BYTES + BigInt(cborBytes.length))
      })

    // Exact fixed-point solve for minUTxO:
    // required = f(lovelace), where f uses serialized size that depends on lovelace.
    // We iterate until required value stabilizes.
    let currentLovelace = 0n

    for (let i = 0; i < MAX_MIN_UTXO_ITERATIONS; i++) {
      const requiredLovelace = yield* calculateRequiredLovelace(currentLovelace)
      if (requiredLovelace === currentLovelace) {
        return requiredLovelace
      }
      currentLovelace = requiredLovelace
    }

    return yield* Effect.fail(
      new TransactionBuilderError({
        message: `Minimum UTxO calculation did not converge within ${MAX_MIN_UTXO_ITERATIONS} iterations`
      })
    )
  })

/**
 * Create change output(s) for leftover assets.
 *
 * When unfracking is disabled (default):
 * 1. Check if leftover assets exist
 * 2. Calculate minimum ADA required for change output
 * 3. If leftover lovelace < minimum, cannot create change (warning)
 * 4. Create single output with all leftover assets to change address
 *
 * When unfracking is enabled:
 * 1. Apply Unfrack.It optimization strategies
 * 2. Bundle tokens into optimally-sized UTxOs
 * 3. Isolate fungible tokens if configured
 * 4. Group NFTs by policy if configured
 * 5. Roll up or subdivide ADA-only UTxOs
 * 6. Return multiple change outputs for optimal wallet structure
 *
 * @since 2.0.0
 * @category change
 */
export const createChangeOutput = (params: {
  leftoverAssets: CoreAssets.Assets
  changeAddress: CoreAddress.Address
  coinsPerUtxoByte: bigint
  unfrackOptions?: UnfrackOptions
}): Effect.Effect<ReadonlyArray<TxOut.TransactionOutput>, TransactionBuilderError> =>
  Effect.gen(function* () {
    const { changeAddress, coinsPerUtxoByte, leftoverAssets, unfrackOptions } = params

    // If no leftover, no change needed
    if (CoreAssets.isEmpty(leftoverAssets)) {
      yield* Effect.logDebug(`[createChangeOutput] No leftover assets, skipping change`)
      return []
    }

    // If unfracking is enabled, use Unfrack module
    if (unfrackOptions) {
      const unfrackedOutputs = yield* Unfrack.createUnfrackedChangeOutputs(
        changeAddress,
        leftoverAssets,
        unfrackOptions,
        coinsPerUtxoByte
      ).pipe(
        Effect.mapError(
          (error) =>
            new TransactionBuilderError({
              message: `Failed to create unfracked change outputs: ${error.message}`,
              cause: error
            })
        )
      )

      yield* Effect.logDebug(`[createChangeOutput] Created ${unfrackedOutputs.length} unfracked change outputs`)
      return unfrackedOutputs
    }

    // Default behavior: single change output using accurate CBOR-based calculation
    // Calculate minimum UTxO using actual CBOR encoding size
    const minLovelace = yield* calculateMinimumUtxoLovelace({
      address: changeAddress,
      assets: leftoverAssets,
      coinsPerUtxoByte
    })

    // Check if we have enough lovelace for change
    const leftoverLovelace = leftoverAssets.lovelace

    yield* Effect.logDebug(
      `[createChangeOutput] Leftover: ${leftoverLovelace} lovelace, MinUTxO: ${minLovelace} lovelace`
    )

    if (leftoverLovelace < minLovelace) {
      // Not enough lovelace to create valid change output
      // This is not an error - just means leftover becomes extra fee
      yield* Effect.logDebug(
        `[createChangeOutput] Insufficient lovelace for change (${leftoverLovelace} < ${minLovelace}), returning empty`
      )
      return []
    }

    // Create change output using Core TransactionOutput
    const changeOutput = yield* makeTxOutput({
      address: changeAddress,
      assets: leftoverAssets
    })

    yield* Effect.logDebug(`[createChangeOutput] Created 1 change output with ${leftoverLovelace} lovelace`)

    return [changeOutput]
  })
