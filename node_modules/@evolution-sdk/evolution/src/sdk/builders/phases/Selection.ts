/**
 * Selection Phase - UTxO Coin Selection
 *
 * Selects UTxOs from available pool to cover transaction outputs, fees, and change requirements.
 * Handles both initial selection and reselection with retry logic up to MAX_ATTEMPTS.
 *
 * @module Selection
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as CoreAssets from "../../../Assets/index.js"
import * as CoreUTxO from "../../../UTxO.js"
import type { CoinSelectionAlgorithm, CoinSelectionFunction } from "../CoinSelection.js"
import { largestFirstSelection } from "../CoinSelection.js"
import * as EvaluationStateManager from "../EvaluationStateManager.js"
import { negatedMintAssets } from "../operations/Mint.js"
import {
  AvailableUtxosTag,
  BuildOptionsTag,
  PhaseContextTag,
  TransactionBuilderError,
  TxContext
} from "../TransactionBuilder.js"
import { calculateTotalAssets } from "../TxBuilderImpl.js"
import type { PhaseResult } from "./Phases.js"

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
 * Get UTxOs that haven't been selected yet and are not reference inputs.
 * Uses Set for O(1) lookup instead of O(n) for better performance.
 */
const getAvailableUtxos = (
  allUtxos: ReadonlyArray<CoreUTxO.UTxO>,
  selectedUtxos: ReadonlyArray<CoreUTxO.UTxO>,
  referenceInputs: ReadonlyArray<CoreUTxO.UTxO> = []
): ReadonlyArray<CoreUTxO.UTxO> => {
  const selectedKeys = new Set(selectedUtxos.map((u) => CoreUTxO.toOutRefString(u)))
  const referenceKeys = new Set(referenceInputs.map((u) => CoreUTxO.toOutRefString(u)))
  return allUtxos.filter((utxo) => {
    const key = CoreUTxO.toOutRefString(utxo)
    return !selectedKeys.has(key) && !referenceKeys.has(key)
  })
}

/**
 * Helper: Get coin selection algorithm function from name
 */
const getCoinSelectionAlgorithm = (algorithm: CoinSelectionAlgorithm): CoinSelectionFunction => {
  switch (algorithm) {
    case "largest-first":
      return largestFirstSelection
    case "random-improve":
      throw new TransactionBuilderError({
        message: "random-improve algorithm not yet implemented",
        cause: { algorithm }
      })
    case "optimal":
      throw new TransactionBuilderError({
        message: "optimal algorithm not yet implemented",
        cause: { algorithm }
      })
    default:
      throw new TransactionBuilderError({
        message: `Unknown coin selection algorithm: ${algorithm}`,
        cause: { algorithm }
      })
  }
}

/**
 * Resolve coin selection function from options.
 * Returns the configured algorithm or defaults to largest-first.
 */
const resolveCoinSelectionFn = (
  coinSelection?: CoinSelectionAlgorithm | CoinSelectionFunction
): CoinSelectionFunction => {
  if (!coinSelection) return largestFirstSelection
  if (typeof coinSelection === "function") return coinSelection
  return getCoinSelectionAlgorithm(coinSelection)
}

/**
 * Add selected UTxOs to transaction context state.
 * Updates both the selected UTxOs list and total input assets.
 */
const addUtxosToState = (selectedUtxos: ReadonlyArray<CoreUTxO.UTxO>): Effect.Effect<void, never, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Log each UTxO being added
    for (const utxo of selectedUtxos) {
      const outRef = CoreUTxO.toOutRefString(utxo)
      yield* Effect.logDebug(`[Selection] Adding UTxO: ${outRef}, ${formatAssetsForLog(utxo.assets)}.`)
    }

    // Calculate total assets from selected UTxOs
    const additionalAssets = calculateTotalAssets(selectedUtxos)

    // Update state with new UTxOs and input assets
    const state = yield* Ref.get(ctx)
    const hasRedeemers = state.redeemers.size > 0

    yield* Ref.update(ctx, (state) => {
      // Invalidate redeemer exUnits when inputs change (immutable operation)
      // This ensures re-evaluation happens with the new transaction structure
      const updatedRedeemers = hasRedeemers
        ? EvaluationStateManager.invalidateExUnits(state.redeemers)
        : state.redeemers

      return {
        ...state,
        selectedUtxos: [...state.selectedUtxos, ...selectedUtxos],
        totalInputAssets: CoreAssets.merge(state.totalInputAssets, additionalAssets),
        redeemers: updatedRedeemers
      }
    })

    if (hasRedeemers) {
      yield* Effect.logDebug("[Selection] Invalidated redeemer exUnits - re-evaluation required after input change")
    }
  })

/**
 * Helper: Perform coin selection and update TxContext.state
 */
