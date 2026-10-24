import { Effect, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Numeric from "./Numeric.js"

/**
 * Schema for NonnegativeInterval representing a fractional value >= 0.
 *
 * CDDL: nonnegative_interval = #6.30([uint, positive_int])
 *
 * @since 2.0.0
 * @category model
 */
export class NonnegativeInterval extends Schema.Class<NonnegativeInterval>("NonnegativeInterval")({
  numerator: Numeric.Uint64Schema,
  denominator: Numeric.Uint64Schema // positive_int (we enforce > 0 below)
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    return {
      _tag: "NonnegativeInterval",
      numerator: this.numerator,
      denominator: this.denominator
    }
  }

  /**
   * Convert to string representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * Custom inspect for Node.js REPL.
   *
   * @since 2.0.0
   * @category conversions
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * Structural equality check.
   *
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof NonnegativeInterval && this.numerator === that.numerator && this.denominator === that.denominator
    )
  }

  /**
   * Hash code generation.
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.numerator))(Hash.hash(this.denominator)))
  }

  /**
   * Static filter for validation.
   *
   * @since 2.0.0
   * @category validation
   */
  static get schema() {
    return Schema.filter((interval: NonnegativeInterval) => {
      if (interval.denominator <= 0n) {
        return {
          path: ["denominator"],
          message: `denominator (${interval.denominator}) must be > 0`
        }
      }
      return true
    })(NonnegativeInterval)
  }
}

export const CDDLSchema = CBOR.tag(30, Schema.Tuple(CBOR.Integer, CBOR.Integer))

/**
 * Transform between tag(30) tuple and NonnegativeInterval model.
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(NonnegativeInterval), {
  strict: true,
  encode: (_, __, ___, interval) =>
    Effect.succeed({
      _tag: "Tag" as const,
      tag: 30 as const,
      value: [interval.numerator, interval.denominator] as const
    }),
  decode: (_, __, ___, taggedValue) =>
    Effect.gen(function* () {
      if (taggedValue.tag !== 30) {
        return yield* Effect.fail(
          new ParseResult.Type(NonnegativeInterval.ast, taggedValue, `Expected tag 30, got ${taggedValue.tag}`)
        )
      }
      const [numerator, denominator] = yield* ParseResult.decodeUnknown(Schema.Tuple(CBOR.Integer, CBOR.Integer))(
        taggedValue.value
      )
      return new NonnegativeInterval({ numerator, denominator })
    })
}).annotations({ identifier: "NonnegativeInterval.CDDL" })

export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(CBOR.FromBytes(options), FromCDDL)

export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(Schema.Uint8ArrayFromHex, FromCBORBytes(options))

export const arbitrary: FastCheck.Arbitrary<NonnegativeInterval> = FastCheck.bigInt({ min: 1n, max: 1000000n })
  .chain((denominator) =>
    FastCheck.bigInt({ min: 0n, max: denominator }).map((numerator) => ({ numerator, denominator }))
  )
  .map((v) => new NonnegativeInterval(v))
