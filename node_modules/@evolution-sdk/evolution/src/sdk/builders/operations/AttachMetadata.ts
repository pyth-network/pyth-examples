/**
 * AttachMetadata operation - attaches transaction metadata to auxiliary data.
 *
 * Transaction metadata is stored in the auxiliary data of a transaction and allows
 * attaching arbitrary structured data following CIP-10 standard label registry.
 * Common use cases include NFT metadata (CIP-25), transaction messages (CIP-20),
 * and royalty information (CIP-27).
 *
 * @module operations/AttachMetadata
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as AuxiliaryData from "../../../AuxiliaryData.js"
import type * as TransactionMetadatum from "../../../TransactionMetadatum.js"
import { TransactionBuilderError, TxContext } from "../TransactionBuilder.js"
import type { AttachMetadataParams } from "./Operations.js"

/**
 * Creates a ProgramStep for attachMetadata operation.
 * Attaches metadata to the transaction's auxiliary data.
 *
 * Implementation:
 * 1. Validates that the label hasn't been used already
 * 2. Creates or updates the ConwayAuxiliaryData with new metadata
 * 3. Preserves existing plutus and native scripts in auxiliary data
 *
 * @since 2.0.0
 * @category programs
 */
export const createAttachMetadataProgram = (
  params: AttachMetadataParams
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // Read current state and check for duplicate label
    const state = yield* Ref.get(ctx)
    const currentAuxData = state.auxiliaryData
    const existingMetadata =
      currentAuxData && currentAuxData instanceof AuxiliaryData.ConwayAuxiliaryData
        ? currentAuxData.metadata
        : undefined

    if (existingMetadata && existingMetadata.has(params.label)) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: `Metadata label ${params.label} already exists. Each metadata label can only be used once per transaction.`
        })
      )
    }

    // Create new metadata map with the new entry
    const newMetadata: Map<bigint, TransactionMetadatum.TransactionMetadatum> = new Map(existingMetadata)
    newMetadata.set(params.label, params.metadata)

    // Create or update ConwayAuxiliaryData, preserving existing scripts if from Conway era
    const isConway = currentAuxData instanceof AuxiliaryData.ConwayAuxiliaryData
    const updatedAuxData = new AuxiliaryData.ConwayAuxiliaryData({
      metadata: newMetadata,
      nativeScripts: isConway ? currentAuxData.nativeScripts : undefined,
      plutusV1Scripts: isConway ? currentAuxData.plutusV1Scripts : undefined,
      plutusV2Scripts: isConway ? currentAuxData.plutusV2Scripts : undefined,
      plutusV3Scripts: isConway ? currentAuxData.plutusV3Scripts : undefined
    })

    yield* Ref.set(ctx, { ...state, auxiliaryData: updatedAuxData })

    yield* Effect.logDebug(`[AttachMetadata] Attached metadata with label ${params.label}`)
  })
