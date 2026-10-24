/**
 * ReadFrom operation - adds UTxOs as reference inputs for reading on-chain data.
 *
 * Reference inputs allow reading UTxO data (datums, reference scripts) without consuming them.
 * They are commonly used to:
 * - Reference validators/scripts stored on-chain (reduces tx size)
 * - Read datum values without spending the UTxO
 * - Share scripts across multiple transactions
 *
 * @module operations/ReadFrom
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as CoreUTxO from "../../../UTxO.js"
import { TransactionBuilderError, TxContext } from "../TransactionBuilder.js"
import type { ReadFromParams } from "./Operations.js"

/**
 * Creates a ProgramStep for readFrom operation.
 * Adds UTxOs as reference inputs that can be read but not consumed.
 *
 * Implementation:
 * 1. Validates that reference inputs array is not empty
 * 2. Validates that reference inputs are not already selected as regular inputs
 * 3. Adds UTxOs to state.referenceInputs
 * 4. Tracks reference script fees during fee calculation
 *
 * @since 2.0.0
 * @category programs
 */
export const createReadFromProgram = (
  params: ReadFromParams
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    yield* Effect.logDebug(`[ReadFrom] Adding ${params.referenceInputs.length} reference input(s)`)

    // 1. Validate reference inputs exist
    if (params.referenceInputs.length === 0) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "No reference inputs provided to readFrom"
        })
      )
    }

    // 2. Validate no conflicts with regular inputs
    const state = yield* Ref.get(ctx)
    const refInputKeys = new Set(params.referenceInputs.map((utxo) => CoreUTxO.toOutRefString(utxo)))
    const selectedInputKeys = new Set(state.selectedUtxos.map((utxo) => CoreUTxO.toOutRefString(utxo)))

    const refInputKeysArray = Array.from(refInputKeys)
    for (const refKey of refInputKeysArray) {
      if (selectedInputKeys.has(refKey)) {
        return yield* Effect.fail(
          new TransactionBuilderError({
            message: `UTxO ${refKey} cannot be both a regular input and a reference input`
          })
        )
      }
    }

    // 3. Add reference inputs to state
    yield* Ref.update(ctx, (state) => ({
      ...state,
      referenceInputs: [...state.referenceInputs, ...params.referenceInputs]
    }))

    yield* Effect.logDebug(
      `[ReadFrom] State now has ${state.referenceInputs.length + params.referenceInputs.length} reference input(s)`
    )
  })
