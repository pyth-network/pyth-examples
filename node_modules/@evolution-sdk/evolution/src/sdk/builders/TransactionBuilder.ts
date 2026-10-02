/**
 * Transaction builder storing a sequence of deferred operations that assemble and balance a transaction.
 *
 * @module TransactionBuilder
 * @since 2.0.0
 *
 * ## Execution Model
 *
 * The builder pattern:
 * - **Immutable configuration** at construction (protocol params, change address, available UTxOs)
 * - **ProgramSteps array** accumulates deferred effects via chainable API methods
 * - **Fresh state per build()** — each execution creates new Ref instances, runs all programs sequentially
 * - **Deferred composition** — no I/O or state updates occur until build() is invoked
 *
 * Key invariant: calling `build()` twice with the same builder instance produces two independent results
 * with no cross-contamination because fresh state (Refs) is created each time.
 *
 * ## Coin Selection
 *
 * Automatic coin selection selects UTxOs from `availableUtxos` to satisfy transaction outputs and fees.
 * The `collectFrom()` method allows manual input selection; automatic selection excludes these to prevent
 * double-spending. UTxOs can come from any source (wallet, DeFi protocols, other participants, etc.).
 *
 * @since 2.0.0
 */

// Effect-TS imports
import { Context, Data, Effect, Layer, Logger, LogLevel, Ref } from "effect"
import type { Either } from "effect/Either"

import type * as CoreAddress from "../../Address.js"
import * as CoreAssets from "../../Assets/index.js"
import type * as AuxiliaryData from "../../AuxiliaryData.js"
import type * as Certificate from "../../Certificate.js"
import type * as Coin from "../../Coin.js"
import type * as CostModel from "../../CostModel.js"
import type * as PlutusData from "../../Data.js"
import type * as KeyHash from "../../KeyHash.js"
import type * as Mint from "../../Mint.js"
import type * as Network from "../../Network.js"
import type * as ProposalProcedures from "../../ProposalProcedures.js"
import type * as RewardAccount from "../../RewardAccount.js"
import type * as CoreScript from "../../Script.js"
import * as Time from "../../Time/index.js"
import * as Transaction from "../../Transaction.js"
import type * as TxOut from "../../TxOut.js"
import { runEffectPromise } from "../../utils/effect-runtime.js"
import type * as CoreUTxO from "../../UTxO.js"
import type * as VotingProcedures from "../../VotingProcedures.js"
import type { EvalRedeemer } from "../EvalRedeemer.js"
import type * as Provider from "../provider/Provider.js"
import type * as WalletNew from "../wallet/WalletNew.js"
import type { CoinSelectionAlgorithm, CoinSelectionFunction } from "./CoinSelection.js"
import { createAddSignerProgram } from "./operations/AddSigner.js"
import { attachScriptToState } from "./operations/Attach.js"
import { createAttachMetadataProgram } from "./operations/AttachMetadata.js"
import { createCollectFromProgram } from "./operations/Collect.js"
import {
  createAuthCommitteeHotProgram,
  createDeregisterDRepProgram,
  createRegisterDRepProgram,
  createResignCommitteeColdProgram,
  createUpdateDRepProgram
} from "./operations/Governance.js"
import { createMintAssetsProgram } from "./operations/Mint.js"
import type {
  AddSignerParams,
  AttachMetadataParams,
  AuthCommitteeHotParams,
  CollectFromParams,
  DelegateToDRepParams,
  DelegateToParams,
  DelegateToPoolAndDRepParams,
  DelegateToPoolParams,
  DeregisterDRepParams,
  DeregisterStakeParams,
  MintTokensParams,
  PayToAddressParams,
  ProposeParams,
  ReadFromParams,
  RegisterAndDelegateToParams,
  RegisterDRepParams,
  RegisterPoolParams,
  RegisterStakeParams,
  ResignCommitteeColdParams,
  RetirePoolParams,
  SendAllParams,
  UpdateDRepParams,
  ValidityParams,
  VoteParams,
  WithdrawParams
} from "./operations/Operations.js"
import { createPayToAddressProgram } from "./operations/Pay.js"
import { createRegisterPoolProgram, createRetirePoolProgram } from "./operations/Pool.js"
import { createProposeProgram } from "./operations/Propose.js"
import { createReadFromProgram } from "./operations/ReadFrom.js"
import { createSendAllProgram } from "./operations/SendAll.js"
import {
  createDelegateToDRepProgram,
  createDelegateToPoolAndDRepProgram,
  createDelegateToPoolProgram,
  createDelegateToProgram,
  createDeregisterStakeProgram,
  createRegisterAndDelegateToProgram,
  createRegisterStakeProgram,
  createWithdrawProgram
} from "./operations/Stake.js"
import { createSetValidityProgram } from "./operations/Validity.js"
import { createVoteProgram } from "./operations/Vote.js"
import { executeBalance } from "./phases/Balance.js"
import { executeChangeCreation } from "./phases/ChangeCreation.js"
import { executeCollateral } from "./phases/Collateral.js"
import { executeEvaluation } from "./phases/Evaluation.js"
import { executeFallback } from "./phases/Fallback.js"
import { executeFeeCalculation } from "./phases/FeeCalculation.js"
import { executeSelection } from "./phases/Selection.js"
import type { DeferredRedeemer } from "./RedeemerBuilder.js"
import type { SignBuilder } from "./SignBuilder.js"
import { makeSignBuilder } from "./SignBuilderImpl.js"
import type { TransactionResultBase } from "./TransactionResult.js"
import { makeTransactionResult } from "./TransactionResult.js"
import {
  assembleTransaction,
  buildFakeWitnessSet,
  buildTransactionInputs,
  calculateTransactionSize
} from "./TxBuilderImpl.js"

/**
 * Error type for failures occurring during transaction builder operations.
 *
 * @since 2.0.0
 * @category errors
 */
export class TransactionBuilderError extends Data.TaggedError("TransactionBuilderError")<{
  message?: string
  cause?: unknown
}> {}

/**
 * Build phases
 */
type Phase =
  | "selection"
  | "changeCreation"
  | "feeCalculation"
  | "balance"
  | "evaluation"
  | "collateral"
  | "fallback"
  | "complete"

/**
 * BuildContext - state machine context
 */
interface PhaseContext {
  readonly phase: Phase
  readonly attempt: number
  readonly calculatedFee: bigint
  readonly shortfall: bigint
  readonly changeOutputs: ReadonlyArray<TxOut.TransactionOutput>
  readonly leftoverAfterFee: CoreAssets.Assets
  readonly canUnfrack: boolean
}

export class PhaseContextTag extends Context.Tag("PhaseContextTag")<PhaseContextTag, Ref.Ref<PhaseContext>>() {}

// Initial state for transaction builder
const initialTxBuilderState: TxBuilderState = {
  selectedUtxos: [],
  outputs: [],
  scripts: new Map(),
  totalOutputAssets: CoreAssets.zero,
  totalInputAssets: CoreAssets.zero,
  redeemers: new Map(),
  deferredRedeemers: new Map(),
  referenceInputs: [],
  certificates: [],
  withdrawals: new Map(),
  poolDeposits: new Map(),
  requiredSigners: [],
  auxiliaryData: undefined
}

/**
 * Resolve protocol parameters from options, provider, or fail.
 * Priority: BuildOptions override > provider.getProtocolParameters() > error
 */
const resolveProtocolParameters = (
  config: TxBuilderConfig,
  options?: BuildOptions
): Effect.Effect<ProtocolParameters, TransactionBuilderError | Provider.ProviderError> => {
  if (options?.protocolParameters !== undefined) {
    return Effect.succeed(options.protocolParameters)
  }

  if (config.provider) {
    return Effect.map(
      config.provider.Effect.getProtocolParameters(),
      (params): ProtocolParameters => ({
        minFeeCoefficient: BigInt(params.minFeeA),
        minFeeConstant: BigInt(params.minFeeB),
        coinsPerUtxoByte: params.coinsPerUtxoByte,
        maxTxSize: params.maxTxSize,
        priceMem: params.priceMem,
        priceStep: params.priceStep,
        minFeeRefScriptCostPerByte: params.minFeeRefScriptCostPerByte
      })
    )
  }

  return Effect.fail(
    new TransactionBuilderError({
      message:
        "No protocol parameters provided. Either provide protocolParameters in BuildOptions or provider in config.",
      cause: null
    })
  )
}

/**
 * Resolve change address from options, wallet, or fail.
 * Priority: BuildOptions override > wallet.address() > error
 */
const resolveChangeAddress = (
  config: TxBuilderConfig,
  options?: BuildOptions
): Effect.Effect<CoreAddress.Address, TransactionBuilderError | WalletNew.WalletError> => {
  if (options?.changeAddress) {
    return Effect.succeed(options.changeAddress)
  }

  if (config.wallet) {
    return config.wallet.Effect.address()
  }

  return Effect.fail(
    new TransactionBuilderError({
      message: "No change address provided. Either provide wallet in config or changeAddress in build options.",
      cause: null
    })
  )
}

/**
 * Resolve available UTxOs from options, provider+wallet, or fail.
 * Priority: BuildOptions override > provider.getUtxos(wallet.address) > error
 */
const resolveAvailableUtxos = (
  config: TxBuilderConfig,
  options?: BuildOptions
): Effect.Effect<
  ReadonlyArray<CoreUTxO.UTxO>,
  TransactionBuilderError | WalletNew.WalletError | Provider.ProviderError
> => {
  if (options?.availableUtxos) {
    return Effect.succeed(options.availableUtxos)
  }

  if (config.wallet && config.provider) {
    return Effect.flatMap(config.wallet.Effect.address(), (addr) => config.provider!.Effect.getUtxos(addr))
  }

  return Effect.fail(
    new TransactionBuilderError({
      message:
        "No available UTxOs provided. Either provide wallet+provider in config or availableUtxos in build options.",
      cause: null
    })
  )
}

/**
 * Ogmios error response structure for script failures.
 */
interface OgmiosValidatorError {
  validator: { index: number; purpose: string }
  error: {
    code: number
    message: string
    data: {
      validationError: string
      traces: Array<string>
    }
  }
}

/**
 * Parse Ogmios/provider error response into raw ScriptFailure array.
 * Returns failures without labels - enrichment happens in Evaluation phase.
 */
