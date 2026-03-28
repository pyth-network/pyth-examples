/**
 * Committee Cold Credential module - provides an alias for Credential specialized for committee cold key usage.
 *
 * In Cardano, committee_cold_credential = credential, representing the same credential structure
 * but used specifically for committee cold keys in governance.
 *
 * Implements CIP-129 bech32 encoding with "cc_cold" prefix.
 *
 * @since 2.0.0
 */

import { bech32 } from "@scure/base"
import * as Effect from "effect/Effect"
import * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"

import * as Credential from "./Credential.js"
import * as KeyHash from "./KeyHash.js"
import * as ScriptHash from "./ScriptHash.js"

export const CommitteeColdCredential = Credential

// ============================================================================
// CIP-129 Bech32 Support
// ============================================================================

/**
 * Transform from CIP-129 bytes (29 bytes) to Committee Cold Credential.
 * Format: [header_byte(1)][credential_bytes(28)]
 * Header byte for cc_cold:
 *   - 0x1C = KeyHash (bits: 0001 1100 = key type 0x01, cred type 0x0C)
 *   - 0x1D = ScriptHash (bits: 0001 1101 = key type 0x01, cred type 0x0D)
 *
 * @since 2.0.0
 * @category transformations
 */
export const FromBytes = Schema.transformOrFail(Schema.Uint8ArrayFromSelf, Schema.typeSchema(Credential.Credential), {
  strict: true,
  encode: (toI, _, ast) =>
    Effect.gen(function* () {
      // Encode: Credential → 29 bytes with cc_cold header
      const credBytes = toI.hash

      if (credBytes.length !== 28) {
        return yield* ParseResult.fail(
          new ParseResult.Type(ast, toI, `Invalid credential hash length: expected 28 bytes, got ${credBytes.length}`)
        )
      }

      const header = toI._tag === "KeyHash" ? 0x1c : 0x1d
      const result = new Uint8Array(29)
      result[0] = header
      result.set(credBytes, 1)
      return result
    }),
  decode: (fromA, _, ast) =>
    Effect.gen(function* () {
      // Decode: 29 bytes → Credential
      if (fromA.length !== 29) {
        return yield* ParseResult.fail(
          new ParseResult.Type(ast, fromA, `Invalid cc_cold credential length: expected 29 bytes, got ${fromA.length}`)
        )
      }

      const header = fromA[0]
      const credBytes = fromA.slice(1)

      // Validate header byte
      const keyType = (header >> 4) & 0x0f
      const credType = header & 0x0f

      if (keyType !== 0x01) {
        return yield* ParseResult.fail(
          new ParseResult.Type(
            ast,
            fromA,
            `Invalid key type in header: expected 0x01 (CC Cold), got 0x0${keyType.toString(16)}`
          )
        )
      }

      if (credType === 0x0c) {
        const keyHash = yield* ParseResult.decode(KeyHash.FromBytes)(credBytes)
        return new KeyHash.KeyHash({ hash: keyHash.hash })
      } else if (credType === 0x0d) {
        const scriptHash = yield* ParseResult.decode(ScriptHash.FromBytes)(credBytes)
        return new ScriptHash.ScriptHash({ hash: scriptHash.hash })
      }

      return yield* ParseResult.fail(
        new ParseResult.Type(
          ast,
          fromA,
          `Invalid credential type in header: expected 0x0C or 0x0D, got 0x0${credType.toString(16)}`
        )
      )
    })
}).annotations({
  identifier: "CommitteeColdCredential.FromBytes",
  description: "Transforms CIP-129 bytes to Committee Cold Credential"
})

/**
 * Transform from hex string to Committee Cold Credential.
 *
 * @since 2.0.0
 * @category transformations
 */
export const FromHex = Schema.compose(Schema.Uint8ArrayFromHex, FromBytes).annotations({
  identifier: "CommitteeColdCredential.FromHex",
  description: "Transforms hex string to Committee Cold Credential"
})

/**
 * Transform from Bech32 string to Committee Cold Credential following CIP-129.
 * Bech32 prefix: "cc_cold" for both KeyHash and ScriptHash
 *
 * @since 2.0.0
 * @category transformations
 */
export const FromBech32 = Schema.transformOrFail(Schema.String, Schema.typeSchema(Credential.Credential), {
  strict: true,
  encode: (_, __, ___, toA) =>
    Effect.gen(function* () {
      const bytes = yield* ParseResult.encode(FromBytes)(toA)
      const words = bech32.toWords(bytes)
      return bech32.encode("cc_cold", words, false)
    }),
  decode: (fromA, _, ast) =>
    Effect.gen(function* () {
      const result = yield* Effect.try({
        try: () => {
          // Note: `as any` needed because bech32.decode expects template literal type `${Prefix}1${string}`
          // but Schema provides plain string. Consider using decodeToBytes which accepts string.
          const decoded = bech32.decode(fromA as any, false)
          if (decoded.prefix !== "cc_cold") {
            throw new Error(`Invalid prefix: expected "cc_cold", got "${decoded.prefix}"`)
          }
          const bytes = bech32.fromWords(decoded.words)
          return new Uint8Array(bytes)
        },
        catch: (error) => new ParseResult.Type(ast, fromA, `Failed to decode bech32: ${error}`)
      })
      return yield* ParseResult.decode(FromBytes)(result)
    })
}).annotations({
  identifier: "CommitteeColdCredential.FromBech32",
  description: "Transforms Bech32 string to Committee Cold Credential (CIP-129)"
})

// ============================================================================
// Decoding Functions
// ============================================================================

/**
 * Parse Committee Cold Credential from CIP-129 bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse Committee Cold Credential from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Parse Committee Cold Credential from Bech32 string (CIP-129 format).
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBech32 = Schema.decodeSync(FromBech32)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Encode Committee Cold Credential to CIP-129 bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode Committee Cold Credential to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)

/**
 * Encode Committee Cold Credential to Bech32 string (CIP-129 format).
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBech32 = Schema.encodeSync(FromBech32)
