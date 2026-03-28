import { Schema } from "effect"

import * as Text128 from "./Text128.js"

/**
 * Schema for DnsName with DNS-specific validation.
 * dns_name = text .size (0 .. 128)
 *
 * @since 2.0.0
 * @category model
 */
export const DnsName = Text128.Text128.pipe(Schema.brand("DnsName"))

/**
 * Type alias for DnsName.
 *
 * @since 2.0.0
 * @category model
 */
export type DnsName = typeof DnsName.Type

export const FromBytes = Schema.compose(Text128.FromBytes, DnsName).annotations({
  identifier: "DnsName.FromBytes"
})

export const FromHex = Schema.compose(Text128.FromHex, DnsName).annotations({
  identifier: "DnsName.FromHex"
})

/**
 * Check if the given value is a valid DnsName
 *
 * @since 2.0.0
 * @category predicates
 */
export const isDnsName = Schema.is(DnsName)

/**
 * FastCheck arbitrary for generating random DnsName instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = Text128.arbitrary.map((text) => DnsName.make(text))

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse DnsName from bytes.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse DnsName from hex string.
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode DnsName to bytes.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode DnsName to hex string.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
