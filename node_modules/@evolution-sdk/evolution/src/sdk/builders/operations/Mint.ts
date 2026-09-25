/**
 * Mint operation - creates minting transactions for native tokens.
 *
 * @module operations/Mint
 * @since 2.0.0
 */

import { Effect, Ref } from "effect"

import * as AssetName from "../../../AssetName.js"
import * as Assets from "../../../Assets/index.js"
import * as Mint from "../../../Mint.js"
import * as NonZeroInt64 from "../../../NonZeroInt64.js"
import * as PolicyId from "../../../PolicyId.js"
import * as RedeemerBuilder from "../RedeemerBuilder.js"
import { TransactionBuilderError, TxContext } from "../TransactionBuilder.js"
import type { MintTokensParams } from "./Operations.js"

/**
 * Creates a ProgramStep for mintAssets operation.
 * Adds minting information to the transaction and tracks redeemers by PolicyId.
 *
 * Implementation:
 * 1. Validates that only native tokens are being minted (no lovelace)
 * 2. Converts SDK Assets to Core.Mint structure
 * 3. Merges with existing mint state
 * 4. Tracks redeemer information for script-based minting policies (by PolicyId)
 *
 * **RedeemerBuilder Support:**
 * - Static: Direct Data value stored immediately
 * - Self: Callback stored for per-policy resolution after coin selection
 * - Batch: Callback + input set stored for multi-policy resolution
 *
 * @since 2.0.0
 * @category programs
 */
export const createMintAssetsProgram = (
  params: MintTokensParams
): Effect.Effect<void, TransactionBuilderError, TxContext> =>
  Effect.gen(function* () {
    const ctx = yield* TxContext

    // 1. Validate no lovelace in mint assets
    if (params.assets.lovelace !== 0n) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "Cannot mint lovelace. Only native tokens can be minted.",
          cause: params.assets
        })
      )
    }

    // 2. Validate multiAsset exists
    if (!params.assets.multiAsset || params.assets.multiAsset.map.size === 0) {
      return yield* Effect.fail(
        new TransactionBuilderError({
          message: "No valid assets provided for minting",
          cause: params.assets
        })
      )
    }

    // 3. Convert Assets.multiAsset to Core.Mint
    let newMint = new Mint.Mint({ map: new Map() })
    const policyIds = new Set<string>()

    for (const [policyId, assetMap] of params.assets.multiAsset.map.entries()) {
      // Track policy IDs for redeemer association
      policyIds.add(PolicyId.toHex(policyId))

      for (const [assetName, amount] of assetMap.entries()) {
        if (amount === 0n) continue

        // Validate amount is within NonZeroInt64 range
        if (amount < NonZeroInt64.NEG_INT64_MIN || amount > NonZeroInt64.POS_INT64_MAX) {
          return yield* Effect.fail(
            new TransactionBuilderError({
              message: `Amount out of range for NonZeroInt64: ${amount}`,
              cause: amount
            })
          )
        }

        // Insert into mint (amount is already a valid bigint)
        newMint = Mint.insert(newMint, policyId, assetName, amount as NonZeroInt64.NonZeroInt64)
      }
    }

    // 4. Update state: merge with existing mint and track redeemer if provided
    yield* Ref.update(ctx, (state) => {
      // Merge mints
      let mergedMint = state.mint || new Mint.Mint({ map: new Map() })

      for (const [policyId, assetMap] of newMint.map.entries()) {
        for (const [assetName, amount] of assetMap.entries()) {
          mergedMint = Mint.insert(mergedMint, policyId, assetName, amount)
        }
      }

      // Track redeemer by PolicyId if provided
      let newRedeemers = state.redeemers
      let newDeferredRedeemers = state.deferredRedeemers

      if (params.redeemer && policyIds.size > 0) {
        const deferred = RedeemerBuilder.toDeferredRedeemer(params.redeemer)

        if (deferred._tag === "static") {
          // Static mode: store resolved data immediately
          newRedeemers = new Map(state.redeemers)
          for (const policyIdHex of policyIds) {
            newRedeemers.set(policyIdHex, {
              tag: "mint",
              data: deferred.data,
              exUnits: undefined,
              label: params.label
            })
          }
        } else {
          // Self or Batch mode: store deferred for resolution after coin selection
          newDeferredRedeemers = new Map(state.deferredRedeemers)
          for (const policyIdHex of policyIds) {
            newDeferredRedeemers.set(policyIdHex, {
              tag: "mint",
              deferred,
              exUnits: undefined,
              label: params.label
            })
          }
        }
      }

      return {
        ...state,
        mint: mergedMint,
        redeemers: newRedeemers,
        deferredRedeemers: newDeferredRedeemers
      }
    })
  })

/**
 * Convert Mint to Assets preserving sign.
 *
 * Used in ChangeCreation and Balance phases where we need to account for
 * the actual minted/burned amounts in calculations:
 * - Positive values = tokens minted (assets created)
 * - Negative values = tokens burned (assets destroyed)
 *
 * @param mint - The mint field from transaction state
 * @returns Assets record with mint amounts preserved
 * @internal
 */
export const mintToAssets = (mint: Mint.Mint | undefined): Assets.Assets => {
  if (!mint || mint.map.size === 0) {
    return Assets.fromLovelace(0n)
  }

  const record: Record<string, bigint> = {}

  for (const [policyId, assetMap] of mint.map.entries()) {
    const policyIdHex = PolicyId.toHex(policyId)
    for (const [assetName, amount] of assetMap.entries()) {
      const assetNameHex = AssetName.toHex(assetName)
      const unit = policyIdHex + assetNameHex
      record[unit] = amount
    }
  }

  return Assets.fromRecord(record)
}

/**
 * Convert Mint to Assets with negated values.
 *
 * Used in Selection phase for coin selection calculation where minted
 * assets reduce the selection requirements:
 * - Positive mints → negative (surplus, don't need to select from inputs)
 * - Negative burns → positive (deficit, need to select from inputs)
 *
 * @param mint - The mint field from transaction state
 * @returns Assets record with negated mint amounts
 * @internal
 */
export const negatedMintAssets = (mint: Mint.Mint | undefined): Assets.Assets => {
  if (!mint || mint.map.size === 0) {
    return Assets.fromLovelace(0n)
  }

  const record: Record<string, bigint> = {}

  for (const [policyId, assetMap] of mint.map.entries()) {
    const policyIdHex = PolicyId.toHex(policyId)
    for (const [assetName, amount] of assetMap.entries()) {
      const assetNameHex = AssetName.toHex(assetName)
      const unit = policyIdHex + assetNameHex
      record[unit] = -amount
    }
  }

  return Assets.fromRecord(record)
}
