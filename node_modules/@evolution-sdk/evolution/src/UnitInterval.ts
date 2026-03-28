import { BigDecimal, Effect, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as Numeric from "./Numeric.js"

/**
 * Schema for UnitInterval representing a fractional value between 0 and 1.
 *
 * ```
 * CDDL: unit_interval = #6.30([uint, uint])
 * ```
 *
 * A unit interval is a number in the range between 0 and 1, which
 * means there are two extra constraints:
 *
 * ```
 * 1. numerator ≤ denominator
 * 2. denominator > 0
 * ```
 *
 * @since 2.0.0
 * @category model
 */
export class UnitInterval extends Schema.Class<UnitInterval>("UnitInterval")({
  numerator: Numeric.Uint64Schema,
  denominator: Numeric.Uint64Schema
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    return {
      _tag: "UnitInterval",
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
    return that instanceof UnitInterval && this.numerator === that.numerator && this.denominator === that.denominator
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
    return Schema.filter((interval: UnitInterval) => {
      if (interval.denominator <= 0n) {
        return {
          path: ["denominator"],
          message: `denominator (${interval.denominator}) must be > 0`
        }
      }
      if (interval.numerator > interval.denominator) {
        return {
          path: ["numerator"],
          message: `numerator (${interval.numerator}) must be <= denominator (${interval.denominator})`
        }
      }
      return true
    })(UnitInterval)
  }
}

export const CDDLSchema = CBOR.tag(30, Schema.Tuple(CBOR.Integer, CBOR.Integer))

/**
 * CDDL schema for UnitInterval following the Conway specification.
 *
 * ```
 * unit_interval = #6.30([uint, uint])
 * ```
 *
 * Transforms between CBOR tag 30 structure and UnitInterval model.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(UnitInterval), {
  strict: true,
  encode: (_, __, ___, unitInterval) =>
    Effect.succeed({
      _tag: "Tag" as const,
      tag: 30 as const,
      value: [unitInterval.numerator, unitInterval.denominator] as const
    }),
  decode: (_, __, ___, taggedValue) =>
    Effect.gen(function* () {
      // Validate tag number
      if (taggedValue.tag !== 30) {
        return yield* Effect.fail(
          new ParseResult.Type(
            UnitInterval.ast,
            taggedValue,
            `Expected tag 30 for UnitInterval, got ${taggedValue.tag}`
          )
        )
      }

      // Validate that the value is a tuple of two integers
      const tupleValue = yield* ParseResult.decodeUnknown(Schema.Tuple(CBOR.Integer, CBOR.Integer))(taggedValue.value)

      const [numerator, denominator] = tupleValue

      // Create and validate UnitInterval using the validated schema
      return new UnitInterval({ numerator, denominator })
    })
}).annotations({
  identifier: "UnitInterval.CDDL"
})

/**
 * CBOR bytes transformation schema for UnitInterval.
 * Transforms between Uint8Array and UnitInterval using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → UnitInterval
  ).annotations({
    identifier: "UnitInterval.CBORBytes"
  })

/**
 * CBOR hex transformation schema for UnitInterval.
 * Transforms between hex string and UnitInterval using CBOR encoding.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → UnitInterval
  ).annotations({
    identifier: "UnitInterval.CBORHex"
  })

/**
 * Convert UnitInterval to BigDecimal value.
 *
 * @since 2.0.0
 * @category transformation
 */
export const toBigDecimal = (interval: UnitInterval) =>
  BigDecimal.unsafeDivide(BigDecimal.fromBigInt(interval.numerator), BigDecimal.fromBigInt(interval.denominator))

/**
 * Create UnitInterval from BigDecimal value.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromBigDecimal = (value: BigDecimal.BigDecimal): UnitInterval => {
  const normalized = BigDecimal.normalize(value)
  const denominator = BigInt(10) ** BigInt(Math.max(0, normalized.scale))
  const numerator = normalized.value

  return new UnitInterval({ numerator, denominator })
}

/**
 * FastCheck arbitrary for generating random UnitInterval instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.bigInt({ min: 1n, max: 1000000n }).chain((denominator) =>
  FastCheck.bigInt({ min: 0n, max: denominator }).map((numerator) => new UnitInterval({ numerator, denominator }))
)
