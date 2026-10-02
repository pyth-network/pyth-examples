import { Equal, Hash, HashSet, Inspectable, Schema } from "effect"

import * as Address from "./Address.js"
import * as Assets from "./Assets/index.js"
import * as DatumOption from "./DatumOption.js"
import * as Numeric from "./Numeric.js"
import * as Script from "./Script.js"
import * as TransactionHash from "./TransactionHash.js"

/**
 * UTxO (Unspent Transaction Output) - A transaction output with its on-chain reference.
 *
 * Combines TransactionOutput with the transaction reference (transactionId + index)
 * that uniquely identifies it on the blockchain.
 *
 * @since 2.0.0
 * @category model
 */
export class UTxO extends Schema.TaggedClass<UTxO>()("UTxO", {
  transactionId: TransactionHash.TransactionHash,
  index: Numeric.Uint16Schema,
  address: Address.Address,
  assets: Assets.Assets.pipe(
    Schema.filter(Assets.allPositive, {
      message: () => "UTxO assets must have non-negative lovelace and positive token quantities"
    })
  ),
  datumOption: Schema.optional(DatumOption.DatumOptionSchema),
  scriptRef: Schema.optional(Script.Script)
}) {
  toJSON() {
    // Serialize Script to hex representation
    const scriptRefJson = this.scriptRef
      ? { _tag: this.scriptRef._tag, cbor: Script.toCBORHex(this.scriptRef) }
      : undefined

    return {
      _tag: this._tag,
      transactionId: this.transactionId.toJSON(),
      index: this.index.toString(),
      address: this.address.toJSON(),
      assets: this.assets.toJSON(),
      datumOption: this.datumOption?.toJSON(),
      scriptRef: scriptRefJson
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof UTxO &&
      Equal.equals(this.transactionId, that.transactionId) &&
      this.index === that.index &&
      Equal.equals(this.address, that.address) &&
      Equal.equals(this.assets, that.assets) &&
      Equal.equals(this.datumOption, that.datumOption) &&
      Equal.equals(this.scriptRef, that.scriptRef)
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.transactionId))(Hash.number(Number(this.index))))
  }
}

/**
 * Check if the given value is a valid UTxO.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isUTxO = Schema.is(UTxO)

// =============================================================================
// UTxO Set (Collection)
// =============================================================================

/**
 * A set of UTxOs with efficient lookups and set operations.
 * Uses Effect's HashSet for automatic deduplication via Hash protocol.
 *
 * @since 2.0.0
 * @category models
 */
export type UTxOSet = HashSet.HashSet<UTxO>

/**
 * Create an empty UTxO set.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty = (): UTxOSet => HashSet.empty()

/**
 * Create a UTxO set from an iterable of UTxOs.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable = (utxos: Iterable<UTxO>): UTxOSet => HashSet.fromIterable(utxos)

/**
 * Add a UTxO to the set.
 *
 * @since 2.0.0
 * @category combinators
 */
export const add = (set: UTxOSet, utxo: UTxO): UTxOSet => HashSet.add(set, utxo)

/**
 * Remove a UTxO from the set.
 *
 * @since 2.0.0
 * @category combinators
 */
export const remove = (set: UTxOSet, utxo: UTxO): UTxOSet => HashSet.remove(set, utxo)

/**
 * Check if a UTxO exists in the set.
 *
 * @since 2.0.0
 * @category predicates
 */
export const has = (set: UTxOSet, utxo: UTxO): boolean => HashSet.has(set, utxo)

/**
 * Union of two UTxO sets.
 *
 * @since 2.0.0
 * @category combinators
 */
export const union = (a: UTxOSet, b: UTxOSet): UTxOSet => HashSet.union(a, b)

/**
 * Intersection of two UTxO sets.
 *
 * @since 2.0.0
 * @category combinators
 */
export const intersection = (a: UTxOSet, b: UTxOSet): UTxOSet => HashSet.intersection(a, b)

/**
 * Difference of two UTxO sets (elements in a but not in b).
 *
 * @since 2.0.0
 * @category combinators
 */
export const difference = (a: UTxOSet, b: UTxOSet): UTxOSet => HashSet.difference(a, b)

/**
 * Filter UTxOs in the set by predicate.
 *
 * @since 2.0.0
 * @category combinators
 */
export const filter = (set: UTxOSet, predicate: (utxo: UTxO) => boolean): UTxOSet => HashSet.filter(set, predicate)

/**
 * Get the number of UTxOs in the set.
 *
 * @since 2.0.0
 * @category getters
 */
export const size = (set: UTxOSet): number => HashSet.size(set)

/**
 * Check if the set is empty.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isEmpty = (set: UTxOSet): boolean => HashSet.size(set) === 0

/**
 * Convert a UTxO set to an array.
 *
 * @since 2.0.0
 * @category conversions
 */
export const toArray = (set: UTxOSet): Array<UTxO> => Array.from(set)

/**
 * Get the output reference string for a UTxO (txHash#index format).
 *
 * @since 2.0.0
 * @category getters
 */
export const toOutRefString = (utxo: UTxO): string => `${TransactionHash.toHex(utxo.transactionId)}#${utxo.index}`
