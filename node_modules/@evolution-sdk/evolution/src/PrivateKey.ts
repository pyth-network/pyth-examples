import { mod } from "@noble/curves/abstract/modular.js"
import { ed25519 } from "@noble/curves/ed25519.js"
import { bytesToNumberLE, numberToBytesLE } from "@noble/curves/utils.js"
import { sha512 } from "@noble/hashes/sha2.js"
import { randomBytes } from "@noble/hashes/utils.js"
import { bech32 } from "@scure/base"
import * as BIP32 from "@scure/bip32"
import * as BIP39 from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english"
import { Either as E, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Bip32PrivateKey from "./Bip32PrivateKey.js"
import * as Bytes from "./Bytes.js"
import * as Bytes32 from "./Bytes32.js"
import * as Bytes64 from "./Bytes64.js"
import * as Ed25519Signature from "./Ed25519Signature.js"
import * as VKey from "./VKey.js"

/**
 * Error class for PrivateKey operations
 *
 * @since 2.0.0
 * @category errors
 */
export class PrivateKeyError extends Error {
  readonly _tag = "PrivateKeyError"
  constructor(message: string) {
    super(message)
    this.name = "PrivateKeyError"
  }
}

/**
 * Schema for PrivateKey representing an Ed25519 private key.
 * Supports both standard 32-byte and CIP-0003 extended 64-byte formats.
 * Follows the Conway-era CDDL specification with CIP-0003 compatibility.
 *
 * @since 2.0.0
 * @category schemas
 */
export class PrivateKey extends Schema.TaggedClass<PrivateKey>()("PrivateKey", {
  key: Schema.Union(Bytes64.BytesFromHex, Bytes32.BytesFromHex)
}) {
  toJSON() {
    return { _tag: "PrivateKey" as const, key: Bytes.toHex(this.key) }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof PrivateKey && Bytes.equals(this.key, that.key)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.array(Array.from(this.key)))
  }
}

export const FromBytes = Schema.transform(
  Schema.typeSchema(Schema.Union(Bytes64.BytesFromHex, Bytes32.BytesFromHex)),
  Schema.typeSchema(PrivateKey),
  {
    strict: true,
    decode: (bytes) => new PrivateKey({ key: bytes }),
    encode: (privateKey) => privateKey.key
  }
).annotations({
  identifier: "PrivateKey.FromBytes"
})

export const FromHex = Schema.compose(
  Schema.Uint8ArrayFromHex, // string -> Uint8Array (any length)
  FromBytes // Uint8Array -> PrivateKey (validates 32 or 64)
).annotations({
  identifier: "PrivateKey.FromHex"
})

export const FromBech32 = Schema.transformOrFail(Schema.String, Schema.typeSchema(PrivateKey), {
  strict: true,
  encode: (_, __, ___, toA) =>
    E.gen(function* () {
      const privateKeyBytes = yield* ParseResult.encodeEither(FromBytes)(toA)
      const words = bech32.toWords(privateKeyBytes)
      // Auto-select prefix based on key length (32 bytes = normal, 64 bytes = extended)
      const prefix = privateKeyBytes.length === 32 ? "ed25519_sk" : "ed25519e_sk"
      return bech32.encode(prefix, words, 1023)
    }),
  decode: (fromA, _, ast) =>
    E.gen(function* () {
      const { prefix, words } = yield* ParseResult.try({
        // Note: `as any` needed because bech32.decode expects template literal type `${Prefix}1${string}`
        // but Schema provides plain string. Consider using decodeToBytes which accepts string.
        try: () => bech32.decode(fromA as any, 1023),
        catch: (error) =>
          new ParseResult.Type(ast, fromA, `Failed to decode bech32 string: ${(error as Error).message}`)
      })
      if (prefix !== "ed25519e_sk" && prefix !== "ed25519_sk") {
        throw new ParseResult.Type(ast, fromA, `Expected ed25519e_sk or ed25519_sk prefix, got ${prefix}`)
      }
      const decoded = bech32.fromWords(words)
      return yield* ParseResult.decodeEither(FromBytes)(decoded)
    })
}).annotations({
  identifier: "PrivateKey.FromBech32",
  description: "Transforms Bech32 string (ed25519e_sk1... or ed25519_sk1...) to PrivateKey"
})