const parseProviderError = (error: unknown): Array<ScriptFailure> => {
  const failures: Array<ScriptFailure> = []

  // Navigate through error chain to find the response body
  const findErrorData = (e: unknown): Array<OgmiosValidatorError> | undefined => {
    if (!e || typeof e !== "object") return undefined

    const obj = e as Record<string, unknown>

    // Direct data property (from ProviderError cause chain)
    if (obj.cause && typeof obj.cause === "object") {
      const cause = obj.cause as Record<string, unknown>

      // ResponseError with response.body
      if (cause.response && typeof cause.response === "object") {
        const resp = cause.response as Record<string, unknown>
        if (resp.body && typeof resp.body === "object") {
          const body = resp.body as Record<string, unknown>
          if (body.error && typeof body.error === "object") {
            const err = body.error as Record<string, unknown>
            if (Array.isArray(err.data)) {
              return err.data as Array<OgmiosValidatorError>
            }
          }
        }
      }

      // Try description field which contains the JSON string
      if (typeof cause.description === "string") {
        try {
          const match = cause.description.match(/\{.*\}/s)
          if (match) {
            const parsed = JSON.parse(match[0])
            if (parsed.error?.data && Array.isArray(parsed.error.data)) {
              return parsed.error.data as Array<OgmiosValidatorError>
            }
          }
        } catch {
          // JSON parse failed, continue looking
        }
      }

      // Recurse into cause
      return findErrorData(cause)
    }

    return undefined
  }

  const errorData = findErrorData(error)

  if (!errorData) {
    return failures
  }

  // Process each validator error (raw, without labels)
  for (const validatorError of errorData) {
    const { error: err, validator } = validatorError
    const { index, purpose } = validator
    const { traces, validationError } = err.data

    failures.push({
      purpose,
      index,
      validationError,
      traces: traces ?? []
    })
  }

  return failures
}

/**
 * Resolve evaluator from options, provider, or return undefined.
 * Priority: BuildOptions.evaluator > provider.evaluateTx (wrapped) > undefined
 *
 * When undefined is returned, the Evaluation phase will fail with an appropriate error
 * if scripts are present in the transaction.
 */
const resolveEvaluator = (config: TxBuilderConfig, options?: BuildOptions): Evaluator | undefined => {
  // Priority 1: Explicit evaluator from BuildOptions
  if (options?.evaluator) {
    return options.evaluator
  }

  // Priority 2: Wrap provider's evaluateTx as an Evaluator
  if (config.provider) {
    return {
      evaluate: (
        tx: Transaction.Transaction,
        additionalUtxos: ReadonlyArray<CoreUTxO.UTxO> | undefined,
        _context: EvaluationContext
      ) => {
        // Provider-based evaluators (Ogmios, Blockfrost) resolve UTxOs from chain.
        // By default, don't pass additionalUtxos to avoid OverlappingAdditionalUtxo errors.
        // Use passAdditionalUtxos: true for edge cases (e.g., UTxOs not yet on chain).
        const utxosToPass = options?.passAdditionalUtxos
          ? (additionalUtxos as Array<CoreUTxO.UTxO> | undefined)
          : undefined

        return config.provider!.Effect.evaluateTx(tx, utxosToPass).pipe(
          Effect.mapError((providerError) => {
            // Parse provider error into structured failures
            const failures = parseProviderError(providerError)
            return new EvaluationError({
              message: `Provider evaluation failed: ${providerError.message}`,
              cause: providerError,
              failures
            })
          })
        )
      }
    }
  }

  // No evaluator available - Evaluation phase will handle error if scripts present
  return undefined
}

/**
 * Resolve slot configuration from BuildOptions, TxBuilderConfig, or network default.
 * Priority: BuildOptions.slotConfig > TxBuilderConfig.slotConfig > SLOT_CONFIG_NETWORK[config.network]
 *
 * Slot configuration defines the relationship between slots and Unix time,
 * required for UPLC evaluation of time-based validators and validity interval conversion.
 */
const resolveSlotConfig = (config: TxBuilderConfig, options?: BuildOptions): Time.SlotConfig => {
  // Priority 1: Explicit slot config from BuildOptions (per-transaction override)
  if (options?.slotConfig) {
    return options.slotConfig
  }

  // Priority 2: Slot config from TxBuilderConfig (set at client level)
  if (config.slotConfig) {
    return config.slotConfig
  }

  // Priority 3: Network-specific slot config preset
  const network: Network.Network = config.network ?? "Mainnet"
  return Time.SLOT_CONFIG_NETWORK[network]
}

/**
 * Assemble final builder result based on wallet capabilities.
 * Accesses transaction data from context tags.
 */
const assembleFinalResult = (
  config: TxBuilderConfig,
  transaction: Transaction.Transaction,
  txWithFakeWitnesses: Transaction.Transaction,
  availableUtxos: ReadonlyArray<CoreUTxO.UTxO>
): Effect.Effect<SignBuilder | TransactionResultBase, never, PhaseContextTag | TxContext> =>
  Effect.gen(function* () {
    const buildCtxRef = yield* PhaseContextTag
    const buildCtx = yield* Ref.get(buildCtxRef)
    const stateRef = yield* TxContext
    const state = yield* Ref.get(stateRef)

    const wallet = config.wallet

    if (wallet?.type === "signing" || wallet?.type === "api") {
      return makeSignBuilder({
        transaction,
        transactionWithFakeWitnesses: txWithFakeWitnesses,
        fee: buildCtx.calculatedFee,
        utxos: state.selectedUtxos,
        referenceUtxos: state.referenceInputs,
        provider: config.provider!,
        wallet,
        // Pass raw data for lazy chainResult computation
        outputs: state.outputs,
        availableUtxos
      })
    }

    return makeTransactionResult({
      transaction,
      transactionWithFakeWitnesses: txWithFakeWitnesses,
      fee: buildCtx.calculatedFee
    })
  })

/**
 * Phase handler map for routing phase execution.
 * Each handler executes its specific phase logic and returns a PhaseResult indicating the next phase.
 * All phase implementations are now modularized in the phases/ directory.
 */
const phaseMap = {
  selection: executeSelection,
  changeCreation: executeChangeCreation,
  feeCalculation: executeFeeCalculation,
  balance: executeBalance,
  evaluation: executeEvaluation,
  collateral: executeCollateral,
  fallback: executeFallback
}

/**
 * Assemble and validate transaction after phase loop completes.
 */
const assembleAndValidateTransaction = Effect.gen(function* () {
  const buildCtxRef = yield* PhaseContextTag
  const buildCtx = yield* Ref.get(buildCtxRef)
  const stateRef = yield* TxContext

  yield* Effect.logDebug(`Build complete - fee: ${buildCtx.calculatedFee}`)

  // Add change outputs to the transaction outputs
  if (buildCtx.changeOutputs.length > 0) {
    yield* Ref.update(stateRef, (s) => ({
      ...s,
      outputs: [...s.outputs, ...buildCtx.changeOutputs]
    }))

    yield* Effect.logDebug(`Added ${buildCtx.changeOutputs.length} change output(s) to transaction`)
  }

  // Get final inputs and outputs for transaction assembly
  const finalState = yield* Ref.get(stateRef)
  const selectedUtxos = finalState.selectedUtxos
  const allOutputs = finalState.outputs

  yield* Effect.logDebug(
    `Assembling transaction: ${selectedUtxos.length} inputs, ${allOutputs.length} outputs, fee: ${buildCtx.calculatedFee}`
  )

  // Build transaction inputs and assemble transaction body
  const inputs = yield* buildTransactionInputs(selectedUtxos)
  const transaction = yield* assembleTransaction(inputs, allOutputs, buildCtx.calculatedFee)

  // SAFETY CHECK: Validate transaction size against protocol limit
  // Include collateral UTxOs in witness estimation - they require VKey witnesses too!
  const allUtxosForWitnesses = finalState.collateral
    ? [...selectedUtxos, ...finalState.collateral.inputs]
    : selectedUtxos
  const fakeWitnessSet = yield* buildFakeWitnessSet(allUtxosForWitnesses)

  const txWithFakeWitnesses = new Transaction.Transaction({
    body: transaction.body,
    witnessSet: fakeWitnessSet,
    isValid: true,
    auxiliaryData: finalState.auxiliaryData ?? null
  })

  const txSizeWithWitnesses = yield* calculateTransactionSize(txWithFakeWitnesses)
  const protocolParams = yield* ProtocolParametersTag

  yield* Effect.logDebug(
    `Transaction size: ${txSizeWithWitnesses} bytes ` +
      `(with ${fakeWitnessSet.vkeyWitnesses?.length ?? 0} fake witnesses), ` +
      `max=${protocolParams.maxTxSize} bytes`
  )

  if (txSizeWithWitnesses > protocolParams.maxTxSize) {
    return yield* Effect.fail(
      new TransactionBuilderError({
        message:
          `Transaction size (${txSizeWithWitnesses} bytes) exceeds protocol maximum (${protocolParams.maxTxSize} bytes). ` +
          `Consider splitting into multiple transactions.`
      })
    )
  }

  return { transaction, txWithFakeWitnesses }
})

const phaseStateMachine = Effect.gen(function* () {
  // Get phase context ref once (doesn't change during execution)
  const phaseContextRef = yield* PhaseContextTag

  // Phase loop
  while (true) {
    const phaseContext = yield* Ref.get(phaseContextRef)

    // Terminal state
    if (phaseContext.phase === "complete") {
      break
    }

    // Route to phase handler
    const phase = phaseMap[phaseContext.phase]
    if (!phase) {
      return yield* Effect.fail(new TransactionBuilderError({ message: `Unknown phase: ${phaseContext.phase}` }))
    }

    const result = yield* phase()

    // Update phase
    yield* Ref.update(phaseContextRef, (c) => ({ ...c, phase: result.next }))
  }

  // Assemble and validate transaction
  return yield* assembleAndValidateTransaction
})

/**
 * Default BuildOptions for safe transaction building.
 *
 * **Safety Principles:**
 * - coinSelection: "largest-first" (deterministic, efficient)
 * - onInsufficientChange: "error" (prevents accidental fund loss)
 * - setCollateral: 5_000_000n (5 ADA for script collateral)
 */
const DEFAULT_BUILD_OPTIONS = {
  coinSelection: "largest-first",
  onInsufficientChange: "error",
  setCollateral: 5_000_000n
} as const

