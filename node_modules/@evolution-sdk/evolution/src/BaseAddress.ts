import { Effect as Eff, Equal, FastCheck, Inspectable, ParseResult, Schema } from "effect"

import * as Bytes57 from "./Bytes57.js"
import * as Credential from "./Credential.js"
import * as KeyHash from "./KeyHash.js"
import * as NetworkId from "./NetworkId.js"
import * as ScriptHash from "./ScriptHash.js"

/**
 * Base address with both payment and staking credentials
 *
 * @since 2.0.0
 * @category schemas
 */
export class BaseAddress extends Schema.TaggedClass<BaseAddress>("BaseAddress")("BaseAddress", {
  networkId: NetworkId.NetworkId,
  paymentCredential: Credential.Credential,
  stakeCredential: Credential.Credential
}) {
  toJSON() {
    return {
      _tag: "BaseAddress" as const,
      networkId: this.networkId,
      paymentCredential: this.paymentCredential,
      stakeCredential: this.stakeCredential
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return (
      that instanceof BaseAddress &&
      Equal.equals(this.networkId, that.networkId) &&
      Equal.equals(this.paymentCredential, that.paymentCredential) &&
      Equal.equals(this.stakeCredential, that.stakeCredential)
    )
  }
}

export const FromBytes = Schema.transformOrFail(
  Schema.typeSchema(Bytes57.BytesFromHex),
  Schema.typeSchema(BaseAddress),
  {
    strict: true,
    encode: (_, __, ___, toA) =>
      Eff.gen(function* () {
        const paymentBit = toA.paymentCredential._tag === "KeyHash" ? 0 : 1
        const stakeBit = toA.stakeCredential._tag === "KeyHash" ? 0 : 1
        const header = (0b00 << 6) | (stakeBit << 5) | (paymentBit << 4) | (toA.networkId & 0b00001111)
        const result = new Uint8Array(57)
        result[0] = header
        const paymentCredentialBytes = toA.paymentCredential.hash
        result.set(paymentCredentialBytes, 1)
        const stakeCredentialBytes = toA.stakeCredential.hash
        result.set(stakeCredentialBytes, 29)
        return yield* ParseResult.succeed(result)
      }),
    decode: (fromI, options, ast, fromA) =>
      Eff.gen(function* () {
        const header = fromA[0]
        // Extract network ID from the lower 4 bits
        const networkId = header & 0b00001111
        // Extract address type from the upper 4 bits (bits 4-7)
        const addressType = header >> 4
        // Script payment, Script stake
        const isPaymentKey = (addressType & 0b0001) === 0
        const paymentCredential: Credential.Credential = isPaymentKey
          ? new KeyHash.KeyHash({
              hash: fromA.slice(1, 29)
            })
          : new ScriptHash.ScriptHash({
              hash: fromA.slice(1, 29)
            })
        const isStakeKey = (addressType & 0b0010) === 0
        const stakeCredential: Credential.Credential = isStakeKey
          ? new KeyHash.KeyHash({
              hash: fromA.slice(29, 57)
            })
          : new ScriptHash.ScriptHash({
              hash: fromA.slice(29, 57)
            })
        return BaseAddress.make({
          networkId,
          paymentCredential,
          stakeCredential
        })
      })
  }
).annotations({
  identifier: "BaseAddress.FromBytes"
})

export const FromHex = Schema.compose(Schema.Uint8ArrayFromHex, FromBytes).annotations({
  identifier: "BaseAddress.FromHex"
})

/**
 * FastCheck arbitrary for BaseAddress instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.tuple(NetworkId.arbitrary, Credential.arbitrary, Credential.arbitrary).map(
  ([networkId, paymentCredential, stakeCredential]) =>
    new BaseAddress({
      networkId,
      paymentCredential,
      stakeCredential
    })
)

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a BaseAddress from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = (bytes: Uint8Array) => Schema.decodeSync(FromBytes)(bytes)

/**
 * Parse a BaseAddress from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = (hex: string) => Schema.decodeSync(FromHex)(hex)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a BaseAddress to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = (data: BaseAddress) => Schema.encodeSync(FromBytes)(data)

/**
 * Convert a BaseAddress to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = (data: BaseAddress) => Schema.encodeSync(FromHex)(data)
