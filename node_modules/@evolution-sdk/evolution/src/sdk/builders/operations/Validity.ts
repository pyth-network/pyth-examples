/**
 * Validity operation - sets transaction validity interval.
 *
 * Configures the time window during which the transaction is valid:
 * - `from`: Transaction is valid after this time (validityIntervalStart slot)
 * - `to`: Transaction expires after this time (ttl slot)
 *
 * Times are provided as Unix milliseconds and converted to slots based on
 * the network's slot configuration.
 *
 * @module operations/Validity
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import { TransactionBuilderError, TxContext } from "../TransactionBuilder.js"
import type { ValidityParams } from "./Operations.js"

/**
 * Creates a ProgramStep for setValidity operation.
 * Sets the transaction validity interval (from/to times).
 *
 * Implementation:
 * 1. Validates at least one bound is provided
 * 2. Stores Unix times in state (slot conversion happens during assembly)
 *
 * @since 2.0.0
 * @category programs
 */
export const createSetValidityProgram = (
  params: ValidityParams
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // 1. Validate at least one bound is provided
    if (params.from === undefined && params.to === undefined) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "setValidity requires at least one of 'from' or 'to' to be specified"
        })
      )
    }

    // 2. Validate from < to if both provided
    if (params.from !== undefined && params.to !== undefined && params.from >= params.to) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: `Invalid validity interval: 'from' (${params.from}) must be less than 'to' (${params.to})`
        })
      )
    }

    // 3. Update state with validity interval
    yield* Ref.update(ctx, (state) => ({
      ...state,
      validity: {
        from: params.from,
        to: params.to
      }
    }))

    yield* Effect.logDebug(`[SetValidity] Set validity interval: from=${params.from}, to=${params.to}`)
  })
