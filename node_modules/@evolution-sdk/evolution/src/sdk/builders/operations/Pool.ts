/**
 * Pool operations - stake pool registration and retirement.
 *
 * @module operations/Pool
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as Certificate from "../../../Certificate.js"
import * as PoolKeyHash from "../../../PoolKeyHash.js"
import { TransactionBuilderError, TxBuilderConfigTag, TxContext } from "../TransactionBuilder.js"
import type { RegisterPoolParams, RetirePoolParams } from "./Operations.js"

// ============================================================================
// Pool Operations
// ============================================================================

/**
 * Creates a ProgramStep for registerPool operation.
 * Adds a PoolRegistration certificate to the transaction.
 * Used for both new pool registration and updating existing pool parameters.
 *
 * @since 2.0.0
 * @category programs
 */
export const createRegisterPoolProgram = (
  params: RegisterPoolParams
): Effect.Effect<void, TransactionBuilderError, TxContext | TxBuilderConfigTag> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext
    const config = yield* TxBuilderConfigTag

    // TODO: protocol param should be resolved earlier in builder phases, not here
    // protocol param can come from the provider or the build options directly
    // Get poolDeposit from protocol parameters via provider
    if (!config.provider) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Provider required to fetch poolDeposit for pool registration"
        })
      )
    }

    const protocolParams = yield* config.provider.Effect.getProtocolParameters().pipe(
      Effect.mapError(
        (err) =>
          new TransactionBuilderError({
            message: `Failed to fetch protocol parameters: ${err.message}`
          })
      )
    )
    const poolDeposit = protocolParams.poolDeposit

    // Create PoolRegistration certificate
    const certificate = new Certificate.PoolRegistration({
      poolParams: params.poolParams
    })

    yield* Ref.update(ctx, (state) => {
      const newPoolDeposits = new Map(state.poolDeposits)
      const operatorHex = PoolKeyHash.toHex(params.poolParams.operator)
      newPoolDeposits.set(operatorHex, poolDeposit)

      return {
        ...state,
        certificates: [...state.certificates, certificate],
        poolDeposits: newPoolDeposits
      }
    })

    yield* Effect.logDebug(`[RegisterPool] Added PoolRegistration certificate with deposit ${poolDeposit}`)
  })

/**
 * Creates a ProgramStep for retirePool operation.
 * Adds a PoolRetirement certificate to the transaction.
 * Announces pool retirement effective at the specified epoch.
 *
 * @since 2.0.0
 * @category programs
 */
export const createRetirePoolProgram = (params: RetirePoolParams): Effect.Effect<void, never, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Create PoolRetirement certificate
    const certificate = new Certificate.PoolRetirement({
      poolKeyHash: params.poolKeyHash,
      epoch: params.epoch
    })

    yield* Ref.update(ctx, (state) => ({
      ...state,
      certificates: [...state.certificates, certificate]
    }))

    yield* Effect.logDebug(
      `[RetirePool] Added PoolRetirement certificate for pool ${PoolKeyHash.toHex(params.poolKeyHash)} at epoch ${params.epoch}`
    )
  })
