import { bech32 } from "@scure/base"
import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Bytes29 from "./Bytes29.js"
import * as Credential from "./Credential.js"
import * as KeyHash from "./KeyHash.js"
import * as NetworkId from "./NetworkId.js"
import * as ScriptHash from "./ScriptHash.js"

/**
 * Reward/stake address with only staking credential
 *
 * @since 2.0.0
 * @category schemas
 */
export class RewardAccount extends Schema.TaggedClass<RewardAccount>("RewardAccount")("RewardAccount", {
  networkId: NetworkId.NetworkId,
  stakeCredential: Credential.Credential
}) {
  /**
   * @since 2.0.0
   * @category json
   */
  toJSON() {
    return { _tag: "RewardAccount" as const, networkId: this.networkId, stakeCredential: this.stakeCredential }
  }

  /**
   * @since 2.0.0
   * @category string
   */
  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  /**
   * @since 2.0.0
   * @category inspect
   */
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  /**
   * @since 2.0.0
   * @category equality
   */
  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof RewardAccount &&
      Equal.equals(this.networkId, that.networkId) &&
      Equal.equals(this.stakeCredential, that.stakeCredential)
    )
  }

  /**
   * @since 2.0.0
   * @category hash
   */
  [Hash.symbol](): number {
    return Hash.combine(Hash.hash(this.networkId))(Hash.hash(this.stakeCredential))
  }
}

export const FromBytes = Schema.transformOrFail(
  Schema.typeSchema(Bytes29.BytesFromHex),
  Schema.typeSchema(RewardAccount),
  {
    strict: true,
    encode: (_, __, ___, toA) =>
      Eff.gen(function* () {
        const stakingBit = toA.stakeCredential._tag === "KeyHash" ? 0 : 1
        const header = (0b111 << 5) | (stakingBit << 4) | (toA.networkId & 0b00001111)
        const result = new Uint8Array(29)
        result[0] = header
        const stakeCredentialBytes = toA.stakeCredential.hash
        result.set(stakeCredentialBytes, 1)
        return yield* ParseResult.succeed(result)
      }),
    decode: (_, __, ___, fromA) =>
      Eff.gen(function* () {
        const header = fromA[0]
        // Extract network ID from the lower 4 bits
        const networkId = header & 0b00001111
        // Extract address type from the upper 4 bits (bits 4-7)
        const addressType = header >> 4

        const isStakeKey = (addressType & 0b0001) === 0
        const stakeCredential: Credential.Credential = isStakeKey
          ? new KeyHash.KeyHash({
              hash: fromA.slice(1, 29)
            })
          : new ScriptHash.ScriptHash({
              hash: fromA.slice(1, 29)
            })
        return RewardAccount.make({
          networkId,
          stakeCredential
        })
      })
  }
).annotations({
  identifier: "RewardAccount.FromBytes",
  description: "Transforms raw bytes to RewardAccount"
})

export const FromHex = Schema.compose(
  Schema.Uint8ArrayFromHex, // string → Uint8Array
  FromBytes // Uint8Array → RewardAccount
).annotations({
  identifier: "RewardAccount.FromHex",
  description: "Transforms raw hex string to RewardAccount"
})

export const FromBech32 = Schema.transformOrFail(Schema.String, Schema.typeSchema(RewardAccount), {
  strict: true,
  encode: (_, __, ___, toA) =>
    Eff.gen(function* () {
      const prefix = toA.networkId === 0 ? "stake_test" : "stake"
      const bytes = yield* ParseResult.encode(FromBytes)(toA)
      const words = bech32.toWords(bytes)
      return bech32.encode(prefix, words, false)
    }),
  decode: (fromA, _, ast) =>
    Eff.gen(function* () {
      const result = yield* Eff.try({
        try: () => {
          // Note: `as any` needed because bech32.decode expects template literal type `${Prefix}1${string}`
          // but Schema provides plain string. Consider using decodeToBytes which accepts string.
          const decoded = bech32.decode(fromA as any, false)
          const bytes = bech32.fromWords(decoded.words)
          return new Uint8Array(bytes)
        },
        catch: () => new ParseResult.Type(ast, fromA, `Failed to decode Bech32: ${fromA}`)
      })
      return yield* ParseResult.decode(FromBytes)(result)
    })
}).annotations({
  identifier: "RewardAccount.FromBech32",
  description: "Transforms Bech32 string to RewardAccount"
})

/**
 * FastCheck arbitrary for RewardAccount instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.tuple(NetworkId.arbitrary, Credential.arbitrary).map(
  ([networkId, stakeCredential]) =>
    new RewardAccount({
      networkId,
      stakeCredential
    })
)

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a RewardAccount from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = (bytes: Uint8Array) => Schema.decodeSync(FromBytes)(bytes)

/**
 * Parse a RewardAccount from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = (hex: string) => Schema.decodeSync(FromHex)(hex)

/**
 * Parse a RewardAccount from Bech32 string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBech32 = (str: string) => Schema.decodeSync(FromBech32)(str)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a RewardAccount to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = (data: RewardAccount) => Schema.encodeSync(FromBytes)(data)

/**
 * Convert a RewardAccount to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = (data: RewardAccount) => Schema.encodeSync(FromHex)(data)

/**
 * Convert a RewardAccount to Bech32 string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBech32 = (data: RewardAccount) => Schema.encodeSync(FromBech32)(data)
