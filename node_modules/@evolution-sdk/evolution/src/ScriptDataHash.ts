import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"

/**
 * ScriptDataHash based on Conway CDDL specification
 *
 * CDDL: script_data_hash = Bytes32
 *
 * This is a hash of data which may affect evaluation of a script.
 * This data consists of:
 *   - The redeemers from the transaction_witness_set (the value of field 5).
 *   - The datums from the transaction_witness_set (the value of field 4).
 *   - The value in the cost_models map corresponding to the script's language
 *     (in field 18 of protocol_param_update.)
 *
 * @since 2.0.0
 * @category model
 */
export class ScriptDataHash extends Schema.TaggedClass<ScriptDataHash>()("ScriptDataHash", {
  hash: Bytes32.BytesFromHex
}) {
  toJSON() {
    return { _tag: "ScriptDataHash" as const, hash: Bytes.toHex(this.hash) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof ScriptDataHash && Bytes.equals(this.hash, that.hash)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.array(Array.from(this.hash)))
  }
}

/**
 * Schema for transforming between Uint8Array and ScriptDataHash.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(Schema.typeSchema(Bytes32.BytesFromHex), Schema.typeSchema(ScriptDataHash), {
  strict: true,
  decode: (bytes) => new ScriptDataHash({ hash: bytes }, { disableValidation: true }),
  encode: (s) => s.hash
}).annotations({
  identifier: "ScriptDataHash.FromBytes"
})

/**
 * Schema for transforming between hex string and ScriptDataHash.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(
  Bytes32.BytesFromHex, // string -> Bytes32
  FromBytes // Bytes32 -> ScriptDataHash
).annotations({
  identifier: "ScriptDataHash.FromHex"
})

/**
 * Check if the given value is a valid ScriptDataHash
 *
 * @since 2.0.0
 * @category predicates
 */
export const isScriptDataHash = Schema.is(ScriptDataHash)

/**
 * FastCheck arbitrary for generating random ScriptDataHash instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({ minLength: 32, maxLength: 32 }).map(
  (bytes) => new ScriptDataHash({ hash: bytes }, { disableValidation: true })
)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse ScriptDataHash from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse ScriptDataHash from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode ScriptDataHash to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode ScriptDataHash to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