/**
 * FastCheck arbitrary for generating random PrivateKey instances.
 * Generates 32-byte private keys.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.uint8Array({ minLength: 32, maxLength: 32 }).map(
  (bytes) => new PrivateKey({ key: bytes }, { disableValidation: true })
)

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a PrivateKey from raw bytes.
 * Supports both 32-byte and 64-byte private keys.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse a PrivateKey from a hex string.
 * Supports both 32-byte (64 chars) and 64-byte (128 chars) hex strings.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Parse a PrivateKey from a Bech32 string.
 * Supports both extended (ed25519e_sk1...) and normal (ed25519_sk1...) formats.
 * Compatible with CML.PrivateKey.from_bech32().
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBech32 = Schema.decodeSync(FromBech32)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a PrivateKey to raw bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Convert a PrivateKey to a hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)

/**
 * Convert a PrivateKey to a Bech32 string.
 * Automatically selects the appropriate prefix based on key length:
 * - 32 bytes → ed25519_sk1... (normal key)
 * - 64 bytes → ed25519e_sk1... (extended key)
 * Compatible with CML.PrivateKey.to_bech32().
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBech32 = Schema.encodeSync(FromBech32)

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate a random 32-byte Ed25519 private key.
 * Compatible with CML.PrivateKey.generate_ed25519().
 *
 * @since 2.0.0
 * @category generators
 */
export const generate = () => randomBytes(32)

/**
 * Generate a random 64-byte extended Ed25519 private key.
 * Compatible with CML.PrivateKey.generate_ed25519extended().
 *
 * @since 2.0.0
 * @category generators
 */
export const generateExtended = () => randomBytes(64)

/**
 * Derive the public key (VKey) from a private key.
 * Compatible with CML privateKey.to_public().
 *
 * @since 2.0.0
 * @category cryptography
 */
export const toPublicKey = (privateKey: PrivateKey): VKey.VKey => VKey.fromPrivateKey(privateKey)

/**
 * Generate a new mnemonic phrase using BIP39.
 *
 * @since 2.0.0
 * @category bip39
 */
export const generateMnemonic = (strength: 128 | 160 | 192 | 224 | 256 = 256): string =>
  BIP39.generateMnemonic(wordlist, strength)

/**
 * Validate a mnemonic phrase using BIP39.
 *
 * @since 2.0.0
 * @category bip39
 */
export const validateMnemonic = (mnemonic: string): boolean => BIP39.validateMnemonic(mnemonic, wordlist)

/**
 * Create a PrivateKey from a mnemonic phrase (sync version that throws PrivateKeyError).
 *
 * **WARNING**: This uses secp256k1 BIP32 derivation (`@scure/bip32`), NOT Cardano's
 * BIP32-Ed25519. For Cardano key derivation, use `fromMnemonicCardano` instead.
 *
 * @deprecated Use `fromMnemonicCardano` for Cardano, or `Bip32PrivateKey` for full control.
 * @since 2.0.0
 * @category bip39
 */
export const fromMnemonic = (mnemonic: string, password?: string): PrivateKey => {
  return E.getOrThrowWith(Either.fromMnemonic(mnemonic, password), (error) => {
    throw error
  })
}

/**
 * Derive a child private key using BIP32 path (sync version that throws PrivateKeyError).
 *
 * **WARNING**: This uses secp256k1 BIP32 derivation (`@scure/bip32`), NOT Cardano's
 * BIP32-Ed25519. For Cardano key derivation, use `fromMnemonicCardano` instead.
 *
 * @deprecated Use `fromMnemonicCardano` for Cardano, or `Bip32PrivateKey` for full control.
 * @since 2.0.0
 * @category bip32
 */
export const derive = (privateKey: PrivateKey, path: string): PrivateKey => {
  return E.getOrThrowWith(Either.derive(privateKey, path), (error) => {
    throw error
  })
}

