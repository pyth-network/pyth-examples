import { mod } from "@noble/curves/abstract/modular.js"
import { ed25519 } from "@noble/curves/ed25519.js"
import { bytesToNumberLE } from "@noble/curves/utils.js"
import { hmac } from "@noble/hashes/hmac.js"
import { pbkdf2 } from "@noble/hashes/pbkdf2"
import { sha512 } from "@noble/hashes/sha2"
import { Data, Effect, Equal, FastCheck, Hash, Inspectable, Schema } from "effect"

import * as Bip32PublicKey from "./Bip32PublicKey.js"
import * as Bytes from "./Bytes.js"
import * as Bytes96 from "./Bytes96.js"
import * as PrivateKey from "./PrivateKey.js"

/**
 * Error class for Bip32PrivateKey related operations.
 *
 * @since 2.0.0
 * @category errors
 */
export class Bip32PrivateKeyError extends Data.TaggedError("Bip32PrivateKeyError")<{
  message?: string
  cause?: unknown
}> {}

/**
 * Schema for Bip32PrivateKey representing a BIP32-Ed25519 extended private key.
 * Always 96 bytes: 32-byte scalar + 32-byte IV + 32-byte chain code.
 * Derivation implements the V2 scheme for CML compatibility.
 *
 * @since 2.0.0
 * @category schemas
 */