const makeBuild = (
  config: TxBuilderConfig,
  programs: Array<ProgramStep>,
  options: BuildOptions = DEFAULT_BUILD_OPTIONS
) =>
  Effect.gen(function* () {
    // Resolve all required resources
    const protocolParameters = yield* resolveProtocolParameters(config, options)
    const changeAddress = yield* resolveChangeAddress(config, options)
    const availableUtxos = yield* resolveAvailableUtxos(config, options)

    // Execute all programs
    yield* Effect.all(programs, { concurrency: "unbounded" })

    // Run state machine with resolved services
    // Note: FullProtocolParametersTag is provided lazily - evaluation phase will fetch when needed
    const { transaction, txWithFakeWitnesses } = yield* phaseStateMachine.pipe(
      Effect.provideService(ProtocolParametersTag, protocolParameters),
      Effect.provideService(ChangeAddressTag, changeAddress),
      Effect.provideService(AvailableUtxosTag, availableUtxos)
    )

    // Assemble and return final result
    return yield* assembleFinalResult(config, transaction, txWithFakeWitnesses, availableUtxos)
  }).pipe(
    Effect.provideServiceEffect(TxContext, Ref.make(initialTxBuilderState)),
    Effect.provideService(BuildOptionsTag, {
      ...options,
      evaluator: resolveEvaluator(config, options) ?? options.evaluator,
      slotConfig: resolveSlotConfig(config, options)
    }),
    Effect.provideService(TxBuilderConfigTag, config),
    Effect.provideServiceEffect(
      PhaseContextTag,
      Ref.make<PhaseContext>({
        phase: "selection",
        attempt: 0,
        calculatedFee: 0n,
        shortfall: 0n,
        changeOutputs: [],
        leftoverAfterFee: CoreAssets.zero,
        canUnfrack: options?.unfrack !== undefined
      })
    )
  )

// Core Effect logic for partial build
const buildPartialEffectCore = (
  config: TxBuilderConfig,
  programs: Array<ProgramStep>,
  _options: BuildOptions = DEFAULT_BUILD_OPTIONS
) =>
  Effect.gen(function* () {
    // Execute all programs
    yield* Effect.all(programs, { concurrency: "unbounded" })

    // Return partial transaction (without evaluation)
    return {} as Transaction.Transaction
  }).pipe(
    Effect.provideServiceEffect(TxContext, Ref.make(initialTxBuilderState)),
    Effect.provideService(TxBuilderConfigTag, config),
    Effect.mapError(
      (error) =>
        new TransactionBuilderError({
          message: `Partial build failed: ${error.message}`,
          cause: error
        })
    )
  )

/**
 * Result type for transaction chaining operations.
 *
 * Provides consumed and available UTxOs for building chained transactions.
 * The available UTxOs include both remaining unspent inputs AND newly created outputs
 * with pre-computed txHash, ready to be spent in subsequent transactions.
 *
 * Accessed via `SignBuilder.chainResult()` after calling `build()`.
 *
 * @since 2.0.0
 * @category model
 */
export interface ChainResult {
  /** UTxOs consumed from availableUtxos by coin selection */
  readonly consumed: ReadonlyArray<CoreUTxO.UTxO>
  /** Available UTxOs: remaining unspent + newly created (with computed txHash) */
  readonly available: ReadonlyArray<CoreUTxO.UTxO>
  /** Pre-computed transaction hash (blake2b-256 of transaction body) */
  readonly txHash: string
}

/**
 * Data required by script evaluators: cost models, execution limits, and slot configuration.
 *
 * Used by custom evaluators for local UPLC script evaluation.
 *
 * @since 2.0.0
 * @category model
 */
export interface EvaluationContext {
  /** Cost models for script evaluation */
  readonly costModels: CostModel.CostModels
  /** Maximum execution steps allowed */
  readonly maxTxExSteps: bigint
  /** Maximum execution memory allowed */
  readonly maxTxExMem: bigint
  /** Slot configuration for time-based operations */
  readonly slotConfig: {
    readonly zeroTime: bigint
    readonly zeroSlot: bigint
    readonly slotLength: number
  }
}

/**
 * Interface for evaluating transaction scripts and computing execution units.
 *
 * Implement this interface to provide custom script evaluation strategies, such as local UPLC execution.
 *
 * @since 2.0.0
 * @category model
 */
export interface Evaluator {
  /**
   * Evaluate transaction scripts and return execution units.
   *
   * @since 2.0.0
   * @category methods
   */
  evaluate: (
    tx: Transaction.Transaction,
    additionalUtxos: ReadonlyArray<CoreUTxO.UTxO> | undefined,
    context: EvaluationContext
  ) => Effect.Effect<ReadonlyArray<EvalRedeemer>, EvaluationError>
}

/**
 * Represents a single script failure from Ogmios evaluation.
 *
 * Contains all available information about which script failed and why,
 * including optional labels from the user's operation definitions.
 *
 * @since 2.0.0
 * @category errors
 */
export interface ScriptFailure {
  /** Redeemer purpose: "spend", "mint", "withdraw", "publish" */
  readonly purpose: string
  /** Index within the purpose category */
  readonly index: number
  /** User-provided label for debugging (from operation params) */
  readonly label?: string
  /** Key used internally to track this redeemer (e.g., "txHash#index" for spend) */
  readonly redeemerKey?: string
  /** Script hash if available */
  readonly scriptHash?: string
  /** UTxO reference for spend redeemers */
  readonly utxoRef?: string
  /** Credential hash for withdraw/cert redeemers */
  readonly credential?: string
  /** Policy ID for mint redeemers */
  readonly policyId?: string
  /** Validation error message from the script */
  readonly validationError: string
  /** Execution traces emitted by the script */
  readonly traces: ReadonlyArray<string>
}

/**
 * Error type for failures in script evaluation.
 *
 * Enhanced with structured failure information including user-provided labels.
 *
 * @since 2.0.0
 * @category errors
 */
export class EvaluationError extends Data.TaggedError("EvaluationError")<{
  readonly cause?: unknown
  readonly message?: string
  /** Parsed script failures with labels */
  readonly failures?: ReadonlyArray<ScriptFailure>
}> {}

// ============================================================================
// Provider Integration
// ============================================================================
// TransactionBuilder uses the Provider interface directly

/**
 * UTxO Optimization Options
 * Based on Unfrack.It principles for efficient wallet structure
 * @see https://unfrack.it
 */
export interface UnfrackTokenOptions {
  /**
   * Bundle Size: Number of tokens to collect per UTxO
   * - Same policy: up to bundleSize tokens together
   * - Multiple policies: up to bundleSize/2 tokens from different policies
   * - Policy exceeds bundle: split into multiple UTxOs
   * @default 10
   */
  readonly bundleSize?: number

  /**
   * Isolate Fungible Behavior: Place each fungible token policy on its own UTxO
   * Decreases fees and makes DEX interactions easier
   * @default false
   */
  readonly isolateFungibles?: boolean

  /**
   * Group NFTs by Policy: Separate NFTs onto policy-specific UTxOs
   * Decreases fees for marketplaces, staking, sending
   * @default false
   */
  readonly groupNftsByPolicy?: boolean
}

export interface UnfrackAdaOptions {
  /**
   * Roll Up ADA-Only: Intentionally collect and consolidate ADA-only UTxOs
   * @default false (only collect when needed for change)
   */
  readonly rollUpAdaOnly?: boolean

  /**
   * Subdivide Leftover ADA: If leftover ADA > threshold, split into multiple UTxOs
   * Creates multiple ADA options for future transactions (parallelism)
   * @default 100_000000 (100 ADA)
   */
  readonly subdivideThreshold?: Coin.Coin

  /**
   * Subdivision percentages for leftover ADA
   * Must sum to 100
   * @default [50, 15, 10, 10, 5, 5, 5]
   */
  readonly subdividePercentages?: ReadonlyArray<number>

  /**
   * Maximum ADA-only UTxOs to consolidate in one transaction.
   * NOTE: Not yet implemented. Will hook into coin selection to merge dust UTxOs.
   * @default 20
   */
  readonly maxUtxosToConsolidate?: number
}

/**
 * Unfrack Options: Optimize wallet UTxO structure
 * Named in respect to the Unfrack.It open source community
 */
export interface UnfrackOptions {
  readonly tokens?: UnfrackTokenOptions
  readonly ada?: UnfrackAdaOptions
}

// Build configuration options
export interface BuildOptions {
  /**
   * Override protocol parameters for this specific transaction build.
   *
   * By default, fetches from provider during build().
   * Provide this to use different protocol parameters for testing or special cases.
   *
   * Use cases:
   * - Testing with different fee parameters
   * - Simulating future protocol changes
   * - Using cached parameters to avoid provider fetch
   *
   * Example:
   * ```typescript
   * // Test with custom fee parameters
   * builder.build({
   *   protocolParameters: { ...params, minFeeCoefficient: 50n, minFeeConstant: 200000n }
   * })
   * ```
   *
   * @since 2.0.0
   */
  readonly protocolParameters?: ProtocolParameters

  /**
   * Coin selection strategy for automatic input selection.
   *
   * Options:
   * - `"largest-first"`: Use largest-first algorithm (DEFAULT)
   * - `"random-improve"`: Use random-improve algorithm (not yet implemented)
   * - `"optimal"`: Use optimal algorithm (not yet implemented)
   * - Custom function: Provide your own CoinSelectionFunction
   * - `undefined`: Use default (largest-first)
   *
   * Coin selection runs after programs execute and automatically
   * selects UTxOs to cover required outputs + fees. UTxOs already collected
   * via collectFrom() are excluded to prevent double-spending.
   *
   * To disable coin selection entirely, ensure all inputs are provided via collectFrom().
   *
   * @default "largest-first"
   */
  readonly coinSelection?: CoinSelectionAlgorithm | CoinSelectionFunction

  // ============================================================================
  // Change Handling Configuration
  // ============================================================================

  /**
   * Override the change address for this specific transaction build.
   *
   * By default, uses wallet.Effect.address() from TxBuilderConfig.
   * Provide this to use a different address for change outputs.
   *
   * Use cases:
   * - Multi-address wallet (use account index 5 for change)
   * - Different change address per transaction
   * - Multi-sig workflows where change address varies
   * - Testing with different addresses
   *
   * Example:
   * ```typescript
   * // Use different account for change
   * builder.build({ changeAddress: wallet.addresses[5] })
   *
   * // Custom Core Address
   * builder.build({ changeAddress: Core.Address.fromBech32("addr_test1...") })
   * ```
   *
   * @since 2.0.0
   */
  readonly changeAddress?: CoreAddress.Address

  /**
   * Override the available UTxOs for this specific transaction build.
   *
   * By default, fetches UTxOs from provider.Effect.getUtxos(wallet.address).
   * Provide this to use a specific set of UTxOs for coin selection.
   *
   * Use cases:
   * - Use UTxOs from specific account index
   * - Pre-filtered UTxO set
   * - Testing with known UTxO set
   * - Multi-address UTxO aggregation
   *
   * Example:
   * ```typescript
   * // Use UTxOs from specific account
   * builder.build({ availableUtxos: utxosFromAccount5 })
   *
   * // Combine UTxOs from multiple addresses
   * builder.build({ availableUtxos: [...utxos1, ...utxos2] })
   * ```
   *
   * @since 2.0.0
   */
  readonly availableUtxos?: ReadonlyArray<CoreUTxO.UTxO>

