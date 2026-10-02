/**
 * Deferred redeemer construction for dynamic index resolution.
 *
 * Cardano redeemers must reference inputs/policies by their sorted index in the
 * final transaction. But coin selection may add new inputs, changing all indices.
 * This creates a chicken-and-egg problem: you need indices to build redeemers,
 * but indices aren't known until the transaction is finalized.
 *
 * The solution is three modes:
 * - Static: When you know the redeemer value upfront (no index needed)
 * - Self: When redeemer depends on THIS input's final index
 * - Batch: When redeemer depends on MULTIPLE inputs' final indices
 *
 * @module RedeemerBuilder
 * @since 2.0.0
 */

import type * as Data from "../../Data.js"
import type * as UTxO from "../../UTxO.js"

/**
 * An input with its resolved transaction index.
 *
 * Provided to redeemer functions after coin selection completes.
 * Contains both the final sorted index and the original UTxO for reference.
 *
 * @since 2.0.0
 * @category types
 */
export interface IndexedInput {
  /** The final 0-based index of this input in the sorted transaction inputs. */
  readonly index: number
  /** The original UTxO being spent. */
  readonly utxo: UTxO.UTxO
}

/**
 * Self-mode function: constructs a redeemer for a single script input.
 *
 * Called once per script-locked UTxO with its resolved index.
 * The same function is invoked for each script UTxO in the collection.
 *
 * @since 2.0.0
 * @category types
 */
export type SelfRedeemerFn = (input: IndexedInput) => Data.Data

/**
 * Batch-mode function: constructs a single redeemer from multiple inputs.
 *
 * Called once with all indexed inputs, returns one redeemer shared by all.
 * Use when multiple inputs need coordinated redeemer values.
 *
 * @since 2.0.0
 * @category types
 */
export type BatchRedeemerFn = (inputs: ReadonlyArray<IndexedInput>) => Data.Data

/**
 * Batch redeemer builder for multi-input coordination.
 *
 * When multiple UTxOs need to share information about each other's indices,
 * use batch mode. The `all` function receives all specified inputs with their
 * resolved indices.
 *
 * @since 2.0.0
 * @category types
 */
export interface BatchRedeemerBuilder {
  /** Function invoked with all inputs' resolved indices. */
  readonly all: BatchRedeemerFn
  /** Which UTxOs to include in the batch. */
  readonly inputs: ReadonlyArray<UTxO.UTxO>
}

/**
 * Redeemer argument for collectFrom and mint operations.
 *
 * Supports three modes:
 * - Static (`Data`): Direct redeemer value, no deferred computation
 * - Self (`SelfRedeemerFn`): Per-input function, receives `{ index, utxo }`
 * - Batch (`BatchRedeemerBuilder`): Multi-input function, receives array
 *
 * The appropriate mode is auto-detected at runtime:
 * - Function → Self mode
 * - Object with `all` property → Batch mode
 * - Otherwise → Static mode
 *
 * @since 2.0.0
 * @category types
 */
export type RedeemerArg = Data.Data | SelfRedeemerFn | BatchRedeemerBuilder

/** @since 2.0.0 @category guards */
export const isSelfFn = (arg: RedeemerArg): arg is SelfRedeemerFn => typeof arg === "function"

/** @since 2.0.0 @category guards */
export const isBatchBuilder = (arg: RedeemerArg): arg is BatchRedeemerBuilder =>
  typeof arg === "object" && arg !== null && "all" in arg && typeof (arg as BatchRedeemerBuilder).all === "function"

/** @since 2.0.0 @category guards */
export const isStaticData = (arg: RedeemerArg): arg is Data.Data => !isSelfFn(arg) && !isBatchBuilder(arg)

/** @internal */
export interface StaticRedeemer {
  readonly _tag: "static"
  readonly data: Data.Data
}

/** @internal */
export interface SelfRedeemer {
  readonly _tag: "self"
  readonly fn: SelfRedeemerFn
}

/** @internal */
export interface BatchRedeemer {
  readonly _tag: "batch"
  readonly fn: BatchRedeemerFn
  readonly inputs: ReadonlyArray<UTxO.UTxO>
}

/** @internal */
export type DeferredRedeemer = StaticRedeemer | SelfRedeemer | BatchRedeemer

/** @internal */
export const toDeferredRedeemer = (arg: RedeemerArg): DeferredRedeemer => {
  if (isSelfFn(arg)) {
    return { _tag: "self", fn: arg }
  }

  if (isBatchBuilder(arg)) {
    return { _tag: "batch", fn: arg.all, inputs: arg.inputs }
  }

  return { _tag: "static", data: arg }
}
