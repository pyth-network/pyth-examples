import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Natural from "./Natural.js"

/**
 * Schema for pointer to a stake registration certificate
 * Contains slot, transaction index, and certificate index information
 *
 * @since 2.0.0
 * @category schemas
 */
export class Pointer extends Schema.TaggedClass<Pointer>("Pointer")("Pointer", {
  slot: Natural.Natural,
  txIndex: Natural.Natural,
  certIndex: Natural.Natural
}) {
  toJSON() {
    return {
      _tag: "Pointer" as const,
      slot: this.slot,
      txIndex: this.txIndex,
      certIndex: this.certIndex
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof Pointer &&
      Equal.equals(this.slot, that.slot) &&
      Equal.equals(this.txIndex, that.txIndex) &&
      Equal.equals(this.certIndex, that.certIndex)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(Hash.hash(this.slot))(Hash.combine(Hash.hash(this.txIndex))(Hash.hash(this.certIndex)))
  }
}

/**
 * Check if the given value is a valid Pointer
 *
 *
 * @since 2.0.0
 * @category predicates
 */
export const isPointer = Schema.is(Pointer)

/**
 * FastCheck arbitrary for generating random Pointer instances
 *
 * @since 2.0.0
 * @category generators
 */
export const arbitrary = FastCheck.tuple(Natural.arbitrary, Natural.arbitrary, Natural.arbitrary).map(
  ([slot, txIndex, certIndex]) => new Pointer({ slot, txIndex, certIndex }, { disableValidation: true })
)
