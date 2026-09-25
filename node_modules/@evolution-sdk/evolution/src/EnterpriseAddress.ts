import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as Bytes29 from "./Bytes29.js"
import * as Credential from "./Credential.js"
import * as KeyHash from "./KeyHash.js"
import * as NetworkId from "./NetworkId.js"
import * as ScriptHash from "./ScriptHash.js"

/**
 * Enterprise address with only payment credential
 *
 * @since 2.0.0
 * @category schemas
 */
export class EnterpriseAddress extends Schema.TaggedClass<EnterpriseAddress>("EnterpriseAddress")("EnterpriseAddress", {
  networkId: NetworkId.NetworkId,
  paymentCredential: Credential.Credential
}) {
  toJSON() {
    return {
      _tag: "EnterpriseAddress" as const,
      networkId: this.networkId,
      paymentCredential: this.paymentCredential
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
      that instanceof EnterpriseAddress &&
      Equal.equals(this.networkId, that.networkId) &&
      Equal.equals(this.paymentCredential, that.paymentCredential)
    )
  }

  [Hash.symbol](): number {
    return Hash.combine(Hash.hash(this.networkId))(Hash.hash(this.paymentCredential))
  }
}

export const FromBytes = Schema.transformOrFail(
  Schema.typeSchema(Bytes29.BytesFromHex),
  Schema.typeSchema(EnterpriseAddress),
  {
    strict: true,
    encode: (_, __, ___, toA) =>
      Eff.gen(function* () {
        const paymentBit = toA.paymentCredential._tag === "KeyHash" ? 0 : 1
        const header = (0b01 << 6) | (0b1 << 5) | (paymentBit << 4) | (toA.networkId & 0b00001111)

        const result = new Uint8Array(29)
        result[0] = header

        const paymentCredentialBytes = toA.paymentCredential.hash
        result.set(paymentCredentialBytes, 1)

        return yield* ParseResult.succeed(result)
      }),
    decode: (_, __, ___, fromA) =>
      Eff.gen(function* () {
        const header = fromA[0]
        // Extract network ID from the lower 4 bits
        const networkId = header & 0b00001111
        // Extract address type from the upper 4 bits (bits 4-7)
        const addressType = header >> 4

        // Script payment
        const isPaymentKey = (addressType & 0b0001) === 0
        const paymentCredential: Credential.Credential = isPaymentKey
          ? new KeyHash.KeyHash({
              hash: fromA.slice(1, 29)
            })
          : new ScriptHash.ScriptHash({
              hash: fromA.slice(1, 29)
            })
        return EnterpriseAddress.make({
          networkId,
          paymentCredential
        })
      })
  }
).annotations({
  identifier: "EnterpriseAddress.FromBytes",
  description: "Transforms raw bytes to EnterpriseAddress"
})

export const FromHex = Schema.compose(
  Schema.Uint8ArrayFromHex, // string → Uint8Array
  FromBytes // Uint8Array → EnterpriseAddress
).annotations({
  identifier: "EnterpriseAddress.FromHex",
  description: "Transforms raw hex string to EnterpriseAddress"
})

/**
 * FastCheck arbitrary for generating random EnterpriseAddress instances
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = FastCheck.tuple(NetworkId.arbitrary, Credential.arbitrary).map(
  ([networkId, paymentCredential]) => new EnterpriseAddress({ networkId, paymentCredential })
)

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse a EnterpriseAddress from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = (bytes: Uint8Array) => Schema.decodeSync(FromBytes)(bytes)

/**
 * Parse a EnterpriseAddress from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = (hex: string) => Schema.decodeSync(FromHex)(hex)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a EnterpriseAddress to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = (data: EnterpriseAddress) => Schema.encodeSync(FromBytes)(data)

/**
 * Convert a EnterpriseAddress to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = (data: EnterpriseAddress) => Schema.encodeSync(FromHex)(data)
