import { mod } from "@noble/curves/abstract/modular.js"
import { ed25519 } from "@noble/curves/ed25519.js"
import { bytesToNumberLE } from "@noble/curves/utils.js"
import { Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"
import type * as PrivateKey from "./PrivateKey.js"

/**
 * Schema for VKey representing a verification key.
 * vkey = bytes .size 32
 * Follows the Conway-era CDDL specification.
 *
 * @since 2.0.0
 * @category schemas
 */
export class VKey extends Schema.TaggedClass<VKey>()("VKey", {
  bytes: Bytes32.BytesFromHex
}) {
  toJSON() {
    return { _tag: "VKey" as const, bytes: Bytes.toHex(this.bytes) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof VKey && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

export const FromBytes = Schema.transform(Schema.typeSchema(Bytes32.BytesFromHex), Schema.typeSchema(VKey), {
  strict: true,
  decode: (bytes) => new VKey({ bytes }),
  encode: (vkey) => vkey.bytes
}).annotations({
  identifier: "VKey.FromBytes"
})

export const FromHex = Schema.compose(
  Bytes32.BytesFromHex, // string -> Bytes32
  FromBytes // Bytes32 -> VKey
).annotations({
  identifier: "VKey.FromHex"
})

/**
 * Check if the given value is a valid VKey
 *
 * @since 2.0.0
 * @category predicates
 */
export const isVKey = Schema.is(VKey)

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a VKey from raw bytes.
 * Expects exactly 32 bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse a VKey from a hex string.
 * Expects exactly 64 hex characters (32 bytes).
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a VKey to raw bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Convert a VKey to a hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)

/**
 * FastCheck arbitrary for generating random VKey instances.
 * Used for property-based testing to generate valid test data.
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary: FastCheck.Arbitrary<VKey> = FastCheck.uint8Array({
  minLength: Bytes32.BYTES_LENGTH,
  maxLength: Bytes32.BYTES_LENGTH
}).map((bytes) => new VKey({ bytes }, { disableValidation: true }))

// ============================================================================
// Cryptographic Operations
// ============================================================================

/**
 * Create a VKey from a PrivateKey (sync version that throws VKeyError).
 * For extended keys (64 bytes), uses CML-compatible Ed25519-BIP32 algorithm.
 * For normal keys (32 bytes), uses standard Ed25519.
 *
 * @since 2.0.0
 * @category cryptography
 */
export const fromPrivateKey = (privateKey: PrivateKey.PrivateKey): VKey => {
  const privateKeyBytes = privateKey.key

  let publicKeyBytes: Uint8Array
  if (privateKeyBytes.length === 64) {
    // CML-compatible extended private key: use first 32 bytes as scalar
    const scalar = privateKeyBytes.slice(0, 32)
    // Apply modular reduction to ensure scalar is in valid range [0, curve.n)
    const scalarBigInt = mod(bytesToNumberLE(scalar), ed25519.Point.Fn.ORDER)
    const publicKeyPoint = ed25519.Point.BASE.multiplyUnsafe(scalarBigInt)
    publicKeyBytes = publicKeyPoint.toBytes()
  } else {
    // Standard 32-byte Ed25519 private key: derive public key
    publicKeyBytes = ed25519.getPublicKey(privateKeyBytes)
  }

  return new VKey({ bytes: publicKeyBytes })
}

/**
 * Create a VKey from a PrivateKey using Effect error handling.
 * For extended keys (64 bytes), uses CML-compatible Ed25519-BIP32 algorithm.
 * For normal keys (32 bytes), uses standard Ed25519.
 *
 * @since 2.0.0
 * @category cryptography
 */

/**
 * Verify a signature against a message using this verification key.
 *
 * @since 2.0.0
 * @category cryptography
 */
export const verify = (vkey: VKey, message: Uint8Array, signature: Uint8Array): boolean => {
  // Convert VKey to bytes
  const publicKeyBytes = vkey.bytes
  return ed25519.verify(signature, message, publicKeyBytes)
}