  /**
   * # Change Handling Strategy Matrix
   * 
   * | unfrack | drainTo | onInsufficientChange | leftover >= minUtxo | Has Native Assets | Result |
   * |---------|---------|---------------------|---------------------|-------------------|--------|
   * | false   | unset   | 'error' (default)   | true                | any               | Single change output created |
   * | false   | unset   | 'error'             | false               | any               | TransactionBuilderError thrown |
   * | false   | unset   | 'burn'              | false               | false             | Leftover becomes extra fee |
   * | false   | unset   | 'burn'              | false               | true              | TransactionBuilderError thrown |
   * | false   | set     | any                 | true                | any               | Single change output created |
   * | false   | set     | any                 | false               | any               | Assets merged into outputs[drainTo] |
   * | true    | unset   | 'error' (default)   | true                | any               | Multiple optimized change outputs |
   * | true    | unset   | 'error'             | false               | any               | TransactionBuilderError thrown |
   * | true    | unset   | 'burn'              | false               | false             | Leftover becomes extra fee |
   * | true    | unset   | 'burn'              | false               | true              | TransactionBuilderError thrown |
   * | true    | set     | any                 | true                | any               | Multiple optimized change outputs |
   * | true    | set     | any                 | false               | any               | Assets merged into outputs[drainTo] |
   * 
   * **Execution Priority:** unfrack attempt → changeOutput >= minUtxo check → drainTo → onInsufficientChange
   * 
   * **Note:** When drainTo is set, onInsufficientChange is never evaluated (unreachable code path)
   * 

  /**
   * Output index to merge leftover assets into as a fallback when change output cannot be created.
   * 
   * This serves as **Fallback #1** in the change handling strategy:
   * 1. Try to create change output (with optional unfracking)
   * 2. If that fails → Use drainTo (if configured)
   * 3. If drainTo not configured → Use onInsufficientChange strategy
   * 
   * Use cases:
   * - Wallet drain: Send maximum to recipient without leaving dust
   * - Multi-output drain: Choose which output receives leftover
   * - Avoiding minimum UTxO: Merge small leftover that can't create valid change
   * 
   * Example:
   * ```typescript
   * builder
   *   .payToAddress({ address: "recipient", assets: { lovelace: 5_000_000n }})
   *   .build({ drainTo: 0 })  // Fallback: leftover goes to recipient
   * ```
   * 
   * @since 2.0.0
   */
  readonly drainTo?: number

  /**
   * Strategy for handling insufficient leftover assets when change output cannot be created.
   *
   * This serves as **Fallback #2** (final fallback) in the change handling strategy:
   * 1. Try to create change output (with optional unfracking)
   * 2. If that fails AND drainTo configured → Drain to that output
   * 3. If that fails OR drainTo not configured → Use this strategy
   *
   * Options:
   * - `'error'` (DEFAULT): Throw error, transaction fails - **SAFE**, prevents fund loss
   * - `'burn'`: Allow leftover to become extra fee - Requires **EXPLICIT** user consent
   *
   * Default behavior is 'error' to prevent accidental loss of funds.
   *
   * Example:
   * ```typescript
   * // Safe (default): Fail if change insufficient
   * .build({ onInsufficientChange: 'error' })
   *
   * // Explicit consent to burn leftover as fee
   * .build({ onInsufficientChange: 'burn' })
   * ```
   *
   * @default 'error'
   * @since 2.0.0
   */
  readonly onInsufficientChange?: "error" | "burn"

  /**
   * Script evaluator for Plutus script execution costs.
   *
   * If provided, replaces the default provider-based evaluation.
   * Use `createUPLCEvaluator()` for UPLC libraries, or implement `Evaluator` directly.
   *
   * @since 2.0.0
   */
  readonly evaluator?: Evaluator

  /**
   * Pass additional UTxOs to provider-based evaluators.
   *
   * By default, provider evaluators (Ogmios, Blockfrost) don't receive additionalUtxos
   * because they can resolve UTxOs from the chain, and passing them causes
   * "OverlappingAdditionalUtxo" errors.
   *
   * Set to `true` for edge cases where you need to evaluate with UTxOs that
   * are not yet on chain (e.g., chained transactions, emulator scenarios).
   *
   * Note: This option has no effect on custom evaluators (Aiken, Scalus) which
   * always receive additionalUtxos since they cannot resolve from chain.
   *
   * @default false
   * @since 2.0.0
   */
  readonly passAdditionalUtxos?: boolean

  /**
   * Format for encoding redeemers in the script data hash.
   *
   * @deprecated Redeemer format is now determined by the concrete `Redeemers` type
   * (`RedeemerMap` or `RedeemerArray`). This option is ignored.
   *
   * @since 2.0.0
   */
  readonly scriptDataFormat?: "array" | "map"

  /**
   * Custom slot configuration for script evaluation.
   *
   * By default, slot config is determined from the network (mainnet/preview/preprod).
   * Provide this to override for custom networks (emulator, devnet, etc.).
   *
   * The slot configuration defines the relationship between slots and Unix time,
   * which is required for UPLC evaluation of time-based validators.
   *
   * Use cases:
   * - Emulator with custom genesis time
   * - Development network with different slot configuration
   * - Testing with specific time scenarios
   *
   * Example:
   * ```typescript
   * // For custom emulator
   * builder.build({
   *   slotConfig: {
   *     zeroTime: 1234567890000n,
   *     zeroSlot: 0n,
   *     slotLength: 1000
   *   }
   * })
   * ```
   *
   * @since 2.0.0
   */
  readonly slotConfig?: Time.SlotConfig

  /**
   * Amount to set as collateral return output (in lovelace).
   *
   * Used for Plutus script transactions to cover potential script execution failures.
   * If not provided, defaults to 5 ADA (5_000_000 lovelace).
   *
   * @default 5_000_000n
   * @since 2.0.0
   */
  readonly setCollateral?: bigint

  /**
   * Unfrack: Optimize wallet UTxO structure
   *
   * Implements Unfrack.It principles for efficient wallet management:
   * - Token bundling: Group tokens into optimally-sized UTxOs
   * - ADA optimization: Roll up or subdivide ADA-only UTxOs
   *
   * Works as an **enhancement** to change output creation. When enabled:
   * - Change output will be split into multiple optimized UTxOs
   * - If unfracking fails (insufficient ADA), falls back to drainTo or onInsufficientChange
   *
   * Named in respect to the Unfrack.It open source community
   */
  readonly unfrack?: UnfrackOptions

  /**
   * Enable debug logging during transaction build.
   *
   * When `true`, applies pretty logger with DEBUG level:
   * - Coin selection details
   * - Change creation steps
   * - Fee calculation progress
   * - Fiber termination messages with stack traces
   *
   * When `false` or `undefined` (default), no log layer is applied:
   * - Effect.logDebug calls are not visible
   * - Fiber termination logs are suppressed
   * - Clean output for production use
   *
   * @default false
   * @since 2.0.0
   */
  readonly debug?: boolean
}

// ============================================================================
// Builder Configuration and State - Properly Separated Architecture
// ============================================================================

/**
 * Deferred execution architecture with immutable builder and fresh state per build.
 *
 * ## Components
 *
 * **TxBuilderConfig** (immutable) - provider, protocolParams, costModels, availableUtxos
 * **TxBuilderState** (Ref-based, fresh per build) - selectedUtxos, outputs, scripts, asset totals
 * **ProgramStep** - deferred Effect that modifies Refs via Context
 *
 * ## Execution Flow
 *
 * 1. Chainable methods append ProgramSteps to array
 * 2. `build()` creates fresh TxBuilderState Refs and executes all ProgramSteps sequentially
 * 3. Subsequent `build()` calls create new independent Refs
 *
 * @since 2.0.0
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Protocol parameters required for transaction building.
 * Subset of full protocol parameters, only what's needed for minimal build.
 *
 * @since 2.0.0
 * @category config
 */
export interface ProtocolParameters {
  /** Coefficient for linear fee calculation (minFeeA) */
  minFeeCoefficient: bigint

  /** Constant for linear fee calculation (minFeeB) */
  minFeeConstant: bigint

  /** Minimum ADA per UTxO byte (for future change output validation) */
  coinsPerUtxoByte: bigint

  /** Maximum transaction size in bytes */
  maxTxSize: number

  /** Price per memory unit for script execution (optional, for ExUnits cost calculation) */
  priceMem?: number

  /** Price per CPU step for script execution (optional, for ExUnits cost calculation) */
  priceStep?: number

  /** Cost per byte for reference scripts (Conway-era, default 44) */
  minFeeRefScriptCostPerByte?: number

  // Future fields for advanced features:
  // maxBlockHeaderSize?: number
  // maxTxExecutionUnits?: ExUnits
  // maxBlockExecutionUnits?: ExUnits
  // collateralPercentage?: number
  // maxCollateralInputs?: number
}

/**
 * Configuration for TransactionBuilder.
 * Immutable configuration passed to builder at creation time.
 *
 * Wallet-centric design (when wallet provided):
 * - Wallet provides change address (via wallet.Effect.address())
 * - Provider + Wallet provide available UTxOs (via provider.Effect.getUtxos(wallet.address))
 * - Override per-build via BuildOptions if needed
 *
 * Manual mode (no wallet):
 * - Must provide changeAddress and availableUtxos in BuildOptions for each build
 * - Used for read-only scenarios or advanced use cases
 *
 * @since 2.0.0
 * @category config
 */
export interface TxBuilderConfig {
  /**
   * Optional wallet provides:
   * - Change address via wallet.Effect.address()
   * - Available UTxOs via wallet.Effect.address() + provider.Effect.getUtxos()
   * - Signing capability via wallet.Effect.signTx() (SigningWallet and ApiWallet only)
   *
   * When provided: Automatic change address and UTxO resolution.
   * When omitted: Must provide changeAddress and availableUtxos in BuildOptions.
   *
   * ReadOnlyWallet: For read-only clients that can build but not sign transactions.
   * SigningWallet/ApiWallet: For signing clients with full transaction signing capability.
   *
   * Override per-build via BuildOptions.changeAddress and BuildOptions.availableUtxos.
   */
  readonly wallet?: WalletNew.SigningWallet | WalletNew.ApiWallet | WalletNew.ReadOnlyWallet

  /**
   * Optional provider for:
   * - Fetching UTxOs for the wallet's address (provider.Effect.getUtxos)
   * - Transaction submission (provider.Effect.submitTx)
   * - Protocol parameters
   *
   * Works together with wallet to provide everything needed for transaction building.
   * When wallet is omitted, provider is only used if you call provider methods directly.
   */
  readonly provider?: Provider.Provider

  /**
   * Network type for slot configuration in script evaluation.
   *
   * Used to determine the correct slot configuration when evaluating Plutus scripts.
   * Each network has different genesis times and slot configurations.
   *
   * Options:
   * - `"Mainnet"`: Production network
   * - `"Preview"`: Preview testnet
   * - `"Preprod"`: Pre-production testnet
   * - `"Custom"`: Custom network (emulator/devnet) - requires slotConfig
   *
   * When omitted, defaults to "Mainnet".
   *
   * @default "Mainnet"
   * @since 2.0.0
   */
  readonly network?: Network.Network

