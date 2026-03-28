import { Effect as Eff, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as IPv4 from "./IPv4.js"
import * as IPv6 from "./IPv6.js"
import * as Port from "./Port.js"

/**
 * Schema for SingleHostAddr representing a network host with IP addresses.
 * single_host_addr = (0, port/ nil, ipv4/ nil, ipv6/ nil)
 *
 * @since 2.0.0
 * @category model
 */
export class SingleHostAddr extends Schema.TaggedClass<SingleHostAddr>()("SingleHostAddr", {
  port: Schema.optional(Port.PortSchema),
  ipv4: Schema.optional(IPv4.IPv4),
  ipv6: Schema.optional(IPv6.IPv6)
}) {
  /**
   * Convert to JSON-serializable format.
   * Converts bigint port values to strings for JSON compatibility.
   *
   * @since 2.0.0
   * @category serialization
   */
  toJSON() {
    return {
      _tag: "SingleHostAddr" as const,
      port: this.port !== undefined ? String(this.port) : null,
      ipv4: this.ipv4 !== undefined ? this.ipv4.toJSON() : null,
      ipv6: this.ipv6 !== undefined ? this.ipv6.toJSON() : null
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
      that instanceof SingleHostAddr &&
      this.port === that.port &&
      ((this.ipv4 === undefined && that.ipv4 === undefined) ||
        (this.ipv4 !== undefined && that.ipv4 !== undefined && Equal.equals(this.ipv4, that.ipv4))) &&
      ((this.ipv6 === undefined && that.ipv6 === undefined) ||
        (this.ipv6 !== undefined && that.ipv6 !== undefined && Equal.equals(this.ipv6, that.ipv6)))
    )
  }

  [Hash.symbol](): number {
    return Hash.cached(
      this,
      Hash.combine(Hash.hash(this.port))(
        Hash.combine(this.ipv4 !== undefined ? Hash.hash(this.ipv4) : Hash.hash(undefined))(
          this.ipv6 !== undefined ? Hash.hash(this.ipv6) : Hash.hash(undefined)
        )
      )
    )
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
 * Create a SingleHostAddr with IPv4 address.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withIPv4 = (port: Port.Port, ipv4: IPv4.IPv4): SingleHostAddr =>
  new SingleHostAddr({
    port,
    ipv4
  })

/**
 * Create a SingleHostAddr with IPv6 address.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withIPv6 = (port: Port.Port, ipv6: IPv6.IPv6): SingleHostAddr =>
  new SingleHostAddr({
    port,
    ipv6
  })

/**
 * Create a SingleHostAddr with both IPv4 and IPv6 addresses.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withBothIPs = (port: Port.Port, ipv4: IPv4.IPv4, ipv6: IPv6.IPv6): SingleHostAddr =>
  new SingleHostAddr({
    port,
    ipv4,
    ipv6
  })

/**
 * Check if the host address has an IPv4 address.
 *
 * @since 2.0.0
 * @category predicates
 */
export const hasIPv4 = (hostAddr: SingleHostAddr): boolean => hostAddr.ipv4 !== undefined

/**
 * Check if the host address has an IPv6 address.
 *
 * @since 2.0.0
 * @category predicates
 */
export const hasIPv6 = (hostAddr: SingleHostAddr): boolean => hostAddr.ipv6 !== undefined

/**
 * Check if the host address has a port.
 *
 * @since 2.0.0
 * @category predicates
 */
export const hasPort = (hostAddr: SingleHostAddr): boolean => hostAddr.port !== undefined

/**
 * CDDL schema for SingleHostAddr.
 * single_host_addr = (0, port / nil, ipv4 / nil, ipv6 / nil)
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(
  Schema.Tuple(
    Schema.Literal(0n), // tag (literal 0)
    Schema.NullOr(CBOR.Integer), // port (number or null)
    Schema.NullOr(CBOR.ByteArray), // ipv4 bytes (nullable)
    Schema.NullOr(CBOR.ByteArray) // ipv6 bytes (nullable)
  ),
  Schema.typeSchema(SingleHostAddr),
  {
    strict: true,
    encode: (toA) =>
      Eff.gen(function* () {
        const port = toA.port !== undefined ? toA.port : null

        const ipv4 = toA.ipv4 !== undefined ? toA.ipv4.bytes : null

        const ipv6 = toA.ipv6 !== undefined ? toA.ipv6.bytes : null

        return yield* Eff.succeed([0n, port, ipv4, ipv6] as const)
      }),
    decode: ([, portValue, ipv4Value, ipv6Value]) =>
      Eff.gen(function* () {
        const port =
          portValue === null || portValue === undefined
            ? undefined
            : yield* ParseResult.decode(Schema.typeSchema(Port.PortSchema))(portValue)

        const ipv4 =
          ipv4Value === null || ipv4Value === undefined
            ? undefined
            : yield* ParseResult.decode(IPv4.FromBytes)(ipv4Value)

        const ipv6 =
          ipv6Value === null || ipv6Value === undefined
            ? undefined
            : yield* ParseResult.decode(IPv6.FromBytes)(ipv6Value)

        return new SingleHostAddr({ port, ipv4, ipv6 }, { disableValidation: true })
      })
  }
).annotations({
  identifier: "SingleHostAddr.SingleHostAddrCDDLSchema",
  description: "Transforms CBOR structure to SingleHostAddr"
})

/**
 * FastCheck arbitrary for generating random SingleHostAddr instances
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = FastCheck.record({
  port: FastCheck.option(Port.arbitrary),
  ipv4: FastCheck.option(IPv4.arbitrary),
  ipv6: FastCheck.option(IPv6.arbitrary)
}).map(
  ({ ipv4, ipv6, port }) =>
    new SingleHostAddr({
      port: port === null ? undefined : port,
      ipv4: ipv4 === null ? undefined : ipv4,
      ipv6: ipv6 === null ? undefined : ipv6
    })
)

/**
 * CBOR bytes transformation schema for SingleHostAddr.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → SingleHostAddr
  ).annotations({
    identifier: "SingleHostAddr.FromCBORBytes",
    description: "Transforms CBOR bytes to SingleHostAddr"
  })

/**
 * CBOR hex transformation schema for SingleHostAddr.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → SingleHostAddr
  ).annotations({
    identifier: "SingleHostAddr.FromCBORHex",
    description: "Transforms CBOR hex string to SingleHostAddr"
  })

/**
 * Parse SingleHostAddr from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse SingleHostAddr from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions) => Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Encode SingleHostAddr to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: SingleHostAddr, options?: CBOR.CodecOptions) =>
  Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Encode SingleHostAddr to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: SingleHostAddr, options?: CBOR.CodecOptions) =>
  Schema.encodeSync(FromCBORHex(options))(data)
