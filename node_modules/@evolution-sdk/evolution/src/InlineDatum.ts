import { Equal, Hash, Inspectable, Schema } from "effect"

import * as PlutusData from "./Data.js"

/**
 * Schema for InlineDatum representing inline plutus data embedded directly in the transaction output.
 *
 * @since 2.0.0
 * @category schemas
 */
export class InlineDatum extends Schema.TaggedClass<InlineDatum>()("InlineDatum", {
  data: PlutusData.DataSchema
}) {
  /**
   * @since 2.0.0
   * @category json
   */
  toJSON() {
    return { _tag: "InlineDatum" as const, data: this.data }
  }

  /**
   * @since 2.0.0
   * @category string
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * @since 2.0.0
   * @category inspect
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    return that instanceof InlineDatum && PlutusData.equals(this.data, that.data)
  }

  /**
   * @since 2.0.0
   * @category hash
   */
  [Hash.symbol](): number {
    return Hash.cached(this, PlutusData.hash(this.data))
  }
}

/**
 * FastCheck arbitrary for generating random InlineDatum instances.
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = PlutusData.arbitrary.map((data) => new InlineDatum({ data }))

/**
 * Type guard to check if a value is an InlineDatum.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isInlineDatum = Schema.is(InlineDatum)