  /**
   * Custom slot configuration for the network.
   *
   * Slot configuration defines the relationship between slots and Unix time,
   * which is required for:
   * - UPLC evaluation of time-based validators
   * - Converting validity bounds (from/to) from Unix time to slots
   *
   * By default, slot config is determined from the network (mainnet/preview/preprod).
   * Set this for custom networks (devnet, emulator, private chains).
   *
   * Priority: BuildOptions.slotConfig > TxBuilderConfig.slotConfig > SLOT_CONFIG_NETWORK[network]
   *
   * Use cases:
   * - Devnet with custom genesis time
   * - Emulator with specific slot configuration
   * - Private networks with custom parameters
   *
   * Example:
   * ```typescript
   * makeTxBuilder({
   *   slotConfig: {
   *     zeroTime: clusterGenesisTime,
   *     zeroSlot: 0n,
   *     slotLength: 1000 // 1 second per slot
   *   },
   *   wallet,
   *   provider
   * })
   * ```
   *
   * @since 2.0.0
   */
  readonly slotConfig?: Time.SlotConfig

  // Future fields:
  // readonly costModels?: Uint8Array // Cost models for script evaluation
}

/**
 * Mutable state created FRESH on each build() call.
 * Contains all state needed during transaction construction.
 *
 * State lifecycle:
 * 1. Created fresh when build() is called
 * 2. Modified by ProgramSteps during execution
 * 3. Used to construct final transaction
 * 4. Discarded after build completes
 *
 * @since 2.0.0
 * @category state
 */
export interface TxBuilderState {
  readonly selectedUtxos: ReadonlyArray<CoreUTxO.UTxO> // Core UTxO type
  readonly outputs: ReadonlyArray<TxOut.TransactionOutput> // Transaction outputs (no txHash/outputIndex yet)
  readonly scripts: Map<string, CoreScript.Script> // Scripts attached to the transaction
  readonly totalOutputAssets: CoreAssets.Assets // Asset totals for balancing
  readonly totalInputAssets: CoreAssets.Assets // Asset totals for balancing
  readonly redeemers: Map<string, RedeemerData> // Resolved redeemer data (static mode)
  readonly deferredRedeemers: Map<string, DeferredRedeemerData> // Deferred redeemers (self/batch mode)
  readonly referenceInputs: ReadonlyArray<CoreUTxO.UTxO> // Reference inputs (UTxOs with reference scripts)
  readonly certificates: ReadonlyArray<Certificate.Certificate> // Certificates for staking operations
  readonly withdrawals: Map<RewardAccount.RewardAccount, bigint> // Withdrawal amounts by reward account
  readonly poolDeposits: Map<string, bigint> // Pool deposits keyed by pool key hash
  readonly mint?: Mint.Mint // Assets being minted/burned (positive = mint, negative = burn)
  readonly votingProcedures?: VotingProcedures.VotingProcedures // Voting procedures for governance actions (Conway)
  readonly proposalProcedures?: ProposalProcedures.ProposalProcedures // Proposal procedures for governance actions (Conway)
  readonly collateral?: {
    // Collateral data for script transactions
    readonly inputs: ReadonlyArray<CoreUTxO.UTxO>
    readonly totalAmount: bigint
    readonly returnOutput?: TxOut.TransactionOutput // Optional: only if there are leftover assets
  }
  readonly validity?: {
    // Transaction validity interval (Unix times, converted to slots during assembly)
    readonly from?: Time.UnixTime // validityIntervalStart
    readonly to?: Time.UnixTime // ttl
  }
  readonly requiredSigners: ReadonlyArray<KeyHash.KeyHash> // Extra signers required (for script validation)
  readonly auxiliaryData?: AuxiliaryData.AuxiliaryData // Auxiliary data (metadata, scripts, etc.)
  readonly sendAllTo?: CoreAddress.Address // Target address for sendAll operation
}

/**
 * Redeemer data stored during input collection.
 * Index is determined later during witness assembly based on input ordering.
 *
 * @since 2.0.0
 * @category state
 */
export interface RedeemerData {
  readonly tag: "spend" | "mint" | "cert" | "reward" | "vote"
  readonly data: PlutusData.Data
  readonly exUnits?: {
    // Optional: from script evaluation
    readonly mem: bigint
    readonly steps: bigint
  }
  /** Optional label for debugging - identifies this redeemer in error messages */
  readonly label?: string
}

/**
 * Deferred redeemer data for RedeemerBuilder patterns.
 * Contains callback that will be resolved after coin selection completes.
 *
 * @since 2.0.0
 * @category state
 */
export interface DeferredRedeemerData {
  readonly tag: "spend" | "mint" | "cert" | "reward" | "vote"
  readonly deferred: DeferredRedeemer
  readonly exUnits?: {
    readonly mem: bigint
    readonly steps: bigint
  }
  /** Optional label for debugging - identifies this redeemer in error messages */
  readonly label?: string
}

/**
 * Context service providing transaction building state to programs.
 * Holds the mutable state Ref - config is passed as a regular parameter.
 *
 * @since 2.0.0
 * @category context
 */
export class TxContext extends Context.Tag("TxContext")<TxContext, Ref.Ref<TxBuilderState>>() {}

/**
 * Resolved change address for the current build.
 * This is resolved once at the start of build() from either:
 * - BuildOptions.changeAddress (per-transaction override)
 * - TxBuilderConfig.wallet.Effect.address() (default from wallet)
 *
 * Available to all phase functions via Effect Context.
 *
 * @since 2.0.0
 * @category context
 */
export class ChangeAddressTag extends Context.Tag("ChangeAddress")<ChangeAddressTag, CoreAddress.Address>() {}

/**
 * Resolved protocol parameters for the current build.
 * This is resolved once at the start of build() from either:
 * - BuildOptions.protocolParameters (per-transaction override)
 * - provider.Effect.getProtocolParameters() (fetched from provider)
 *
 * Available to all phase functions via Effect Context.
 *
 * @since 2.0.0
 * @category context
 */
export class ProtocolParametersTag extends Context.Tag("ProtocolParameters")<
  ProtocolParametersTag,
  ProtocolParameters
>() {}

/**
 * Full protocol parameters (including cost models, execution units, etc.) for script evaluation.
 * This is resolved from provider.Effect.getProtocolParameters() and includes all fields
 * needed for UPLC evaluation, unlike the minimal ProtocolParametersTag.
 *
 * Available to evaluation phase via Effect Context.
 *
 * @since 2.0.0
 * @category context
 */
export class FullProtocolParametersTag extends Context.Tag("FullProtocolParameters")<
  FullProtocolParametersTag,
  Provider.ProtocolParameters
>() {}

/**
 * Transaction builder configuration containing provider, wallet, and network information.
 * Available to phases that need to access provider or wallet directly.
 *
 * @since 2.0.0
 * @category context
 */
export class TxBuilderConfigTag extends Context.Tag("TxBuilderConfig")<TxBuilderConfigTag, TxBuilderConfig>() {}

/**
 * Resolved available UTxOs for the current build.
 * This is resolved once at the start of build() from either:
 * - BuildOptions.availableUtxos (per-transaction override)
 * - provider.Effect.getUtxos(wallet.address) (default from wallet + provider)
 *
 * Available to all phase functions via Effect Context.
 *
 * @since 2.0.0
 * @category context
 */
export class AvailableUtxosTag extends Context.Tag("AvailableUtxos")<
  AvailableUtxosTag,
  ReadonlyArray<CoreUTxO.UTxO>
>() {}

/**
 * Context tag providing BuildOptions for the current build.
 * Contains build-specific configuration like unfrack, drainTo, onInsufficientChange, etc.
 *
 * @since 2.0.0
 * @category context
 */
export class BuildOptionsTag extends Context.Tag("BuildOptions")<BuildOptionsTag, BuildOptions>() {}

// ============================================================================
// Program Step Type - Deferred Execution Pattern
// ============================================================================

/**
 * A deferred Effect program that represents a single transaction building operation.
 *
 * ProgramSteps are:
 * - Created when user calls chainable methods (payToAddress, collectFrom, etc.)
 * - Stored in the builder's programs array
 * - Executed later when build() is called
 * - Access TxContext through Effect Context
 *
 * This deferred execution pattern enables:
 * - Builder reusability (same builder, multiple builds)
 * - Fresh state per build (no mutation between builds)
 * - Composable transaction construction
 * - No prop drilling (programs access everything via single Context)
 *
 * Type signature:
 * ```typescript
 * type ProgramStep = Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag>
 * ```
 *
 * Requirements from context:
 * - TxContext: Mutable state Ref (selected UTxOs, outputs, scripts, assets)
 * - TxBuilderConfigTag: Builder configuration (provider, network, etc.)
 *
 * @since 2.0.0
 * @category types
 */
export type ProgramStep = Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag>

// ============================================================================
// Transaction Builder Interface - Hybrid Effect/Promise API
// ============================================================================

/**
 * TransactionBuilder with hybrid Effect/Promise API following lucid-evolution pattern.
 *
 * Architecture:
 * - Immutable builder instance stores array of ProgramSteps
 * - Chainable methods create ProgramSteps and return same builder instance
 * - Completion methods (build, chain, etc.) execute all stored ProgramSteps with FRESH state
 * - Builder can be reused - each build() call is independent with its own state
 *
 * Key Design Principle:
 * Builder instance never mutates. Programs are deferred Effects that execute later.
 * Each build() creates fresh TxBuilderState, executes programs, returns result.
 *
 * Generic Type Parameter:
 * TResult determines the return type of build() methods:
 * - SignBuilder: When wallet has signing capability (SigningClient)
 * - TransactionResultBase: When wallet is read-only (ReadOnlyClient)
 *
 * Usage Pattern:
 * ```typescript
 * const builder = makeTxBuilder(provider, params, costModels, utxos)
 *   .payToAddress({ address: "addr1...", assets: { lovelace: 5_000_000n } })
 *   .collectFrom({ inputs: [utxo1, utxo2] })
 *
 * // First build - creates fresh state, executes programs
 * const signBuilder1 = await builder.build()
 *
 * // Second build - NEW fresh state, independent execution
 * const signBuilder2 = await builder.build()
 * ```
 *
 * @typeParam TResult - The result type returned by build methods (SignBuilder or TransactionResultBase)
 *
 * @since 2.0.0
 * @category interfaces
 */

/**
 * Conditional type to determine the result type based on wallet capability.
 * - If wallet has signTx method (SigningWallet or ApiWallet): SignBuilder
 * - Otherwise: TransactionResultBase
 *
 * @internal
 */
