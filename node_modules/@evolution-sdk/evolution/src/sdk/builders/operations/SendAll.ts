/**
 * SendAll operation - sends all wallet assets to a recipient address.
 *
 * This operation marks the transaction as a "send all" transaction,
 * which triggers special handling in the build phases:
 * 1. All wallet UTxOs are collected as inputs
 * 2. A single output is created with all assets minus fee to the recipient
 *
 * Note: Internally the output is stored in `changeOutputs` (the standard mechanism
 * for phase-created outputs), but semantically it represents the full transfer to
 * the recipient - not traditional "change" that returns to the sender.
 *
 * @module operations/SendAll
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import type * as CoreAddress from "../../../Address.js"
import { TxContext } from "../TransactionBuilder.js"
import type { SendAllParams } from "./Operations.js"

/**
 * Creates a ProgramStep for sendAll operation.
 *
 * This sets up the sendAll mode in the builder state, which is processed
 * during the build phases. The actual UTxO collection and output creation
 * happens during the build process when wallet UTxOs are available.
 *
 * @since 2.0.0
 * @category programs
 */
export const createSendAllProgram = (params: SendAllParams) =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    yield* Ref.update(ctx, (state) => ({
      ...state,
      sendAllTo: params.to
    }))

    yield* Effect.logDebug(`[SendAll] Configured to send all assets to ${params.to}`)
  })

/**
 * Type representing the sendAll target address in builder state.
 *
 * @since 2.0.0
 * @category types
 */
export type SendAllTarget = CoreAddress.Address
