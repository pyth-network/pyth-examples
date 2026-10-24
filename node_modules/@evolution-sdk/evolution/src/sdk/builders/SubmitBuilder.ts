/**
 * SubmitBuilder - Final stage of transaction lifecycle
 *
 * Represents a signed transaction ready for submission to the blockchain.
 * Provides the submit() method to broadcast the transaction and retrieve the transaction hash.
 *
 * @since 2.0.0
 * @category builders
 */

import type { Effect } from "effect"

import type * as TransactionHash from "../../TransactionHash.js"
import type * as TransactionWitnessSet from "../../TransactionWitnessSet.js"
import type { EffectToPromiseAPI } from "../Type.js"
import type { TransactionBuilderError } from "./TransactionBuilder.js"

/**
 * Effect-based API for SubmitBuilder operations.
 *
 * @since 2.0.0
 * @category interfaces
 */
export interface SubmitBuilderEffect {
  /**
   * Submit the signed transaction to the blockchain via the provider.
   *
   * @returns Effect resolving to the transaction hash
   * @since 2.0.0
   */
  readonly submit: () => Effect.Effect<TransactionHash.TransactionHash, TransactionBuilderError>
}

/**
 * SubmitBuilder - represents a signed transaction ready for submission.
 *
 * The final stage in the transaction lifecycle after building and signing.
 * Provides the submit() method to broadcast the transaction to the blockchain
 * and retrieve the transaction hash.
 *
 * @since 2.0.0
 * @category interfaces
 */
export interface SubmitBuilder extends EffectToPromiseAPI<SubmitBuilderEffect> {
  /**
   * Effect-based API for compositional workflows.
   *
   * @since 2.0.0
   */
  readonly Effect: SubmitBuilderEffect

  /**
   * The witness set containing all signatures for this transaction.
   *
   * Can be used to inspect the signatures or combine with other witness sets
   * for multi-party signing scenarios.
   *
   * @since 2.0.0
   */
  readonly witnessSet: TransactionWitnessSet.TransactionWitnessSet
}
