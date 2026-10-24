import { Schema } from "effect"

export const equals = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Creates a curried filter that validates exact byte length (for Uint8Array).
 * Preserves Context inference from the base schema.
 *
 * @since 2.0.0
 * @category composition
 */
export const bytesLengthEquals =
  (byteLength: number) =>
  <S extends Schema.Schema<any, any>>(baseSchema: S) =>
    baseSchema.pipe(
      Schema.filter((bytes: Uint8Array) => bytes.length === byteLength, {
        message: (issue) =>
          `${issue.actual} Must be exactly ${byteLength} bytes, got ${(issue.actual as Uint8Array).length}`
      })
    )

/**
 * Creates a curried filter that validates byte length is within a range (for Uint8Array).
 * Preserves Context inference from the base schema.
 *
 * @since 2.0.0
 * @category composition
 */
export const bytesLengthBetween =
  (minBytes: number, maxBytes: number) =>
  <S extends Schema.Schema<any, any>>(baseSchema: S) =>
    baseSchema.pipe(
      Schema.filter((bytes: Uint8Array) => bytes.length >= minBytes && bytes.length <= maxBytes, {
        message: () => `Must be between ${minBytes} and ${maxBytes} bytes`
      })
    )

/**
 * Creates a curried filter that validates minimum byte length (for Uint8Array).
 * Preserves Context inference from the base schema.
 *
 * @since 2.0.0
 * @category composition
 */
export const bytesLengthMin =
  (minBytes: number) =>
  <S extends Schema.Schema<any, Uint8Array>>(baseSchema: S) =>
    baseSchema.pipe(
      Schema.filter((bytes: Uint8Array) => bytes.length >= minBytes, {
        message: () => `Must be at least ${minBytes} bytes`
      })
    )

/**
 * Creates a curried filter that validates maximum byte length (for Uint8Array).
 * Preserves Context inference from the base schema.
 *
 * @since 2.0.0
 * @category composition
 */
export const bytesLengthMax =
  (maxBytes: number, moduleName: string) =>
  <S extends Schema.Schema<any, Uint8Array>>(baseSchema: S) =>
    baseSchema.pipe(
      Schema.filter((bytes: Uint8Array) => bytes.length <= maxBytes, {
        message: () => `Must be at most ${maxBytes} bytes`,
        identifier: `${moduleName}.BytesLengthMax${maxBytes}`
      })
    )

/**
 * Convert hex string to Uint8Array. Throws on invalid input.
 *
 * @since 2.0.0
 * @category conversions
 */
export const fromHex = Schema.decodeSync(Schema.Uint8ArrayFromHex)

/**
 * Convert Uint8Array to hex string. Never fails.
 *
 * @since 2.0.0
 * @category conversions
 */
export const toHex = Schema.encodeSync(Schema.Uint8ArrayFromHex)