/**
 * Derive a Cardano payment or stake key from a mnemonic using BIP32-Ed25519.
 *
 * This is the correct way to derive Cardano keys from a mnemonic. It uses the
 * Icarus/V2 BIP32-Ed25519 derivation scheme, matching CML and cardano-cli behavior.
 *
 * @example
 * ```ts
 * import * as PrivateKey from "@evolution-sdk/evolution/PrivateKey"
 *
 * const mnemonic = PrivateKey.generateMnemonic()
 *
 * // Payment key (default: account 0, index 0)
 * const paymentKey = PrivateKey.fromMnemonicCardano(mnemonic)
 *
 * // Stake key
 * const stakeKey = PrivateKey.fromMnemonicCardano(mnemonic, { role: 2 })
 *
 * // Custom account/index
 * const key = PrivateKey.fromMnemonicCardano(mnemonic, { account: 1, index: 3 })
 * ```
 *
 * @since 2.0.0
 * @category cardano
 */
export const fromMnemonicCardano = (
  mnemonic: string,
  options?: { account?: number; role?: 0 | 2; index?: number; password?: string },
): PrivateKey => {
  if (!validateMnemonic(mnemonic)) {
    throw new PrivateKeyError("Invalid mnemonic phrase")
  }
  const entropy = BIP39.mnemonicToEntropy(mnemonic, wordlist)
  // mnemonicToEntropy returns hex string; fromBip39Entropy accepts it via pbkdf2
  const rootXPrv = Bip32PrivateKey.fromBip39Entropy(entropy as unknown as Uint8Array, options?.password ?? "")
  const indices = Bip32PrivateKey.CardanoPath.indices(
    options?.account ?? 0,
    options?.role ?? 0,
    options?.index ?? 0,
  )
  const childNode = Bip32PrivateKey.derive(rootXPrv, indices)
  return Bip32PrivateKey.toPrivateKey(childNode)
}

// ============================================================================
// Cryptographic Operations
// ============================================================================

/**
 * Sign a message using Ed25519 (sync version that throws PrivateKeyError).
 * All errors are normalized to PrivateKeyError with contextual information.
 * For extended keys (64 bytes), uses CML-compatible Ed25519-BIP32 signing.
 * For normal keys (32 bytes), uses standard Ed25519 signing.
 *
 * @since 2.0.0
 * @category cryptography
 */
export const sign = (privateKey: PrivateKey, message: Uint8Array): Ed25519Signature.Ed25519Signature => {
  return E.getOrThrowWith(Either.sign(privateKey, message), (error) => {
    throw error
  })
}

/**
 * Cardano BIP44 derivation path utilities.
 *
 * **WARNING**: These paths are only useful with BIP32-Ed25519 derivation
 * (`Bip32PrivateKey`). Using them with `derive` (which uses secp256k1 BIP32)
 * will produce incorrect keys. Use `fromMnemonicCardano` or
 * `Bip32PrivateKey.CardanoPath` instead.
 *
 * @deprecated Use `fromMnemonicCardano` or `Bip32PrivateKey.CardanoPath`.
 * @since 2.0.0
 * @category cardano
 */
export const CardanoPath = {
  /**
   * Create a Cardano BIP44 derivation path.
   * Standard path: m/1852'/1815'/account'/role/index
   */
  create: (account: number = 0, role: 0 | 2 = 0, index: number = 0) => `m/1852'/${1815}'/${account}'/${role}/${index}`,

  /**
   * Payment key path (role = 0)
   */
  payment: (account: number = 0, index: number = 0) => CardanoPath.create(account, 0, index),

  /**
   * Stake key path (role = 2)
   */
  stake: (account: number = 0, index: number = 0) => CardanoPath.create(account, 2, index)
}

// ============================================================================
// Effect Namespace - Effect-based Error Handling
// ============================================================================

/**
 * Effect-based error handling variants for functions that can fail.
 *
 * @since 2.0.0
 * @category effect
 */
