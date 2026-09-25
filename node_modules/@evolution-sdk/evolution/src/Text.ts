import { FastCheck, Schema } from "effect"

export const Text = Schema.String

// Shared transform options for text conversions
const textTransform = {
  strict: true as const,
  decode: (input: Uint8Array) => new TextDecoder().decode(input),
  encode: (text: string) => new TextEncoder().encode(text)
}

/**
 * Schema for converting between strings and bytes (UTF-8).
 *
 * ```
 * text <-> bytes
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromBytes = Schema.transform(Schema.Uint8ArrayFromSelf, Text, textTransform).annotations({
  identifier: "Text.FromBytes"
})

/**
 * Schema for converting between strings and hex representation of UTF-8 bytes.
 *
 * ```
 * text <-> hex
 * ```
 *
 * @since 2.0.0
 * @category schemas
 */
export const FromHex = Schema.transform(Schema.Uint8ArrayFromHex, Text, textTransform).annotations({
  identifier: "Text.FromHex"
})

// =============================================================================
// Text Length Validation Utilities
// =============================================================================

/**
 * Creates a schema that validates text length equals a specific value.
 *
 * @since 2.0.0
 * @category validation
 */
export const length = (length: number, identifier?: string) =>
  Schema.filter((text: string) => text.length === length, {
    message: () => `Expected text length ${length}`,
    identifier
  })

/**
 * Creates a curried filter that validates text length is within a range.
 * Preserves Context inference from the base schema.
 *
 * @since 2.0.0
 * @category composition
 */
export const between =
  (min: number, max: number, moduleName: string) =>
  <S extends Schema.Schema<any, string>>(baseSchema: S) =>
    baseSchema.pipe(
      Schema.filter(
        (text: string) => {
          const textLength = text.length
          return textLength >= min && textLength <= max
        },
        {
          message: () => `Must be between ${min} and ${max} characters`,
          identifier: `${moduleName}.LengthBetween${min}And${max}`
        }
      )
    )

/**
 * Creates a schema that validates text length is at least min.
 *
 * @since 2.0.0
 * @category validation
 */
export const min = (min: number, identifier?: string) =>
  Schema.filter((text: string) => text.length >= min, {
    message: () => `Expected text length at least ${min}`,
    identifier
  })

/**
 * Creates a schema that validates text length is at most max.
 *
 * @since 2.0.0
 * @category validation
 */
export const max = (max: number, identifier?: string) =>
  Schema.filter((text: string) => text.length <= max, {
    message: () => `Expected text length at most ${max}`,
    identifier
  })

/**
 * FastCheck arbitrary for generating random text strings
 *
 * @since 2.0.0
 * @category testing
 */
export const arbitrary = FastCheck.string()

// =============================================================================
// Public (throwing) API
// =============================================================================

/**
 * Convert bytes to text
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromBytes = Schema.decodeSync(FromBytes)

/**
 * Convert hex string to text
 *
 * @since 2.0.0
 * @category conversion
 */
export const fromHex = Schema.decodeSync(FromHex)

/**
 * Convert text to bytes
 *
 * @since 2.0.0
 * @category conversion
 */
export const toBytes = Schema.encodeSync(FromBytes)

/**
 * Convert text to hex string
 *
 * @since 2.0.0
 * @category conversion
 */
export const toHex = Schema.encodeSync(FromHex)
