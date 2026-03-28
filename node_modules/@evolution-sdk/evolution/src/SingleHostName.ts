import { Effect, Equal, FastCheck, Hash, Inspectable, ParseResult, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as DnsName from "./DnsName.js"
import * as Port from "./Port.js"

/**
 * Schema for SingleHostName representing a network host with DNS name.
 * single_host_name = (1, port/ nil, dns_name)
 *
 * Used for A or AAAA DNS records.
 *
 * @since 2.0.0
 * @category model
 */
export class SingleHostName extends Schema.TaggedClass<SingleHostName>()("SingleHostName", {
  port: Schema.optional(Port.PortSchema),
  dnsName: DnsName.DnsName
}) {
  /**
   * Convert to JSON-serializable format.
   * Relies on Option's built-in toJSON() for port serialization.
   * Converts bigint port values to strings for JSON compatibility.
   *
   * @since 2.0.0
   * @category serialization
   */
  toJSON() {
    return {
      _tag: "SingleHostName" as const,
      port: this.port !== undefined ? String(this.port) : null,
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
    return that instanceof SingleHostName && this.port === that.port && Equal.equals(this.dnsName, that.dnsName)
  }

  [Hash.symbol](): number {
    return Hash.cached(this, Hash.combine(Hash.hash(this.port))(Hash.hash(this.dnsName)))
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

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return {
      _tag: "SingleHostName",
      port: this.port,
      dnsName: this.dnsName
    }
  }
}

/**
 * Create a SingleHostName with a port.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withPort = (port: Port.Port, dnsName: DnsName.DnsName): SingleHostName =>
  new SingleHostName({
    port,
    dnsName
  })

/**
 * Create a SingleHostName without a port.
 *
 * @since 2.0.0
 * @category constructors
 */
export const withoutPort = (dnsName: DnsName.DnsName): SingleHostName =>
  new SingleHostName({
    dnsName
  })

/**
 * Check if the host name has a port.
 *
 * @since 2.0.0
 * @category predicates
 */
export const hasPort = (hostName: SingleHostName): boolean => hostName.port !== undefined

/**
 * Get the DNS name from a SingleHostName.
 *
 * @since 2.0.0
 * @category transformation
 */
export const getDnsName = (hostName: SingleHostName): DnsName.DnsName => hostName.dnsName

/**
 * Get the port from a SingleHostName, if it exists.
 *
 * @since 2.0.0
 * @category transformation
 */
export const getPort = (hostName: SingleHostName): Port.Port | undefined => hostName.port

/**
 * Generate a random SingleHostName.
 *
 * @since 2.0.0
 * @category generators
 */
export const generator = FastCheck.record({
  port: FastCheck.option(Port.arbitrary),
  dnsName: DnsName.arbitrary
}).map(
  ({ dnsName, port }) =>
    new SingleHostName({
      port: port === null ? undefined : port,
      dnsName
    })
)

/**
 * FastCheck arbitrary for SingleHostName instances.
 * Alias to `generator` for consistency with other modules.
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = generator

/**
 * CDDL schema for SingleHostName.
 * single_host_name = (1, port / nil, dns_name)
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCDDL = Schema.transformOrFail(
  Schema.Tuple(
    Schema.Literal(1n), // tag (literal 1)
    Schema.NullOr(CBOR.Integer), // port (number or null)
    Schema.String // dns_name (string)
  ),
  Schema.typeSchema(SingleHostName),
  {
    strict: true,
    encode: (toA) =>
      Effect.gen(function* () {
        const port = toA.port !== undefined ? toA.port : null
        const dnsName = yield* ParseResult.encode(DnsName.DnsName)(toA.dnsName)

        return yield* Effect.succeed([1n, port, dnsName] as const)
      }),
    decode: ([, portValue, dnsNameValue]) =>
      Effect.gen(function* () {
        const port = portValue === null || portValue === undefined ? undefined : portValue

        const dnsName = yield* ParseResult.decode(DnsName.DnsName)(dnsNameValue)

        return new SingleHostName({ port, dnsName })
      })
  }
)

/**
 * CBOR bytes transformation schema for SingleHostName.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    CBOR.FromBytes(options), // Uint8Array → CBOR
    FromCDDL // CBOR → SingleHostName
  )

/**
 * CBOR hex transformation schema for SingleHostName.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromBytes(options) // Uint8Array → SingleHostName
  )

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse a SingleHostName from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions) =>
  Schema.decodeSync(FromBytes(options))(bytes)

/**
 * Parse a SingleHostName from CBOR hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions) => Schema.decodeSync(FromHex(options))(hex)

// ============================================================================
// Encoding Functions
// ============================================================================

/**
 * Convert a SingleHostName to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: SingleHostName, options?: CBOR.CodecOptions) =>
  Schema.encodeSync(FromBytes(options))(data)

/**
 * Convert a SingleHostName to CBOR hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: SingleHostName, options?: CBOR.CodecOptions) =>
  Schema.encodeSync(FromHex(options))(data)
