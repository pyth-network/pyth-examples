import { FastCheck, Schema } from "effect"

import * as CBOR from "./CBOR.js"
import * as MultiHostName from "./MultiHostName.js"
import * as SingleHostAddr from "./SingleHostAddr.js"
import * as SingleHostName from "./SingleHostName.js"

/**
 * Union schema for Relay representing various relay configurations.
 * relay = [ single_host_addr // single_host_name // multi_host_name ]
 *
 * @since 2.0.0
 * @category schemas
 */
export const Relay = Schema.Union(
  SingleHostAddr.SingleHostAddr,
  SingleHostName.SingleHostName,
  MultiHostName.MultiHostName
)

export const FromCDDL = Schema.Union(SingleHostAddr.FromCDDL, SingleHostName.FromCDDL, MultiHostName.FromCDDL)

/**
 * Type alias for Relay.
 *
 * @since 2.0.0
 * @category model
 */
export type Relay = typeof Relay.Type

/**
 * CBOR bytes transformation schema for Relay.
 * For union types, we create a union of the child CBOR schemas.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORBytes = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.Union(
    SingleHostAddr.FromCBORBytes(options),
    SingleHostName.FromBytes(options), // Still uses old naming
    MultiHostName.FromCBORBytes(options)
  ).annotations({
    identifier: "Relay.FromCBORBytes",
    title: "Relay from CBOR Bytes",
    description: "Transforms CBOR bytes (Uint8Array) to Relay"
  })

/**
 * CBOR hex transformation schema for Relay.
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromCBORHex = (options: CBOR.CodecOptions = CBOR.CML_DEFAULT_OPTIONS) =>
  Schema.compose(
    Schema.Uint8ArrayFromHex, // string → Uint8Array
    FromCBORBytes(options) // Uint8Array → Relay
  ).annotations({
    identifier: "Relay.FromCBORHex",
    title: "Relay from CBOR Hex",
    description: "Transforms CBOR hex string to Relay"
  })

/**
 * @since 2.0.0
 * @category FastCheck
 */
export const arbitrary = FastCheck.oneof(SingleHostAddr.arbitrary, SingleHostName.arbitrary, MultiHostName.arbitrary)

/**
 * Create a Relay from a SingleHostAddr.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromSingleHostAddr = (singleHostAddr: SingleHostAddr.SingleHostAddr): Relay => singleHostAddr

/**
 * Create a Relay from a SingleHostName.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromSingleHostName = (singleHostName: SingleHostName.SingleHostName): Relay => singleHostName

/**
 * Create a Relay from a MultiHostName.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromMultiHostName = (multiHostName: MultiHostName.MultiHostName): Relay => multiHostName

/**
 * Parse Relay from CBOR bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORBytes = (bytes: Uint8Array, options?: CBOR.CodecOptions) =>
  Schema.decodeSync(FromCBORBytes(options))(bytes)

/**
 * Parse Relay from CBOR hex.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromCBORHex = (hex: string, options?: CBOR.CodecOptions) => Schema.decodeSync(FromCBORHex(options))(hex)

/**
 * Convert Relay to CBOR bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORBytes = (data: Relay, options?: CBOR.CodecOptions) => Schema.encodeSync(FromCBORBytes(options))(data)

/**
 * Convert Relay to CBOR hex.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toCBORHex = (data: Relay, options?: CBOR.CodecOptions) => Schema.encodeSync(FromCBORHex(options))(data)

/**
 * Pattern match on a Relay to handle different relay types.
 *
 * @since 2.0.0
 * @category transformation
 */
export const match = <A, B, C>(
  relay: Relay,
  cases: {
    SingleHostAddr: (addr: SingleHostAddr.SingleHostAddr) => A
    SingleHostName: (name: SingleHostName.SingleHostName) => B
    MultiHostName: (multi: MultiHostName.MultiHostName) => C
  }
): A | B | C => {
  switch (relay._tag) {
    case "SingleHostAddr":
      return cases.SingleHostAddr(relay)
    case "SingleHostName":
      return cases.SingleHostName(relay)
    case "MultiHostName":
      return cases.MultiHostName(relay)
    default:
      throw new Error(`Exhaustive check failed: Unhandled case '${(relay as { _tag: string })._tag}' encountered.`)
  }
}

/**
 * Check if a Relay is a SingleHostAddr.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isSingleHostAddr = (relay: Relay): relay is SingleHostAddr.SingleHostAddr =>
  relay._tag === "SingleHostAddr"

/**
 * Check if a Relay is a SingleHostName.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isSingleHostName = (relay: Relay): relay is SingleHostName.SingleHostName =>
  relay._tag === "SingleHostName"

/**
 * Check if a Relay is a MultiHostName.
 *
 * @since 2.0.0
 * @category predicates
 */
export const isMultiHostName = (relay: Relay): relay is MultiHostName.MultiHostName => relay._tag === "MultiHostName"
