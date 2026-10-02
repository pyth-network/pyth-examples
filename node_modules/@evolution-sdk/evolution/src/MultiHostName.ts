import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as DnsName from "./DnsName.js"

/**
 * Schema for MultiHostName representing a multiple host name record.
 * multi_host_name = (2, dns_name)
 *
 * @since 2.0.0
 * @category model
 */
export class MultiHostName extends Schema.TaggedClass<MultiHostName>()("MultiHostName", {
  dnsName: DnsName.DnsName
}) {
  /**
   * Convert to JSON-serializable format.
   *
   * @since 2.0.0
   * @category serialization
   */
  toJSON() {
    return {
      _tag: "MultiHostName" as const,
      dnsName: this.dnsName
    }
  }

  toString(): string {
    return Inspectable.format(this.toJSON())
  }

  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof MultiHostName && Equal.equals(this.dnsName, that.dnsName)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.hash(this.dnsName))
  }

  /**
   * Convert to CBOR bytes.
   *
   * @since 2.0.0
   * @category serialization
   */
  toCBORBytes(): Uint8Array {
    return toCBORBytes(this)
  }

  /**
   * Convert to CBOR hex string.
   *
   * @since 2.0.0
   * @category serialization
   */
  toCBORHex(): string {
    return toCBORHex(this)
  }
}

/**
 * CDDL schema for MultiHostName.
 * multi_host_name = (2, dns_name)
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(
  Schema.Tuple(
    Schema.Literal(2n), // tag (literal 2)
    Schema.String // dns_name (string)
  ),
  Schema.typeSchema(MultiHostName),
  {
    strict: true,
    encode: (toA) =>
      Eff.gen(function* () {
        const dnsName = yield* ParseResult.encode(DnsName.DnsName)(toA.dnsName)
        return yield* Eff.succeed([2n, dnsName] as const)
      }),
    decode: ([, dnsNameValue]) =>
      Eff.gen(function* () {
        const dnsName = yield* ParseResult.decode(DnsName.DnsName)(dnsNameValue)
        return yield* Eff.succeed(new MultiHostName({ dnsName }))
      })
  }
).annotations({
  identifier: "MultiHostName.FromCDDL",
  description: "Transforms CBOR structure to MultiHostName"
})

/**
 * CBOR bytes transformation schema for MultiHostName.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → MultiHostName
  ).annotations({
    identifier: "MultiHostName.FromCBORBytes",
    description: "Transforms CBOR bytes to MultiHostName"
  })

/**
 * CBOR hex transformation schema for MultiHostName.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → MultiHostName
  ).annotations({
    identifier: "MultiHostName.FromCBORHex",
    description: "Transforms CBOR hex string to MultiHostName"
  })

/**
 * FastCheck arbitrary for MultiHostName instances.
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = FastCheck.record({
  dnsName: DnsName.arbitrary
}).map((props) => new MultiHostName(props))

/**
 * Parse MultiHostName from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse MultiHostName from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions) => Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode MultiHostName to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: MultiHostName, options?: CBOR.CodecOptions) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Encode MultiHostName to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: MultiHostName, options?: CBOR.CodecOptions) =>
  Schema.encodeSync(FromCBORHex(options))(data)