const performCoinSelectionUpdateState = (assetShortfalls: CoreAssets.Assets) =>
  Effect.gen(function* () {
    const ctx = yield* TxContext
    const state = yield* Ref.get(ctx)
    const alreadySelected = state.selectedUtxos

    // Get resolved availableUtxos from context tag
    const allAvailableUtxos = yield* AvailableUtxosTag
    const buildOptions = yield* BuildOptionsTag
    const availableUtxos = getAvailableUtxos(allAvailableUtxos, alreadySelected, state.referenceInputs)
    const coinSelectionFn = resolveCoinSelectionFn(buildOptions.coinSelection)

    const { selectedUtxos } = yield* Effect.try({
      try: () => coinSelectionFn(availableUtxos, assetShortfalls),
      catch: (error) => {
        // Custom serialization for Assets (handles BigInt)
        return new TransactionBuilderError({
          message: `Coin selection failed for ${formatAssetsForLog(assetShortfalls)}`,
          cause: error
        })
      }
    })

    yield* addUtxosToState(selectedUtxos)
  })

/**
 * Selection Phase - UTxO Coin Selection
 *
 * Selects UTxOs from available pool to cover transaction outputs, fees, and change requirements.
 * Handles both initial selection and reselection with retry logic up to MAX_ATTEMPTS.
 *
 * **Decision Flow:**
 * ```
 * Calculate Required Assets
 * (outputs + shortfall for fees/change)
 *   ↓
 * Assets Sufficient?
 * (inputs >= required)
 *   ├─ YES → No selection needed
 *   │        (use existing explicit inputs only)
 *   │        goto changeCreation
 *   └─ NO → Calculate asset delta
 *           ├─ Shortfall from fees? → Reselection mode
 *           │  (select more lovelace for change minUTxO)
 *           └─ Shortfall from outputs? → Normal selection
 *              (select missing native assets or lovelace)
 *           ↓
 *        Perform coin selection
 *        (update totalInputAssets)
 *        ↓
 *        Increment attempt counter
 *        goto changeCreation
 * ```
 *
 * **Key Principles:**
 * - Selection phase runs once per state machine iteration
 * - Reselection (shortfall > 0) adds more UTxOs within MAX_ATTEMPTS limit
 * - Selection itself doesn't fail; ChangeCreation may trigger reselection
 * - No selection needed if explicit inputs already cover requirements
 * - Shortfall tracks lovelace deficit for change output minUTxO
 * - Asset delta identifies what additional UTxOs must contain
 * - Attempt counter resets at phase start, incremented at phase end
 * - Selection is deterministic (same inputs = same selection)
 */
export const executeSelection = (): Effect.Effect<
  PhaseResult,
  TransactionBuilderError,
  PhaseContextTag | TxContext | AvailableUtxosTag | BuildOptionsTag
> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext
    const buildCtxRef = yield* PhaseContextTag
    const buildCtx = yield* Ref.get(buildCtxRef)

    const state = yield* Ref.get(ctx)

    // === SendAll Mode ===
    // If sendAllTo is set, collect ALL available UTxOs and skip normal selection
    if (state.sendAllTo !== undefined) {
      yield* Effect.logDebug("[Selection] SendAll mode detected - collecting all available UTxOs")

      // Validation: sendAll is mutually exclusive with other builder operations
      if (state.outputs.length > 0) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              "sendAll() cannot be used with payToAddress(). " +
              "sendAll automatically creates the output with all wallet assets."
          })
        )
      }

      if (state.selectedUtxos.length > 0) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              "sendAll() cannot be used with collectFrom(). " + "sendAll automatically collects all wallet UTxOs."
          })
        )
      }

      if (state.mint !== undefined) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              "sendAll() cannot be used with mintAssets(). " +
              "sendAll is designed for draining a wallet, not minting operations."
          })
        )
      }

      if (state.certificates.length > 0) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              "sendAll() cannot be used with staking operations (registerStake, deregisterStake, delegateTo, etc.). " +
              "sendAll is designed for simple wallet drain operations only."
          })
        )
      }

      if (state.withdrawals.size > 0) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              "sendAll() cannot be used with withdraw(). " +
              "sendAll is designed for simple wallet drain operations only."
          })
        )
      }

      if (state.votingProcedures !== undefined || state.proposalProcedures !== undefined) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              "sendAll() cannot be used with governance operations (vote, propose). " +
              "sendAll is designed for simple wallet drain operations only."
          })
        )
      }

      // Get all available UTxOs
      const allAvailableUtxos = yield* AvailableUtxosTag

      if (allAvailableUtxos.length === 0) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message: "sendAll() failed: Wallet has no UTxOs to send."
          })
        )
      }

      // Select ALL UTxOs
      yield* addUtxosToState(allAvailableUtxos)

      const stateAfterSelection = yield* Ref.get(ctx)
      const totalInputAssets = stateAfterSelection.totalInputAssets

      yield* Effect.logDebug(
        `[Selection] SendAll: Collected ${allAvailableUtxos.length} UTxO(s) with ` +
          `${formatAssetsForLog(totalInputAssets)}`
      )

      // Update attempt counter
      yield* Ref.update(buildCtxRef, (ctx) => ({ ...ctx, attempt: ctx.attempt + 1, shortfall: 0n }))

      // sendAll is always a simple payment transaction (no scripts)
      // All script operations (collectFrom, mint, staking, governance) are blocked above
      return { next: "changeCreation" as const }
    }

    // === Normal Selection Mode ===
    const inputAssets = state.totalInputAssets
    const outputAssets = state.totalOutputAssets

    // Step 3: Calculate total needed (outputs + shortfall - mint)
    // Shortfall contains fee + any missing lovelace for change outputs
    // Mint assets are negated: positive mints reduce requirements, negative burns increase them
    const negatedMint = negatedMintAssets(state.mint)
    const totalNeeded = CoreAssets.merge(CoreAssets.addLovelace(outputAssets, buildCtx.shortfall), negatedMint)

    // Step 4: Calculate asset delta & extract shortfalls
    const assetDelta = CoreAssets.subtract(totalNeeded, inputAssets)
    const assetShortfalls = CoreAssets.filter(assetDelta, (_unit, amount) => amount > 0n)

    // During reselection (shortfall > 0), we need to select MORE lovelace
    // even if inputAssets >= totalNeeded, because the shortfall indicates
    // insufficient lovelace for change output minUTxO requirement
    const isReselection = buildCtx.shortfall > 0n
    const needsSelection = !CoreAssets.isEmpty(assetShortfalls) || isReselection

    yield* Effect.logDebug(
      `[Selection] Needed: {${formatAssetsForLog(totalNeeded)}}, ` +
        `Available: {${formatAssetsForLog(inputAssets)}}, ` +
        `Delta: {${formatAssetsForLog(assetDelta)}}` +
        (isReselection ? `, Reselection: shortfall=${buildCtx.shortfall}` : "")
    )

    // Step 5: Perform selection or skip
    if (!needsSelection) {
      yield* Effect.logDebug("[Selection] Assets sufficient")
      const state = yield* Ref.get(ctx)
      const selectedUtxos = state.selectedUtxos
      yield* Effect.logDebug(
        `[Selection] No selection needed: ${selectedUtxos.length} UTxO(s) already available from explicit inputs (collectFrom), ` +
          `Total lovelace: ${CoreAssets.lovelaceOf(inputAssets)}`
      )
    } else {
      if (isReselection) {
        yield* Effect.logDebug(
          `[Selection] Reselection attempt ${buildCtx.attempt + 1}: ` +
            `Need ${buildCtx.shortfall} more lovelace for change minUTxO`
        )
        // During reselection, select for the shortfall amount only
        const reselectionShortfall = CoreAssets.fromLovelace(buildCtx.shortfall)
        yield* performCoinSelectionUpdateState(reselectionShortfall)
      } else {
        yield* Effect.logDebug(`[Selection] Selecting for shortfall: ${formatAssetsForLog(assetShortfalls)}`)
        yield* performCoinSelectionUpdateState(assetShortfalls)
      }
    }

    // Step 5.5: Enforce Cardano protocol requirement: minimum 1 input UTxO
    // This handles cases where refunds/withdrawals cover all costs, but no UTxO inputs exist
    const stateAfterSelection = yield* Ref.get(ctx)
    if (stateAfterSelection.selectedUtxos.length === 0) {
      //TODO: double check if this is a good approach, it seems that this condition is only needed when refunds/withdrawals cover all costs
      const allAvailableUtxos = yield* AvailableUtxosTag
      const state = yield* Ref.get(ctx)

      // Filter out reference inputs - they can't be used as transaction inputs
      const selectableUtxos = getAvailableUtxos(allAvailableUtxos, state.selectedUtxos, state.referenceInputs)

      if (selectableUtxos.length === 0) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message:
              "Cannot build transaction: no UTxOs available and no explicit inputs provided. " +
              "Cardano protocol requires at least one input to prevent transaction replay."
          })
        )
      }

      // Select smallest UTxO to minimize excess
      const smallestUtxo = selectableUtxos.reduce((min, utxo) =>
        CoreAssets.lovelaceOf(utxo.assets) < CoreAssets.lovelaceOf(min.assets) ? utxo : min
      )

      yield* Effect.logDebug(
        `[Selection] Enforcing minimum 1 input: selected smallest UTxO with ${CoreAssets.lovelaceOf(smallestUtxo.assets)} lovelace ` +
          `(Cardano protocol requirement for replay protection)`
      )

      yield* addUtxosToState([smallestUtxo])
    }

    // Step 6: Update context and check for scripts
    yield* Ref.update(buildCtxRef, (ctx) => ({ ...ctx, attempt: ctx.attempt + 1, shortfall: 0n }))

    // Check if this is a script transaction (has redeemers or deferred redeemers)
    // If so, route to Collateral BEFORE ChangeCreation
    const finalState = yield* Ref.get(ctx)
    if (finalState.redeemers.size > 0 || finalState.deferredRedeemers.size > 0) {
      yield* Effect.logDebug("[Selection] Script transaction detected - routing to Collateral phase")
      return { next: "collateral" as const }
    }

    return { next: "changeCreation" as const }
  })