export type BuildResultType<W extends TxBuilderConfig["wallet"] | undefined> = W extends
  | WalletNew.SigningWallet
  | WalletNew.ApiWallet
  ? SignBuilder
  : TransactionResultBase

/**
 * Base interface for both signing and read-only transaction builders.
 * Provides chainable builder methods common to both.
 *
 * @since 2.0.0
 * @category builder-interfaces
 */
export interface TransactionBuilderBase {
  /**
   * Append a payment output to the transaction.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category builder-methods
   */
  readonly payToAddress: (params: PayToAddressParams) => this

  /**
   * Specify transaction inputs from provided UTxOs.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category builder-methods
   */
  readonly collectFrom: (params: CollectFromParams) => this

  /**
   * Send all wallet assets to a recipient address.
   *
   * This operation collects all wallet UTxOs and creates a single output
   * containing all assets minus the transaction fee. No change output is created.
   *
   * Use cases:
   * - Draining a wallet completely
   * - Consolidating all UTxOs into a single output
   * - Migrating funds to a new address
   *
   * **Important**: This operation is mutually exclusive with `payToAddress` and `collectFrom`.
   * When `sendAll` is used, all wallet UTxOs are automatically collected and the output
   * is automatically created. Any existing outputs or inputs will cause an error.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @example
   * ```typescript
   * import { Address } from "@evolution-sdk/evolution"
   *
   * const tx = await client
   *   .newTx()
   *   .sendAll({ to: Address.fromBech32("addr1...") })
   *   .build()
   * ```
   *
   * @since 2.0.0
   * @category builder-methods
   */
  readonly sendAll: (params: SendAllParams) => this

  /**
   * Attach a script to the transaction.
   *
   * Scripts must be attached before being referenced by transaction inputs, minting policies,
   * or certificate operations. The script is stored in the builder state and indexed by its hash
   * for efficient lookup during transaction assembly.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @example
   * ```typescript
   * import * as Script from "../../Script.js"
   * import * as NativeScripts from "../../NativeScripts.js"
   *
   * const nativeScript = NativeScripts.makeScriptPubKey(keyHashBytes)
   * const script = Script.fromNativeScript(nativeScript)
   *
   * const tx = await builder
   *   .attachScript({ script })
   *   .mintAssets({ assets: { "<policyId><assetName>": 1000n } })
   *   .build()
   * ```
   *
   * @since 2.0.0
   * @category builder-methods
   */
  readonly attachScript: (params: { script: CoreScript.Script }) => this

  /**
   * Mint or burn native tokens.
   *
   * Minting creates new tokens, burning destroys existing tokens.
   * - Positive amounts: mint new tokens
   * - Negative amounts: burn existing tokens
   *
   * Can be called multiple times; mints are merged by PolicyId and AssetName.
   * If minting from a script policy, provide the redeemer and attach the script via attachScript().
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @example
   * ```typescript
   * // Mint tokens from a native script policy
   * const tx = await builder
   *   .mintAssets({
   *     assets: {
   *       "<policyId><assetName>": 1000n
   *     }
   *   })
   *   .build()
   *
   * // Mint from Plutus script policy with redeemer
   * const tx = await builder
   *   .attachScript(mintingScript)
   *   .mintAssets({
   *     assets: {
   *       "<policyId><assetName>": 1000n
   *     },
   *     redeemer: myRedeemer
   *   })
   *   .build()
   * ```
   *
   * @since 2.0.0
   * @category builder-methods
   */
  readonly mintAssets: (params: MintTokensParams) => this

  /**
   * Add reference inputs to the transaction.
   *
   * Reference inputs allow reading UTxO data (datums, reference scripts) without consuming them.
   * They are commonly used to:
   * - Reference validators/scripts stored on-chain (reduces tx size and fees)
   * - Read datum values without spending the UTxO
   * - Share scripts across multiple transactions
   *
   * Reference scripts incur tiered fees based on size:
   * - Tier 1 (0-25KB): 15 lovelace/byte
   * - Tier 2 (25-50KB): 25 lovelace/byte
   * - Tier 3 (50-200KB): 100 lovelace/byte
   * - Maximum: 200KB total limit
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @example
   * ```typescript
   * import * as UTxO from "../../UTxO.js"
   *
   * // Use reference script stored on-chain instead of attaching to transaction
   * const refScriptUtxo = await provider.getUtxoByTxHash("abc123...")
   *
   * const tx = await builder
   *   .readFrom({ referenceInputs: [refScriptUtxo] })
   *   .collectFrom({ inputs: [scriptUtxo], redeemer: myRedeemer })
   *   .build()
   * ```
   *
   * @since 2.0.0
   * @category builder-methods
   */
  readonly readFrom: (params: ReadFromParams) => this

  /**
   * Register a stake credential on-chain.
   *
   * Creates a stake registration certificate, enabling the credential to delegate
   * to pools and receive rewards. Requires paying a stake key deposit (currently 2 ADA).
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category staking-methods
   */
  readonly registerStake: (params: RegisterStakeParams) => this

  /**
   * Deregister a stake credential from the chain.
   *
   * Removes the stake credential registration and reclaims the deposit.
   * All rewards must be withdrawn before deregistering.
   *
   * For script-controlled credentials, provide a redeemer. The redeemer can use:
   * - **Static**: Direct Data value
   * - **Self**: Callback receiving the indexed certificate
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category staking-methods
   */
  readonly deregisterStake: (params: DeregisterStakeParams) => this

  /**
   * Delegate stake and/or voting power to a pool or DRep.
   *
   * Supports three delegation modes:
   * - **Stake only**: Provide `poolKeyHash` to delegate to a stake pool
   * - **Vote only**: Provide `drep` to delegate governance voting power (Conway)
   * - **Both**: Provide both for combined stake + vote delegation
   *
   * For script-controlled credentials, provide a redeemer.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @deprecated Use delegateToPool, delegateToDRep, or delegateToPoolAndDRep instead
   * @since 2.0.0
   * @category staking-methods
   */
  readonly delegateTo: (params: DelegateToParams) => this

  /**
   * Delegate stake to a pool.
   *
   * Creates a StakeDelegation certificate to delegate your stake credential
   * to a specific stake pool for earning staking rewards.
   *
   * For script-controlled credentials, provide a redeemer.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category staking-methods
   */
  readonly delegateToPool: (params: DelegateToPoolParams) => this

  /**
   * Delegate voting power to a DRep.
   *
   * Creates a VoteDelegCert certificate to delegate your governance voting power
   * to a Delegated Representative (Conway era).
   *
   * For script-controlled credentials, provide a redeemer.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category staking-methods
   */
  readonly delegateToDRep: (params: DelegateToDRepParams) => this

  /**
   * Delegate both stake and voting power.
   *
   * Creates a StakeVoteDelegCert certificate to simultaneously delegate your
   * stake to a pool and your voting power to a DRep (Conway era).
   *
   * For script-controlled credentials, provide a redeemer.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category staking-methods
   */
  readonly delegateToPoolAndDRep: (params: DelegateToPoolAndDRepParams) => this

  /**
   * Withdraw staking rewards from a stake credential.
   *
   * Withdraws accumulated rewards to the transaction's change address.
   * Use `amount: 0n` to trigger a stake validator without withdrawing rewards
   * (useful for the coordinator pattern).
   *
   * For script-controlled credentials, provide a redeemer. The redeemer can use:
   * - **Static**: Direct Data value
   * - **Self**: Callback receiving the indexed withdrawal
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category staking-methods
   */
  readonly withdraw: (params: WithdrawParams) => this

  /**
   * Register a stake credential and delegate in a single certificate.
   *
   * Combines registration and delegation into one certificate, reducing
   * transaction size and fees. Available in Conway era onwards.
   *
   * Supports three delegation modes:
   * - **Stake only**: Provide `poolKeyHash` to register and delegate to pool
   * - **Vote only**: Provide `drep` to register and delegate voting power
   * - **Both**: Provide both for combined registration + delegation
   *
   * For script-controlled credentials, provide a redeemer.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category staking-methods
   */
  readonly registerAndDelegateTo: (params: RegisterAndDelegateToParams) => this

  /**
   * Register as a Delegated Representative (DRep).
   *
   * Registers a credential as a DRep for governance voting. Requires paying
   * a DRep deposit. Optionally provide an anchor with metadata URL and hash.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category governance-methods
   */
  readonly registerDRep: (params: RegisterDRepParams) => this

  /**
   * Update DRep metadata anchor.
   *
   * Updates the anchor (metadata URL + hash) for a registered DRep.
   * For script-controlled DRep credentials, provide a redeemer.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category governance-methods
   */
  readonly updateDRep: (params: UpdateDRepParams) => this

  /**
   * Deregister as a DRep.
   *
   * Removes DRep registration and reclaims the deposit.
   * For script-controlled DRep credentials, provide a redeemer.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category governance-methods
   */
  readonly deregisterDRep: (params: DeregisterDRepParams) => this

  /**
   * Authorize a committee hot credential.
   *
   * Authorizes a hot credential to act on behalf of a cold committee credential.
   * The cold credential is kept offline for security; the hot credential signs
   * governance actions.
   *
   * For script-controlled cold credentials, provide a redeemer.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category governance-methods
   */
  readonly authCommitteeHot: (params: AuthCommitteeHotParams) => this

  /**
   * Resign from the constitutional committee.
   *
   * Submits a resignation from committee membership. Optionally provide
   * an anchor with resignation rationale.
   *
   * For script-controlled cold credentials, provide a redeemer.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category governance-methods
   */
  readonly resignCommitteeCold: (params: ResignCommitteeColdParams) => this

  /**
   * Register or update a stake pool.
   *
   * Registers a new stake pool or updates existing pool parameters.
   * Pool parameters include operator key, VRF key, costs, margin, reward account, etc.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category pool-methods
   */
  readonly registerPool: (params: RegisterPoolParams) => this

  /**
   * Retire a stake pool.
   *
   * Announces pool retirement effective at the specified epoch.
   * The pool will continue operating until the retirement epoch.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @since 2.0.0
   * @category pool-methods
   */
  readonly retirePool: (params: RetirePoolParams) => this

  /**
   * Set the transaction validity interval.
   *
   * Configures the time window during which the transaction is valid:
   * - `from`: Transaction is valid after this time (converted to validityIntervalStart slot)
   * - `to`: Transaction expires after this time (converted to ttl slot)
   *
   * Times are Unix timestamps in milliseconds. At least one bound must be specified.
   * For time-locked scripts, `to` is typically required for script evaluation.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @example
   * ```typescript
   * import * as Time from "@evolution-sdk/Time"
   *
   * // Transaction valid for 10 minutes from now
   * const tx = await builder
   *   .setValidity({
   *     from: Time.now(),
   *     to: Time.now() + 600_000n  // 10 minutes
   *   })
   *   .build()
   *
   * // Only set expiration (most common)
   * const tx = await builder
   *   .setValidity({ to: Time.now() + 300_000n })  // 5 minute TTL
   *   .build()
   * ```
   *
   * @since 2.0.0
   * @category validity-methods
   */
  readonly setValidity: (params: ValidityParams) => this