export namespace Either {
  /**
   * Create a PrivateKey from a mnemonic phrase using Effect error handling.
   *
   * @since 2.0.0
   * @category bip39
   */
  export const fromMnemonic = (mnemonic: string, password?: string): E.Either<PrivateKey, PrivateKeyError> =>
    E.gen(function* () {
      if (!validateMnemonic(mnemonic)) {
        return yield* E.left(new PrivateKeyError("Invalid mnemonic phrase"))
      }
      const seed = BIP39.mnemonicToSeedSync(mnemonic, password || "")
      const hdKey = BIP32.HDKey.fromMasterSeed(seed)
      if (!hdKey.privateKey) {
        return yield* E.left(new PrivateKeyError("No private key in HD key"))
      }
      return yield* E.mapLeft(
        ParseResult.decodeEither(FromBytes)(hdKey.privateKey),
        (error) => new PrivateKeyError(`Failed to decode private key: ${error}`)
      )
    })

  /**
   * Derive a child private key using BIP32 path with Effect error handling.
   *
   * @since 2.0.0
   * @category bip32
   */
  export const derive = (privateKey: PrivateKey, path: string): E.Either<PrivateKey, PrivateKeyError> =>
    E.gen(function* () {
      const privateKeyBytes = yield* E.mapLeft(
        ParseResult.encodeEither(FromBytes)(privateKey),
        (error) => new PrivateKeyError(`Failed to encode private key: ${error}`)
      )
      const hdKey = BIP32.HDKey.fromMasterSeed(privateKeyBytes)
      const childKey = hdKey.derive(path)
      if (!childKey.privateKey) {
        return yield* E.left(new PrivateKeyError("No private key in derived HD key"))
      }
      return yield* E.mapLeft(
        ParseResult.decodeEither(FromBytes)(childKey.privateKey),
        (error) => new PrivateKeyError(`Failed to decode derived private key: ${error}`)
      )
    })

  /**
   * Sign a message using Ed25519 with Effect error handling.
   *
   * @since 2.0.0
   * @category cryptography
   */
  export const sign = (
    privateKey: PrivateKey,
    message: Uint8Array
  ): E.Either<Ed25519Signature.Ed25519Signature, PrivateKeyError> =>
    E.gen(function* () {
      const privateKeyBytes = yield* E.mapLeft(
        ParseResult.encodeEither(FromBytes)(privateKey),
        (error) => new PrivateKeyError(`Failed to encode private key: ${error}`)
      )

      if (privateKeyBytes.length === 64) {
        // CML-compatible extended signing algorithm
        const scalar = privateKeyBytes.slice(0, 32)
        const iv = privateKeyBytes.slice(32, 64)

        // Get curve order from the field
        const CURVE_ORDER = ed25519.Point.Fn.ORDER

        // Calculate public key from scalar: publicKey = scalar * G
        // Apply modular reduction to ensure scalar is in valid range [0, curve.n)
        const scalarBigInt = mod(bytesToNumberLE(scalar), CURVE_ORDER)
        const publicKeyPoint = ed25519.Point.BASE.multiplyUnsafe(scalarBigInt)
        const publicKey = publicKeyPoint.toBytes()

        // Calculate nonce: nonce = reduce(sha512(iv || message))
        const nonceHash = sha512(new Uint8Array([...iv, ...message]))
        const nonce = mod(bytesToNumberLE(nonceHash), CURVE_ORDER)

        // Calculate R: R = nonce * G
        const rPoint = ed25519.Point.BASE.multiply(nonce)
        const r = rPoint.toBytes()

        // Calculate challenge: hram = reduce(sha512(R || publicKey || message))
        const hramHash = sha512(new Uint8Array([...r, ...publicKey, ...message]))
        const hram = mod(bytesToNumberLE(hramHash), CURVE_ORDER)

        // Calculate s: s = (hram * scalar + nonce) mod L
        const s = mod(hram * scalarBigInt + nonce, CURVE_ORDER)

        // Encode s as little-endian 32 bytes
        const sBytes = numberToBytesLE(s, 32)
        const signature = new Uint8Array([...r, ...sBytes])
        return new Ed25519Signature.Ed25519Signature({ bytes: signature })
      }

      // Standard 32-byte Ed25519 signing
      const signature = ed25519.sign(message, privateKeyBytes)
      return new Ed25519Signature.Ed25519Signature({ bytes: signature })
    })
}
