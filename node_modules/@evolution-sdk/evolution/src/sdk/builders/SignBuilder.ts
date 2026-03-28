import type { Effect } from "effect"

import type * as Transaction from "../../Transaction.js"
import type * as TransactionHash from "../../TransactionHash.js"
import type * as TransactionWitnessSet from "../../TransactionWitnessSet.js"
import type { EffectToPromiseAPI } from "../Type.js"
import type { SubmitBuilder } from "./SubmitBuilder.js"
import type { ChainResult, TransactionBuilderError } from "./TransactionBuilder.js"
import type { TransactionResultBase } from "./TransactionResult.js"

// ============================================================================
// Progressive Builder Interfaces
// ============================================================================

/**
 * Effect-based API for SignBuilder operations.
 *
 * Includes all TransactionResultBase.Effect methods plus signing-specific operations.
 *
 * @since 2.0.0
 * @category interfaces
 */
export interface SignBuilderEffect {
  // Base transaction methods (from TransactionResultBase)
  readonly toTransaction: () => Effect.Effect<Transaction.Transaction, TransactionBuilderError>
  readonly toTransactionWithFakeWitnesses: () => Effect.Effect<Transaction.Transaction, TransactionBuilderError>
  readonly estimateFee: () => Effect.Effect<bigint, TransactionBuilderError>

  // Signing methods
  readonly sign: () => Effect.Effect<SubmitBuilder, TransactionBuilderError>
  readonly signAndSubmit: () => Effect.Effect<TransactionHash.TransactionHash, TransactionBuilderError>
  readonly signWithWitness: (
    witnessSet: TransactionWitnessSet.TransactionWitnessSet
  ) => Effect.Effect<SubmitBuilder, TransactionBuilderError>
  readonly assemble: (
    witnesses: ReadonlyArray<TransactionWitnessSet.TransactionWitnessSet>
  ) => Effect.Effect<SubmitBuilder, TransactionBuilderError>
  readonly partialSign: () => Effect.Effect<TransactionWitnessSet.TransactionWitnessSet, TransactionBuilderError>
  readonly getWitnessSet: () => Effect.Effect<TransactionWitnessSet.TransactionWitnessSet, TransactionBuilderError>
}

/**
 * SignBuilder extends TransactionResultBase with signing capabilities.
 *
 * Only available when the client has a signing wallet (seed, private key, or API wallet).
 * Provides access to unsigned transaction (via base interface) and signing operations.
 *
 * Includes `chainResult` for transaction chaining - use `chainResult.available` as
 * `availableUtxos` for the next transaction in a chain.
 *
 * @since 2.0.0
 * @category interfaces
 */
export interface SignBuilder extends TransactionResultBase, EffectToPromiseAPI<SignBuilderEffect> {
  readonly Effect: SignBuilderEffect
  /**
   * Compute chain result for building dependent transactions.
   * Contains consumed UTxOs, available UTxOs (remaining + created), and txHash.
   *
   * Result is memoized - computed once on first call, cached for subsequent calls.
   */
  readonly chainResult: () => ChainResult
}