  /**
   * Submit votes on governance actions.
   *
   * Submits voting procedures to vote on governance proposals. Supports multiple
   * voters voting on multiple proposals in a single transaction.
   *
   * For script-controlled voters (DRep, Constitutional Committee member, or stake pool
   * with script credential), provide a redeemer to satisfy the vote purpose validator.
   * The redeemer will be applied to all script voters in the voting procedures.
   *
   * Use VotingProcedures.singleVote() helper for simple cases or construct
   * VotingProcedures directly for complex multi-voter scenarios.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @example
   * ```typescript
   * import * as VotingProcedures from "@evolution-sdk/VotingProcedures"
   * import * as Vote from "@evolution-sdk/Vote"
   * import * as Data from "@evolution-sdk/Data"
   *
   * // Simple single vote with helper
   * await client.newTx()
   *   .vote({
   *     votingProcedures: VotingProcedures.singleVote(
   *       new VotingProcedures.DRepVoter({ credential: myDRepCred }),
   *       govActionId,
   *       new VotingProcedures.VotingProcedure({
   *         vote: Vote.yes(),
   *         anchor: null
   *       })
   *     ),
   *     redeemer: Data.to(new Constr(0, [])) // for script DRep
   *   })
   *   .attachScript({ script: voteScript })
   *   .build()
   *   .then(tx => tx.sign())
   *   .then(tx => tx.submit())
   *
   * // Multiple votes from same voter
   * await client.newTx()
   *   .vote({
   *     votingProcedures: VotingProcedures.multiVote(
   *       new VotingProcedures.DRepVoter({ credential: myDRepCred }),
   *       [
   *         [govActionId1, new VotingProcedures.VotingProcedure({ vote: Vote.yes(), anchor: null })],
   *         [govActionId2, new VotingProcedures.VotingProcedure({ vote: Vote.no(), anchor: null })]
   *       ]
   *     )
   *   })
   *   .build()
   * ```
   *
   * @since 2.0.0
   * @category governance-methods
   */
  readonly vote: (params: VoteParams) => this

  /**
   * Submit a governance action proposal.
   *
   * Submits a governance action proposal to the blockchain.
   * The deposit (govActionDeposit) is automatically fetched from protocol parameters
   * and will be refunded to the specified reward account when the proposal is finalized.
   *
   * Call .propose() multiple times to submit multiple proposals in one transaction.
   * Consistent with .registerStake() and .registerDRep() - no manual deposit handling.
   *
   * The deposit amount is automatically deducted during transaction balancing.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @example
   * ```typescript
   * import * as GovernanceAction from "@evolution-sdk/GovernanceAction"
   * import * as RewardAccount from "@evolution-sdk/RewardAccount"
   *
   * // Submit single proposal (deposit auto-fetched)
   * await client.newTx()
   *   .propose({
   *     governanceAction: new GovernanceAction.InfoAction({}),
   *     rewardAccount: myRewardAccount,
   *     anchor: myAnchor // or null
   *   })
   *   .build()
   *   .then(tx => tx.sign())
   *   .then(tx => tx.submit())
   *
   * // Multiple proposals in one transaction
   * await client.newTx()
   *   .propose({
   *     governanceAction: new GovernanceAction.InfoAction({}),
   *     rewardAccount: myRewardAccount,
   *     anchor: null
   *   })
   *   .propose({
   *     governanceAction: new GovernanceAction.NoConfidenceAction({ govActionId: null }),
   *     rewardAccount: myRewardAccount,
   *     anchor: myOtherAnchor
   *   })
   *   .build()
   *   .then(tx => tx.sign())
   *   .then(tx => tx.submit())
   * ```
   *
   * @since 2.0.0
   * @category governance-methods
   */
  readonly propose: (params: ProposeParams) => this

  /**
   * Add a required signer to the transaction.
   *
   * Adds a key hash to the transaction's requiredSigners field. This is used to
   * require specific key signatures even when those keys don't control inputs.
   * Common use cases include:
   * - Multi-sig schemes requiring explicit signature verification
   * - Plutus scripts that check for specific signers in the transaction
   * - Governance transactions requiring DRep or committee member signatures
   *
   * Duplicate key hashes are automatically deduplicated.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @example
   * ```typescript
   * import * as KeyHash from "@evolution-sdk/KeyHash"
   * import * as Address from "@evolution-sdk/Address"
   *
   * // Add signer from address credential
   * const address = Address.fromBech32("addr_test1...")
   * const cred = address.paymentCredential
   * if (cred._tag === "KeyHash") {
   *   const tx = await builder
   *     .addSigner({ keyHash: cred })
   *     .build()
   * }
   * ```
   *
   * @since 2.0.0
   * @category builder-methods
   */
  readonly addSigner: (params: AddSignerParams) => this

  /**
   * Attach metadata to the transaction.
   *
   * Metadata is stored in the auxiliary data section and identified by numeric labels
   * following the CIP-10 standard. Common use cases include:
   * - Transaction messages/comments (label 674, CIP-20)
   * - NFT metadata (label 721, CIP-25)
   * - Royalty information (label 777, CIP-27)
   * - DApp-specific data
   *
   * Multiple metadata entries with different labels can be attached by calling this
   * method multiple times. The same label cannot be used twice.
   *
   * Queues a deferred operation that will be executed when build() is called.
   * Returns the same builder for method chaining.
   *
   * @example
   * ```typescript
   * import { fromEntries } from "@evolution-sdk/evolution/TransactionMetadatum"
   *
   * // Attach a simple message (CIP-20)
   * const tx = await builder
   *   .payToAddress({ address, assets: { lovelace: 2_000_000n } })
   *   .attachMetadata({ label: 674n, metadata: "Hello, Cardano!" })
   *   .build()
   *
   * // Attach NFT metadata (CIP-25)
   * const nftMetadata = fromEntries([
   *   ["name", "My NFT #42"],
   *   ["image", "ipfs://Qm..."]
   * ])
   * const tx = await builder
   *   .mintAssets({ assets: { [policyId + assetName]: 1n } })
   *   .attachMetadata({ label: 721n, metadata: nftMetadata })
   *   .build()
   * ```
   *
   * @since 2.0.0
   * @category metadata-methods
   */
  readonly attachMetadata: (params: AttachMetadataParams) => this

  // ============================================================================
  // Composition Methods
  // ============================================================================

  /**
   * Compose this builder with another builder's accumulated operations.
   *
   * Merges all queued operations from another transaction builder into this one.
   * The other builder's programs are captured at compose time and will be executed
   * when build() is called on this builder.
   *
   * This enables modular transaction building where common patterns can be
   * encapsulated in reusable builder fragments.
   *
   * **Important**: Composition is one-way - changes to the other builder after
   * compose() is called will not affect this builder.
   *
   * @example
   * ```typescript
   * // Create reusable builder for common operations
   * const mintBuilder = builder
   *   .mintAssets({ policyId, assets: { tokenName: 1n }, redeemer })
   *   .attachScript({ script: mintingPolicy })
   *
   * // Compose into a transaction that also pays to an address
   * const tx = await builder
   *   .payToAddress({ address, assets: { lovelace: 5_000_000n } })
   *   .compose(mintBuilder)
   *   .build()
   *
   * // Compose multiple builders
   * const fullTx = await builder
   *   .compose(mintBuilder)
   *   .compose(metadataBuilder)
   *   .compose(certBuilder)
   *   .build()
   * ```
   *
   * @param other - Another transaction builder whose operations will be merged
   * @returns The same builder for method chaining
   *
   * @since 2.0.0
   * @category composition-methods
   */
  readonly compose: (other: TransactionBuilder) => this

  /**
   * Get a snapshot of the accumulated programs.
   *
   * Returns a read-only copy of all queued operations that have been added
   * to this builder. Useful for inspection, debugging, or advanced composition patterns.
   *
   * @returns Read-only array of accumulated program steps
   *
   * @since 2.0.0
   * @category composition-methods
   */
  readonly getPrograms: () => ReadonlyArray<ProgramStep>

  // ============================================================================
  // Transaction Chaining Methods
  // ============================================================================

  /**
   * Execute transaction build and return consumed/available UTxOs for chaining.
   *
   * Runs the full build pipeline (coin selection, fee calculation, evaluation) and returns
   * which UTxOs were consumed and which remain available for subsequent transactions.
   * Use this when building multiple dependent transactions in sequence.
   *
   * @returns Promise<ChainResult> with consumed and available UTxOs
   *
   * @example
   * ```typescript
   * // Build first transaction, get remaining UTxOs
   * const tx1 = await builder
   *   .payTo({ address, value: { lovelace: 5_000_000n } })
   *   .build({ availableUtxos: walletUtxos })
   *
   * // Build second transaction using remaining UTxOs from chainResult
   * const tx2 = await builder
   *   .payTo({ address, value: { lovelace: 3_000_000n } })
   *   .build({ availableUtxos: tx1.chainResult().available })
   * ```
   *
   * @since 2.0.0
   * @category chaining-methods
   */
}

/**
 * Transaction builder for signing wallets (SigningWallet or ApiWallet).
 *
 * Builds transactions that can be signed. The build() method returns a SignBuilder
 * which provides sign(), signWithWitness(), and other signing capabilities.
 *
 * This builder type is returned when makeTxBuilder() is called with a signing wallet.
 * Type narrowing happens automatically at construction time - no call-site guards needed.
 *
 * @since 2.0.0
 * @category builder-interfaces
 */
export interface SigningTransactionBuilder extends TransactionBuilderBase {
  /**
   * Execute all queued operations and return a signing-ready transaction via Promise.
   *
   * Creates fresh state and runs all accumulated ProgramSteps sequentially.
   * Can be called multiple times on the same builder instance with independent results.
   *
   * @returns Promise<SignBuilder> which provides signing capabilities
   *
   * @since 2.0.0
   * @category completion-methods
   */
  readonly build: (options?: BuildOptions) => Promise<SignBuilder>

  /**
   * Execute all queued operations and return a signing-ready transaction via Effect.
   *
   * Creates fresh state and runs all accumulated ProgramSteps sequentially.
   * Suitable for Effect-TS compositional workflows and error handling.
   *
   * @returns Effect<SignBuilder, ...> which provides signing capabilities
   *
   * @since 2.0.0
   * @category completion-methods
   */
  readonly buildEffect: (
    options?: BuildOptions
  ) => Effect.Effect<
    SignBuilder,
    TransactionBuilderError | EvaluationError | WalletNew.WalletError | Provider.ProviderError,
    never
  >

