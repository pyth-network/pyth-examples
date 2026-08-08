import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as CBOR from "./CBOR.js"

/**
 * Plutus V3 script wrapper (raw bytes).
 *
 * @since 2.0.0
 * @category model
 */
export class PlutusV3 extends Schema.TaggedClass<PlutusV3>("PlutusV3")("PlutusV3", {
  bytes: Schema.Uint8ArrayFromHex
}) {
  /**
   * Convert to JSON representation.
   *
   * @since 2.0.0
   * @category conversions
   */
  toJSON() {
    return {
      _tag: "PlutusV3",
      bytes: this.bytes
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
    if (!(that instanceof PlutusV3)) return false
    // Compare Uint8Array content byte by byte
    if (this.bytes.length !== that.bytes.length) return false
    for (let i = 0; i < this.bytes.length; i++) {
      if (this.bytes[i] !== that.bytes[i]) return false
    }
    return true
  }

  /**
   * Hash code generation.
   *
   * @since 2.0.0
   * @category hashing
   */
  [Hash.symbol](): number {
    // Hash Uint8Array content byte by byte
    let h = Hash.hash(this.bytes.length)
    for (const byte of this.bytes) {
      h = Hash.combine(h)(Hash.hash(byte))
    }
    return Hash.cached(this, h)
  }
}

/**
 * CDDL schema for PlutusV3 scripts as raw bytes.
 *
 * @since 2.0.0
 * @category schemas
 */
export const CDDLSchema = CBOR.ByteArray

/**
 * CDDL transformation schema for PlutusV3.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transform(CDDLSchema, Schema.typeSchema(PlutusV3), {
  strict: true,
  encode: (toI) => toI.bytes,
  decode: (fromA) => new PlutusV3({ bytes: fromA })
})

/**
 * FastCheck arbitrary for PlutusV3.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<PlutusV3> = FastCheck.uint8Array({ minLength: 1, maxLength: 512 }).map(
  (bytes) => new PlutusV3({ bytes })
)
