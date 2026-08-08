import { Effect as Eff, FastCheck, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as KeyHash from "./KeyHash.js"
import * as ScriptHash from "./ScriptHash.js"

/**
 * Credential schema representing either a key hash or script hash
 * credential = [0, addr_keyhash // 1, script_hash]
 * Used to identify ownership of addresses or stake rights
 *
 * @since 2.0.0
 * @category schemas
 */
export const Credential = Schema.Union(KeyHash.KeyHash, ScriptHash.ScriptHash)

/**
 * Type representing a credential that can be either a key hash or script hash
 * Used in various address formats to identify ownership
 *
 * @since 2.0.0
 * @category model
 */
export type Credential = typeof Credential.Type
export type CredentialEncoded = typeof Credential.Encoded

export const makeKeyHash = (hash: Uint8Array): Credential => new KeyHash.KeyHash({ hash })
export const makeScriptHash = (hash: Uint8Array): Credential => new ScriptHash.ScriptHash({ hash })

/**
 * Check if the given value is a valid Credential
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = Schema.is(Credential)

export const CDDLSchema = Schema.Tuple(
  Schema.Literal(0n, 1n),
  Schema.Uint8ArrayFromSelf // hash bytes
)

/**
 * CDDL schema for Credential as defined in the specification:
 * credential = [0, addr_keyhash // 1, script_hash]
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(CDDLSchema, Schema.typeSchema(Credential), {
  strict: true,
  encode: (toI) =>
    Eff.gen(function* () {
      switch (toI._tag) {
        case "KeyHash": {
          return [0n, toI.hash] as const
        }
        case "ScriptHash": {
          return [1n, toI.hash] as const
        }
      }
    }),
  decode: ([tag, hashBytes]) =>
    Eff.gen(function* () {
      switch (tag) {
        case 0n: {
          const keyHash = yield* ParseResult.decode(KeyHash.FromBytes)(hashBytes)
          return keyHash
        }
        case 1n: {
          const scriptHash = yield* ParseResult.decode(ScriptHash.FromBytes)(hashBytes)
          return scriptHash
        }
      }
    })
})

export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → Credential
  )

export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → Credential
  )

/**
 * FastCheck arbitrary for generating random Credential instances.
 * Randomly selects between generating a KeyHash or ScriptHash credential.
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = FastCheck.oneof(KeyHash.arbitrary, ScriptHash.arbitrary)

// ============================================================================
// Decoding Functions
// ============================================================================

/**
 * Parse a Credential from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions): Credential =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse a Credential from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions): Credential =>
  Schema.decodeSync(FromCBORHex(options))(hex)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a Credential to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (credential: Credential, options?: CBOR.CodecOptions): Uint8Array =>
  Schema.encodeSync(FromCBORBytes(options))(credential)

/**
 * Convert a Credential to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (credential: Credential, options?: CBOR.CodecOptions): string =>
  Schema.encodeSync(FromCBORHex(options))(credential)