  /**
   * Execute all queued operations with explicit error handling via Either.
   *
   * Creates fresh state and runs all accumulated ProgramSteps sequentially.
   * Returns Either<Result, Error> for pattern-matched error recovery.
   *
   * @returns Promise<Either<SignBuilder, Error>>
   *
   * @since 2.0.0
   * @category completion-methods
   */
  readonly buildEither: (
    options?: BuildOptions
  ) => Promise<
    Either<SignBuilder, TransactionBuilderError | EvaluationError | WalletNew.WalletError | Provider.ProviderError>
  >
}

/**
 * Transaction builder for read-only wallets (ReadOnlyWallet or undefined).
 *
 * Builds transactions that cannot be signed. The build() method returns a TransactionResultBase
 * which provides query methods like toTransaction() but NOT signing capabilities.
 *
 * This builder type is returned when makeTxBuilder() is called with a read-only wallet or no wallet.
 * Type narrowing happens automatically at construction time - no call-site guards needed.
 *
 * @since 2.0.0
 * @category builder-interfaces
 */
export interface ReadOnlyTransactionBuilder extends TransactionBuilderBase {
  /**
   * Execute all queued operations and return a transaction result via Promise.
   *
   * Creates fresh state and runs all accumulated ProgramSteps sequentially.
   * Can be called multiple times on the same builder instance with independent results.
   *
   * @returns Promise<TransactionResultBase> which provides query-only methods
   *
   * @since 2.0.0
   * @category completion-methods
   */
  readonly build: (options?: BuildOptions) => Promise<TransactionResultBase>

  /**
   * Execute all queued operations and return a transaction result via Effect.
   *
   * Creates fresh state and runs all accumulated ProgramSteps sequentially.
   * Suitable for Effect-TS compositional workflows and error handling.
   *
   * @returns Effect<TransactionResultBase, ...> which provides query-only methods
   *
   * @since 2.0.0
   * @category completion-methods
   */
  readonly buildEffect: (
    options?: BuildOptions
  ) => Effect.Effect<
    TransactionResultBase,
    TransactionBuilderError | EvaluationError | WalletNew.WalletError | Provider.ProviderError,
    never
  >

  /**
   * Execute all queued operations with explicit error handling via Either.
   *
   * Creates fresh state and runs all accumulated ProgramSteps sequentially.
   * Returns Either<Result, Error> for pattern-matched error recovery.
   *
   * @returns Promise<Either<TransactionResultBase, Error>>
   *
   * @since 2.0.0
   * @category completion-methods
   */
  readonly buildEither: (
    options?: BuildOptions
  ) => Promise<
    Either<
      TransactionResultBase,
      TransactionBuilderError | EvaluationError | WalletNew.WalletError | Provider.ProviderError
    >
  >
}

/**
 * Union type for all transaction builders.
 * Use specific types (SigningTransactionBuilder or ReadOnlyTransactionBuilder) when you know the wallet type.
 *
 * @since 2.0.0
 * @category builder-interfaces
 */
export type TransactionBuilder = SigningTransactionBuilder | ReadOnlyTransactionBuilder

/**
 * Conditional type to determine the correct TransactionBuilder based on wallet type.
 * - If wallet is SigningWallet or ApiWallet: SigningTransactionBuilder
 * - If wallet is ReadOnlyWallet or undefined: ReadOnlyTransactionBuilder
 *
 * @internal
 */
export type TxBuilderResultType<
  W extends WalletNew.SigningWallet | WalletNew.ApiWallet | WalletNew.ReadOnlyWallet | undefined
> = W extends WalletNew.SigningWallet | WalletNew.ApiWallet ? SigningTransactionBuilder : ReadOnlyTransactionBuilder

/**
 * Construct a TransactionBuilder instance from protocol configuration.
 *
 * The builder accumulates chainable method calls as deferred ProgramSteps. Calling build() or chain()
 * creates fresh state (new Refs) and executes all accumulated programs sequentially, ensuring
 * no state pollution between invocations.
 *
 * The return type is determined by the actual wallet provided using conditional types:
 * - SigningTransactionBuilder: When wallet is SigningWallet or ApiWallet
 * - ReadOnlyTransactionBuilder: When wallet is ReadOnlyWallet or undefined
 *
 * Wallet type narrowing happens at construction time based on the wallet's actual type.
 * No call-site type narrowing or type guards needed.
 *
 * Wallet parameter is optional; if omitted, changeAddress and availableUtxos must be
 * provided at build time via BuildOptions.
 *
 * @since 2.0.0
 * @category constructors
 *
 */
export function makeTxBuilder<
  W extends WalletNew.SigningWallet | WalletNew.ApiWallet | WalletNew.ReadOnlyWallet | undefined
>(config: Partial<TxBuilderConfig> & { wallet?: W }): TxBuilderResultType<W>
export function makeTxBuilder(config: TxBuilderConfig) {
  const programs: Array<ProgramStep> = []

  const txBuilder = {
    // ============================================================================
    // Chainable builder methods - Create ProgramSteps, return same instance
    // ============================================================================

    payToAddress: (params: PayToAddressParams) => {
      // Create ProgramStep for deferred execution
      const program = createPayToAddressProgram(params)
      programs.push(program)
      return txBuilder // Return same instance for chaining
    },

    collectFrom: (params: CollectFromParams) => {
      // Create ProgramStep for deferred execution
      const program = createCollectFromProgram(params)
      programs.push(program)
      return txBuilder // Return same instance for chaining
    },

    sendAll: (params: SendAllParams) => {
      // Create ProgramStep for deferred execution
      const program = createSendAllProgram(params)
      programs.push(program)
      return txBuilder // Return same instance for chaining
    },

    mintAssets: (params: MintTokensParams) => {
      // Create ProgramStep for deferred execution
      const program = createMintAssetsProgram(params)
      programs.push(program)
      return txBuilder // Return same instance for chaining
    },

    readFrom: (params: ReadFromParams) => {
      // Create ProgramStep for deferred execution
      const program = createReadFromProgram(params)
      programs.push(program)
      return txBuilder // Return same instance for chaining
    },

    attachScript: (params: { script: CoreScript.Script }) => {
      // Create ProgramStep for deferred execution
      const program = attachScriptToState(params.script)
      programs.push(program)
      return txBuilder // Return same instance for chaining
    },

    // Staking/Certificate methods
    registerStake: (params: RegisterStakeParams) => {
      const program = createRegisterStakeProgram(params)
      programs.push(program)
      return txBuilder
    },
    deregisterStake: (params: DeregisterStakeParams) => {
      const program = createDeregisterStakeProgram(params)
      programs.push(program)
      return txBuilder
    },
    delegateTo: (params: DelegateToParams) => {
      const program = createDelegateToProgram(params)
      programs.push(program)
      return txBuilder
    },
    delegateToPool: (params: DelegateToPoolParams) => {
      const program = createDelegateToPoolProgram(params)
      programs.push(program)
      return txBuilder
    },
    delegateToDRep: (params: DelegateToDRepParams) => {
      const program = createDelegateToDRepProgram(params)
      programs.push(program)
      return txBuilder
    },
    delegateToPoolAndDRep: (params: DelegateToPoolAndDRepParams) => {
      const program = createDelegateToPoolAndDRepProgram(params)
      programs.push(program)
      return txBuilder
    },
    withdraw: (params: WithdrawParams) => {
      const program = createWithdrawProgram(params, config)
      programs.push(program)
      return txBuilder
    },
    registerAndDelegateTo: (params: RegisterAndDelegateToParams) => {
      const program = createRegisterAndDelegateToProgram(params)
      programs.push(program)
      return txBuilder
    },
    registerDRep: (params: RegisterDRepParams) => {
      const program = createRegisterDRepProgram(params)
      programs.push(program)
      return txBuilder
    },
    updateDRep: (params: UpdateDRepParams) => {
      const program = createUpdateDRepProgram(params)
      programs.push(program)
      return txBuilder
    },
    deregisterDRep: (params: DeregisterDRepParams) => {
      const program = createDeregisterDRepProgram(params)
      programs.push(program)
      return txBuilder
    },
    authCommitteeHot: (params: AuthCommitteeHotParams) => {
      const program = createAuthCommitteeHotProgram(params)
      programs.push(program)
      return txBuilder
    },
    resignCommitteeCold: (params: ResignCommitteeColdParams) => {
      const program = createResignCommitteeColdProgram(params)
      programs.push(program)
      return txBuilder
    },
    registerPool: (params: RegisterPoolParams) => {
      const program = createRegisterPoolProgram(params)
      programs.push(program)
      return txBuilder
    },
    retirePool: (params: RetirePoolParams) => {
      const program = createRetirePoolProgram(params)
      programs.push(program)
      return txBuilder
    },
    setValidity: (params: ValidityParams) => {
      programs.push(createSetValidityProgram(params))
      return txBuilder
    },
    vote: (params: VoteParams) => {
      const program = createVoteProgram(params)
      programs.push(program)
      return txBuilder
    },
    propose: (params: ProposeParams) => {
      const program = createProposeProgram(params)
      programs.push(program)
      return txBuilder
    },
    addSigner: (params: AddSignerParams) => {
      programs.push(createAddSignerProgram(params))
      return txBuilder
    },
    attachMetadata: (params: AttachMetadataParams) => {
      programs.push(createAttachMetadataProgram(params))
      return txBuilder
    },
    compose: (other: TransactionBuilder) => {
      const otherPrograms = other.getPrograms()
      if (otherPrograms.length > 0) {
        programs.push(...otherPrograms)
      }
      return txBuilder
    },

    getPrograms: () => [...programs],

    buildEffect: (options?: BuildOptions) => {
      return makeBuild(config, programs, options)
    },

    build: (options?: BuildOptions) => {
      const effect = makeBuild(config, programs, options)
      return runEffectPromise(
        options?.debug
          ? effect.pipe(Effect.provide(Layer.merge(Logger.pretty, Logger.minimumLogLevel(LogLevel.Debug))))
          : effect
      )
    },
    buildEither: (options?: BuildOptions) => {
      const effect = makeBuild(config, programs, options).pipe(Effect.either)
      return runEffectPromise(
        options?.debug
          ? effect.pipe(Effect.provide(Layer.merge(Logger.pretty, Logger.minimumLogLevel(LogLevel.Debug))))
          : effect
      )
    },

    // ============================================================================
    // Debug methods - Execute with fresh state, return partial transaction
    // ============================================================================

    buildPartialEffect: (options?: BuildOptions) => buildPartialEffectCore(config, programs, options),

    buildPartial: (options?: BuildOptions) => runEffectPromise(buildPartialEffectCore(config, programs, options))
  }

  return txBuilder
}
