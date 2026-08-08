/**
 * AddSigner operation - adds required signers to the transaction.
 *
 * Required signers are key hashes that must sign the transaction even if they
 * don't control any inputs. This is commonly used for scripts that check for
 * specific signers in their validation logic.
 *
 * @module operations/AddSigner
 * @since 2.0.0
 */

import { Effect, Equal, Ref } from "effect"

import { TxContext } from "../TransactionBuilder.js"
import type { AddSignerParams } from "./Operations.js"

/**
 * Creates a ProgramStep for addSigner operation.
 * Adds a required signer (key hash) to the transaction.
 *
 * Implementation:
 * 1. Adds the key hash to the requiredSigners array in state
 * 2. Deduplicates to avoid duplicate signers
 *
 * @since 2.0.0
 * @category programs
 */
export const createAddSignerProgram = (params: AddSignerParams) =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    yield* Ref.update(ctx, (state) => {
      // Check if this key hash is already in requiredSigners (deduplicate)
      const alreadyExists = state.requiredSigners.some((existing) => Equal.equals(existing, params.keyHash))

      if (alreadyExists) {
        return state
      }

      return {
        ...state,
        requiredSigners: [...state.requiredSigners, params.keyHash]
      }
    })

    yield* Effect.logDebug(`[AddSigner] Added required signer`)
  })
