import { FastCheck, Schema } from "effect"

import * as Text from "./Text.js"

/**
 * Constants for Text128 validation.
 * text .size (0 .. 128)
 *
 * @since 2.0.0
 * @category constants
 */
export const TEXT128_MIN_LENGTH = 0
export const TEXT128_MAX_LENGTH = 128

/**
 * Schema for Text128 representing a variable-length text string (0-128 chars).
 * text .size (0 .. 128)
 * Follows the Conway-era CDDL specification.
 *
 * @since 2.0.0
 * @category schemas
 */
export const Text128 = Text.Text.pipe(Text.between(TEXT128_MIN_LENGTH, TEXT128_MAX_LENGTH, "Text128")).annotations({
  identifier: "Text128"
})

export const FromBytes = Schema.compose(
  Text.FromBytes, // Uint8Array -> string
  Text128 // string -> Text128
).annotations({
  identifier: "Text128.FromBytes"
})

export const FromHex = Schema.compose(
  Schema.Uint8ArrayFromHex,
  FromBytes // Uint8Array -> Text128
).annotations({
  identifier: "Text128.FromHex"
})

/**
 * Check if the given value is a valid Text128
 *
 * @since 2.0.0
 * @category predicates
 */
export const isText128 = Schema.is(Text128)

/**
 * FastCheck arbitrary for generating random Text128 instances.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = FastCheck.string({
  minLength: TEXT128_MIN_LENGTH,
  maxLength: TEXT128_MAX_LENGTH
}).map((text) => text)

// ============================================================================
// Root Functions
// ============================================================================

/**
 * Parse Text128 from bytes (unsafe)
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Parse Text128 from hex string (unsafe)
 *
 * @since 2.0.0
 * @category parsing
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Encode Text128 to bytes (unsafe)
 *
 * @since 2.0.0
 * @category encoding
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Encode Text128 to hex string (unsafe)
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(FromHex)
