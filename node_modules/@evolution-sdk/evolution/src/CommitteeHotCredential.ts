/**
 * Committee Hot Credential module - provides an alias for Credential specialized for committee hot key usage.
 *
 * In Cardano, committee_hot_credential = credential, representing the same credential structure
 * but used specifically for committee hot keys in governance.
 *
 * Implements CIP-129 bech32 encoding with "cc_hot" prefix.
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

export const CommitteeHotCredential = Credential

// ============================================================================
// CIP-129 Bech32 Support
// ============================================================================

/**
 * Transform from CIP-129 bytes (29 bytes) to Committee Hot Credential.
 * Format: [header_byte(1)][credential_bytes(28)]
 * Header byte for cc_hot:
 *   - 0x1E = KeyHash (bits: 0001 1110 = key type 0x01, cred type 0x0E)
 *   - 0x1F = ScriptHash (bits: 0001 1111 = key type 0x01, cred type 0x0F)
 *
 * @since 2.0.0
 * @category transformations
 */
export const FromBytes = Schema.transformOrFail(Schema.Uint8ArrayFromSelf, Schema.typeSchema(Credential.Credential), {
  strict: true,
  encode: (toI, _, ast) =>
    Effect.gen(function* () {
      // Encode: Credential → 29 bytes with cc_hot header
      const credBytes = toI.hash

      if (credBytes.length !== 28) {
        return yield* ParseResult.fail(
          new ParseResult.Type(ast, toI, `Invalid credential hash length: expected 28 bytes, got ${credBytes.length}`)
        )
      }

      const header = toI._tag === "KeyHash" ? 0x1e : 0x1f
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
          new ParseResult.Type(ast, fromA, `Invalid cc_hot credential length: expected 29 bytes, got ${fromA.length}`)
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
            `Invalid key type in header: expected 0x01 (CC Hot), got 0x0${keyType.toString(16)}`
          )
        )
      }

      if (credType === 0x0e) {
        const keyHash = yield* ParseResult.decode(KeyHash.FromBytes)(credBytes)
        return new KeyHash.KeyHash({ hash: keyHash.hash })
      } else if (credType === 0x0f) {
        const scriptHash = yield* ParseResult.decode(ScriptHash.FromBytes)(credBytes)
        return new ScriptHash.ScriptHash({ hash: scriptHash.hash })
      }

      return yield* ParseResult.fail(
        new ParseResult.Type(
          ast,
          fromA,
          `Invalid credential type in header: expected 0x0E or 0x0F, got 0x0${credType.toString(16)}`
        )
      )
    })
}).annotations({
  identifier: "CommitteeHotCredential.FromBytes",
  description: "Transforms CIP-129 bytes to Committee Hot Credential"
})

/**
 * Transform from hex string to Committee Hot Credential.
 *
 * @since 2.0.0
 * @category transformations
 */
export const FromHex = Schema.compose(Schema.Uint8ArrayFromHex, FromBytes).annotations({
  identifier: "CommitteeHotCredential.FromHex",
  description: "Transforms hex string to Committee Hot Credential"
})

/**
 * Transform from Bech32 string to Committee Hot Credential following CIP-129.
 * Bech32 prefix: "cc_hot" for both KeyHash and ScriptHash
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
      return bech32.encode("cc_hot", words, false)
    }),
  decode: (fromA, _, ast) =>
    Effect.gen(function* () {
      const result = yield* Effect.try({
        try: () => {
          // Note: `as any` needed because bech32.decode expects template literal type `${Prefix}1${string}`
          // but Schema provides plain string. Consider using decodeToBytes which accepts string.
          const decoded = bech32.decode(fromA as any, false)
          if (decoded.prefix !== "cc_hot") {
            throw new Error(`Invalid prefix: expected "cc_hot", got "${decoded.prefix}"`)
          }
          const bytes = bech32.fromWords(decoded.words)
          return new Uint8Array(bytes)
        },
        catch: (error) => new ParseResult.Type(ast, fromA, `Failed to decode bech32: ${error}`)
      })
      return yield* ParseResult.decode(FromBytes)(result)
    })
}).annotations({
  identifier: "CommitteeHotCredential.FromBech32",
  description: "Transforms Bech32 string to Committee Hot Credential (CIP-129)"
})

// ============================================================================
// Decoding Functions
// ============================================================================

/**
 * Parse Committee Hot Credential from CIP-129 bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse Committee Hot Credential from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Parse Committee Hot Credential from Bech32 string (CIP-129 format).
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBech32 = Schema.decodeSync(FromBech32)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Encode Committee Hot Credential to CIP-129 bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode Committee Hot Credential to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)

/**
 * Encode Committee Hot Credential to Bech32 string (CIP-129 format).
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBech32 = Schema.encodeSync(FromBech32)