export class Bip32PrivateKey extends Schema.TaggedClass<Bip32PrivateKey>()("Bip32PrivateKey", {
  bytes: Bytes96.BytesFromHex
}) {
  toJSON() {
    return { _tag: "Bip32PrivateKey" as const, bytes: Bytes.toHex(this.bytes) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof Bip32PrivateKey && Bytes.equals(this.bytes, that.bytes)
  }

  [Hash.symbol](): number {
    return Hash.array(Array.from(this.bytes))
  }
}

/**
 * Schema for transforming between Uint8Array and Bip32PrivateKey.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(Schema.typeSchema(Bytes96.BytesFromHex), Schema.typeSchema(Bip32PrivateKey), {
  strict: true,
  decode: (bytes) => new Bip32PrivateKey({ bytes }, { disableValidation: true }),
  encode: (bip32PrivateKey) => bip32PrivateKey.bytes
}).annotations({
  identifier: "Bip32PrivateKey.FromBytes"
})

/**
 * Schema for transforming between hex string and Bip32PrivateKey.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.compose(
  Bytes96.BytesFromHex, // string -> Bytes96
  FromBytes // Bytes96 -> Bip32PrivateKey
).annotations({
  identifier: "Bip32PrivateKey.FromHex"
})

// ============================================================================
// Helpers & Constants
// ============================================================================

const SCALAR_INDEX = 0
const SCALAR_SIZE = 32
const IV_INDEX = 32
const IV_SIZE = 32
const CHAIN_CODE_INDEX = 64
const CHAIN_CODE_SIZE = 32

const PBKDF2_ITERATIONS = 4096
const PBKDF2_KEY_SIZE = 96

const clampScalar = (scalar: Uint8Array): Uint8Array => {
  const clamped = new Uint8Array(scalar)
  clamped[0] &= 0b1111_1000
  clamped[31] &= 0b0001_1111
  clamped[31] |= 0b0100_0000
  return clamped
}

const extractScalar = (extendedKey: Uint8Array): Uint8Array =>
  extendedKey.slice(SCALAR_INDEX, SCALAR_INDEX + SCALAR_SIZE)
const extractIV = (extendedKey: Uint8Array): Uint8Array => extendedKey.slice(IV_INDEX, IV_INDEX + IV_SIZE)
const extractChainCode = (extendedKey: Uint8Array): Uint8Array =>
  extendedKey.slice(CHAIN_CODE_INDEX, CHAIN_CODE_INDEX + CHAIN_CODE_SIZE)

// add_28_mul8_v2(kl, zl)
const add28Mul8V2 = (kl: Uint8Array, zl: Uint8Array): Uint8Array => {
  const out = new Uint8Array(32)
  let carry = 0
  // First 28 bytes: kl[i] + (zl[i] * 8) + carry, propagate full carry (no masking before carry)
  for (let i = 0; i < 28; i++) {
    const mul = zl[i] << 3 // up to 2040, safe in JS number
    const r = kl[i] + mul + carry
    out[i] = r & 0xff
    carry = r >>> 8
  }
  // Propagate carry through the remaining 4 bytes
  for (let i = 28; i < 32; i++) {
    const r = kl[i] + carry
    out[i] = r & 0xff
    carry = r >>> 8
  }
  // Note: v2 scheme does not re-clamp the child left half here.
  return out
}

// add_256bits(kr, zr)
const add256 = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const out = new Uint8Array(32)
  let carry = 0
  for (let i = 0; i < 32; i++) {
    const r = a[i] + b[i] + carry
    out[i] = r & 0xff
    carry = r >> 8
  }
  return out
}

// ============================================================================
// Root Functions (Sync API)
// ============================================================================

/**
 * Parse a Bip32PrivateKey from raw bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse a Bip32PrivateKey from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Convert a Bip32PrivateKey to raw bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Convert a Bip32PrivateKey to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)

/**
 * Create a Bip32PrivateKey from BIP39 entropy with PBKDF2 key stretching.
 *
 * @since 2.0.0
 * @category bip39
 */
export const fromBip39Entropy = (entropy: Uint8Array, password: string = ""): Bip32PrivateKey => {
  return Effect.runSync(Either.fromBip39Entropy(entropy, password))
}

/**
 * Derive a child private key using a single derivation index (V2 scheme).
 * Supports hardened (index >= 0x80000000) and soft derivation.
 *
 * @since 2.0.0
 * @category bip32
 */
export const deriveChild = (bip32PrivateKey: Bip32PrivateKey, index: number): Bip32PrivateKey => {
  return Effect.runSync(Either.deriveChild(bip32PrivateKey, index))
}

/**
 * Derive a child private key using multiple indices.
 *
 * @since 2.0.0
 * @category bip32
 */
export const derive = (bip32PrivateKey: Bip32PrivateKey, indices: Array<number>): Bip32PrivateKey => {
  return Effect.runSync(Either.derive(bip32PrivateKey, indices))
}

/**
 * Derive a child private key using a BIP32 path string.
 * Supports paths like "m/1852'/1815'/0'/0/0" or "1852'/1815'/0'/0/0".
 *
 * @since 2.0.0
 * @category bip32
 */
export const derivePath = (bip32PrivateKey: Bip32PrivateKey, path: string): Bip32PrivateKey => {
  return Effect.runSync(Either.derivePath(bip32PrivateKey, path))
}

/**
 * Convert to standard (non-extended) PrivateKey (first 64 bytes: scalar + IV).
 *
 * @since 2.0.0
 * @category conversion
 */
export const toPrivateKey = (bip32PrivateKey: Bip32PrivateKey): PrivateKey.PrivateKey => {
  return Effect.runSync(Either.toPrivateKey(bip32PrivateKey))
}

/**
 * Derive the corresponding Bip32PublicKey.
 *
 * @since 2.0.0
 * @category cryptography
 */
export const toPublicKey = (bip32PrivateKey: Bip32PrivateKey): Bip32PublicKey.Bip32PublicKey => {
  return Effect.runSync(Either.toPublicKey(bip32PrivateKey))
}

/**
 * Serialize to CML-compatible 128-byte format: [scalar(32) | iv(32) | publicKey(32) | chainCode(32)].
 *
 * @since 2.0.0
 * @category cml-compatibility
 */
export const to128XPRV = (bip32PrivateKey: Bip32PrivateKey): Uint8Array => {
  return Effect.runSync(Either.to_128_xprv(bip32PrivateKey))
}

/**
 * Create from CML-compatible 128-byte format.
 *
 * @since 2.0.0
 * @category cml-compatibility
 */
export const from128XPRV = (bytes: Uint8Array): Bip32PrivateKey => {
  return Effect.runSync(Either.from_128_xprv(bytes))
}

export const arbitrary = FastCheck.uint8Array({ minLength: 96, maxLength: 96 }).map(
  (bytes) => new Bip32PrivateKey({ bytes }, { disableValidation: true })
)

export namespace Either {
  export const fromBip39Entropy = (entropy: Uint8Array, password: string = "") =>
    Effect.gen(function* () {
      const keyMaterial = pbkdf2(sha512, password, entropy, { c: PBKDF2_ITERATIONS, dkLen: PBKDF2_KEY_SIZE })
      const clamped = new Uint8Array(keyMaterial)
      clamped.set(clampScalar(keyMaterial.slice(0, 32)), 0)
      return yield* Effect.try({
        try: () => Schema.decodeUnknownSync(FromBytes)(clamped),
        catch: (cause) => new Bip32PrivateKeyError({ message: "fromBip39Entropy failed", cause })
      })
    })

  export const deriveChild = (bip32PrivateKey: Bip32PrivateKey, index: number) =>
    Effect.gen(function* () {
      const keyBytes = bip32PrivateKey.bytes
      const scalar = extractScalar(keyBytes)
      const iv = extractIV(keyBytes)
      const chainCode = extractChainCode(keyBytes)

      const isHardened = index >= 0x80000000

      // Serialize index (little-endian, V2 scheme)
      const indexBytes = new Uint8Array(4)
      indexBytes[0] = index & 0xff
      indexBytes[1] = (index >>> 8) & 0xff
      indexBytes[2] = (index >>> 16) & 0xff
      indexBytes[3] = (index >>> 24) & 0xff

      // Z computation
      const zTag = new Uint8Array([isHardened ? 0x00 : 0x02])
      let zInput: Uint8Array
      if (isHardened) {
        // 0x00 || scalar || iv || index
        zInput = new Uint8Array(1 + 32 + 32 + 4)
        zInput.set(zTag, 0)
        zInput.set(scalar, 1)
        zInput.set(iv, 33)
        zInput.set(indexBytes, 65)
      } else {
        // 0x02 || publicKey || index
        const scalarBigInt = mod(bytesToNumberLE(scalar), ed25519.Point.Fn.ORDER)
        const publicKeyPoint = ed25519.Point.BASE.multiplyUnsafe(scalarBigInt)
        const publicKey = publicKeyPoint.toBytes()
        zInput = new Uint8Array(1 + 32 + 4)
        zInput.set(zTag, 0)
        zInput.set(publicKey, 1)
        zInput.set(indexBytes, 33)
      }
      const hmacZ = hmac(sha512, chainCode, zInput)
      const z = new Uint8Array(hmacZ)
      const zl = z.slice(0, 32)
      const zr = z.slice(32, 64)

      // New left/right parts
      const newLeft = add28Mul8V2(scalar, zl)
      const newRight = add256(iv, zr)

      // Chain code derivation
      const ccTag = new Uint8Array([isHardened ? 0x01 : 0x03])
      let ccInput: Uint8Array
      if (isHardened) {
        // 0x01 || scalar || iv || index
        ccInput = new Uint8Array(1 + 32 + 32 + 4)
        ccInput.set(ccTag, 0)
        ccInput.set(scalar, 1)
        ccInput.set(iv, 33)
        ccInput.set(indexBytes, 65)
      } else {
        // 0x03 || publicKey || index (use parent public key)
        const scalarBigInt = mod(bytesToNumberLE(scalar), ed25519.Point.Fn.ORDER)
        const publicKeyPoint = ed25519.Point.BASE.multiplyUnsafe(scalarBigInt)
        const publicKey = publicKeyPoint.toBytes()
        ccInput = new Uint8Array(1 + 32 + 4)
        ccInput.set(ccTag, 0)
        ccInput.set(publicKey, 1)
        ccInput.set(indexBytes, 33)
      }
      const hmacCC = hmac(sha512, chainCode, ccInput)
      const newChainCode = new Uint8Array(hmacCC).slice(32, 64)

      const out = new Uint8Array(96)
      out.set(newLeft, 0)
      out.set(newRight, 32)
      out.set(newChainCode, 64)

      return new Bip32PrivateKey({ bytes: out }, { disableValidation: true })
    })

  export const derive = (bip32PrivateKey: Bip32PrivateKey, indices: Array<number>) =>
    Effect.gen(function* () {
      let current = bip32PrivateKey
      for (const idx of indices) {
        current = yield* deriveChild(current, idx)
      }
      return current
    })

  const parsePath = (path: string) =>
    Effect.try({
      try: () => {
        const clean = path.startsWith("m/") ? path.slice(2) : path
        if (clean.length === 0) return [] as Array<number>
        return clean.split("/").map((seg) => {
          const hardened = seg.endsWith("'") || seg.endsWith("h") || seg.endsWith("H")
          const core = hardened ? seg.slice(0, -1) : seg
          const n = Number(core)
          if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid path segment: ${seg}`)
          return hardened ? (0x80000000 + n) >>> 0 : n >>> 0
        })
      },
      catch: (cause) => new Bip32PrivateKeyError({ message: "Invalid derivation path", cause })
    })

  export const derivePath = (bip32PrivateKey: Bip32PrivateKey, path: string) =>
    Effect.gen(function* () {
      const indices = yield* parsePath(path)
      return yield* derive(bip32PrivateKey, indices)
    })

  export const toPrivateKey = (bip32PrivateKey: Bip32PrivateKey) =>
    Effect.gen(function* () {
      const keyBytes = yield* Effect.try({
        try: () => Schema.encodeSync(FromBytes)(bip32PrivateKey),
        catch: (cause) => new Bip32PrivateKeyError({ message: "toBytes failed", cause })
      })
      const priv = keyBytes.slice(0, 64)
      return new PrivateKey.PrivateKey({ key: priv }, { disableValidation: true })
    })

  export const toPublicKey = (bip32PrivateKey: Bip32PrivateKey) =>
    Effect.gen(function* () {
      const keyBytes = yield* Effect.try({
        try: () => Schema.encodeSync(FromBytes)(bip32PrivateKey),
        catch: (cause) => new Bip32PrivateKeyError({ message: "toBytes failed", cause })
      })
      const scalar = extractScalar(keyBytes)
      const chainCode = extractChainCode(keyBytes)
      const publicKeyBytes = yield* Effect.try({
        try: () => {
          const scalarBigInt = mod(bytesToNumberLE(scalar), ed25519.Point.Fn.ORDER)
          const publicKeyPoint = ed25519.Point.BASE.multiplyUnsafe(scalarBigInt)
          return publicKeyPoint.toBytes()
        },
        catch: (cause) => new Bip32PrivateKeyError({ message: "toPublicKey failed", cause })
      })
      const combined = new Uint8Array(64)
      combined.set(publicKeyBytes, 0)
      combined.set(chainCode, 32)
      return new Bip32PublicKey.Bip32PublicKey({ bytes: combined }, { disableValidation: true })
    })

  export const to_128_xprv = (bip32PrivateKey: Bip32PrivateKey) =>
    Effect.gen(function* () {
      const keyBytes = yield* Effect.try({
        try: () => Schema.encodeSync(FromBytes)(bip32PrivateKey),
        catch: (cause) => new Bip32PrivateKeyError({ message: "toBytes failed", cause })
      })
      const scalar = extractScalar(keyBytes)
      const iv = extractIV(keyBytes)
      const chainCode = extractChainCode(keyBytes)
      const publicKeyBytes = yield* Effect.try({
        try: () => {
          const scalarBigInt = mod(bytesToNumberLE(scalar), ed25519.Point.Fn.ORDER)
          const publicKeyPoint = ed25519.Point.BASE.multiplyUnsafe(scalarBigInt)
          return publicKeyPoint.toBytes()
        },
        catch: (cause) => new Bip32PrivateKeyError({ message: "to_128_xprv failed", cause })
      })
      const out = new Uint8Array(128)
      out.set(scalar, 0)
      out.set(iv, 32)
      out.set(publicKeyBytes, 64)
      out.set(chainCode, 96)
      return out
    })

  export const from_128_xprv = (bytes: Uint8Array) =>
    Effect.gen(function* () {
      if (bytes.length !== 128) {
        return yield* Effect.fail(
          new Bip32PrivateKeyError({ message: `Expected exactly 128 bytes, got ${bytes.length}` })
        )
      }
      const scalar = bytes.slice(0, 32)
      const iv = bytes.slice(32, 64)
      const publicKeyExpected = bytes.slice(64, 96)
      const chaincode = bytes.slice(96, 128)

      const derivedPK = yield* Effect.try({
        try: () => {
          const scalarBigInt = mod(bytesToNumberLE(scalar), ed25519.Point.Fn.ORDER)
          const publicKeyPoint = ed25519.Point.BASE.multiplyUnsafe(scalarBigInt)
          return publicKeyPoint.toBytes()
        },
        catch: (cause) => new Bip32PrivateKeyError({ message: "from_128_xprv failed", cause })
      })
      const matches = derivedPK.every((b, i) => b === publicKeyExpected[i])
      if (!matches) {
        return yield* Effect.fail(
          new Bip32PrivateKeyError({ message: "Public key does not match private key in 128-byte blob" })
        )
      }
      const internal = new Uint8Array(96)
      internal.set(scalar, 0)
      internal.set(iv, 32)
      internal.set(chaincode, 64)
      return new Bip32PrivateKey({ bytes: internal }, { disableValidation: true })
    })
}

/**
 * Utility functions to build Cardano BIP44 derivation indices.
 * Standard path: m/1852'/1815'/account'/role/index
 */
export const CardanoPath = {
  harden: (n: number) => (0x8000_0000 + n) >>> 0,
  indices: (account: number = 0, role: 0 | 2 = 0, index: number = 0): Array<number> => [
    (0x8000_0000 + 1852) >>> 0,
    (0x8000_0000 + 1815) >>> 0,
    (0x8000_0000 + account) >>> 0,
    role,
    index
  ],
  paymentIndices: (account: number = 0, index: number = 0): Array<number> =>
    (CardanoPath.indices as (a?: number, r?: 0 | 2, i?: number) => Array<number>)(account, 0, index),
  stakeIndices: (account: number = 0, index: number = 0): Array<number> =>
    (CardanoPath.indices as (a?: number, r?: 0 | 2, i?: number) => Array<number>)(account, 2, index)
}
