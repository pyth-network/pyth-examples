import { blake2b } from "@noble/hashes/blake2"
import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Hash28 from "./Hash28.js"
import * as NativeScripts from "./NativeScripts.js"
import type * as Script from "./Script.js"

/**
 * Schema for ScriptHash representing a script hash credential.
 * ```
 * script_hash = hash28
 * ```
 * Follows CIP-0019 binary representation.
 *
 * Stores raw 28-byte value for performance.
 *
 * @since 2.0.0
 * @category schemas
 */
export class ScriptHash extends Schema.TaggedClass<ScriptHash>()("ScriptHash", {
  hash: Hash28.BytesFromHex
}) {
  toJSON() {
    return {
      _tag: "ScriptHash" as const,
      hash: Bytes.toHex(this.hash)
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof ScriptHash && Bytes.equals(this.hash, that.hash)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.hash))
  }
}

/**
 * Schema for transforming between Uint8Array and ScriptHash.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(Schema.typeSchema(Hash28.BytesFromHex), Schema.typeSchema(ScriptHash), {
  strict: true,
  decode: (bytes) => new ScriptHash({ hash: bytes }, { disableValidation: true }), // Disable validation since we already check length in Hash28
  encode: (scriptHash) => scriptHash.hash
}).annotations({
  identifier: "ScriptHash.FromBytes"
})

/**
 * Schema for transforming between hex string and ScriptHash.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(Hash28.BytesFromHex, FromBytes).annotations({
  identifier: "ScriptHash.FromHex"
})

/**
 * Parse a ScriptHash from raw bytes.
 * Expects exactly 28 bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse a ScriptHash from a hex string.
 * Expects exactly 56 hex characters (28 bytes).
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Convert a ScriptHash to raw bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Convert a ScriptHash to a hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)

/**
 * FastCheck arbitrary for generating random ScriptHash instances.
 * Used for property-based testing to generate valid test data.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary: FastCheck.Arbitrary<ScriptHash> = FastCheck.uint8Array({ minLength: 28, maxLength: 28 }).map(
  (bytes) => new ScriptHash({ hash: bytes }, { disableValidation: true })
)

/**
 * Compute a script hash (policy id) from any Script variant.
 *
 * Conway-era rule: prepend a 1-byte language tag to the script bytes, then hash with blake2b-224.
 * - 0x00: native/multisig (hash over CBOR of native_script)
 * - 0x01: Plutus V1 (hash over raw script bytes)
 * - 0x02: Plutus V2 (hash over raw script bytes)
 * - 0x03: Plutus V3 (hash over raw script bytes)
 *
 * @since 2.0.0
 * @category computation
 */
export const fromScript = (script: Script.Script): ScriptHash => {
  let tag: number
  let body: Uint8Array

  switch (script._tag) {
    // Plutus script cases
    case "PlutusV1":
      tag = 0x01
      body = script.bytes
      break

    case "PlutusV2":
      tag = 0x02
      body = script.bytes
      break

    case "PlutusV3":
      tag = 0x03
      body = script.bytes
      break

    // Native script case (TaggedClass)
    case "NativeScript":
      tag = 0x00
      body = NativeScripts.toCBORBytes(script)
      break

    default:
      throw new Error(`Unknown script type: ${(script as any)._tag}`)
  }

  const prefixed = new Uint8Array(1 + body.length)
  prefixed[0] = tag
  prefixed.set(body, 1)
  const hashBytes = blake2b(prefixed, { dkLen: 28 })
  return new ScriptHash({ hash: hashBytes }, { disableValidation: true })
}
