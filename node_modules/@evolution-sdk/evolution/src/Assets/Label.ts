import { ParseResult, Schema } from "effect"

import * as Bytes from "../Bytes.js"

/**
 * CRC8 implementation for label checksum calculation.
 * Uses polynomial 0x07 (x^8 + x^2 + x + 1) as per CIP-67 specification.
 *
 * @since 2.0.0
 * @category internal
 */
function crc8(data: Uint8Array): number {
  let crc = 0

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]

    for (let j = 0; j < 8; j++) {
      if (crc & 0x80) {
        crc = (crc << 1) ^ 0x07
      } else {
        crc = crc << 1
      }
    }
  }

  return crc & 0xff
}

/**
 * Generate checksum for a hex-encoded number.
 *
 * @since 2.0.0
 * @category internal
 */
function checksum(num: string): string {
  return crc8(Bytes.fromHex(num)).toString(16).padStart(2, "0")
}

/**
 * Convert a number to a CIP-67 label format.
 * Creates an 8-character hex string with format: 0[4-digit-hex][2-digit-checksum]0
 *
 * Reference: https://cips.cardano.org/cip/CIP-67
 *
 * @since 2.0.0
 * @category conversions
 * @example
 * ```typescript
 * import * as Label from "@evolution-sdk/evolution/Assets/Label"
 *
 * const label = Label.toLabel(222)
 * // => "000de140"
 * ```
 */
export const toLabel = (num: number): string => {
  if (num < 0 || num > 65535) {
    throw new Error(`Label ${num} out of range: min label 0 - max label 65535.`)
  }
  const numHex = num.toString(16).padStart(4, "0")
  return "0" + numHex + checksum(numHex) + "0"
}

/**
 * Parse a CIP-67 label format back to a number.
 * Returns undefined if the label format is invalid or checksum doesn't match.
 *
 * Reference: https://cips.cardano.org/cip/CIP-67
 *
 * @since 2.0.0
 * @category conversions
 * @example
 * ```typescript
 * import * as Label from "@evolution-sdk/evolution/Assets/Label"
 *
 * const num = Label.fromLabel("000de140")
 * // => 222
 *
 * const invalid = Label.fromLabel("00000000")
 * // => undefined
 * ```
 */
export const fromLabel = (label: string): number | undefined => {
  if (label.length !== 8 || !(label[0] === "0" && label[7] === "0")) {
    return undefined
  }
  const numHex = label.slice(1, 5)
  const num = parseInt(numHex, 16)
  const check = label.slice(5, 7)
  return check === checksum(numHex) ? num : undefined
}

/**
 * Schema for validating and parsing CIP-67 labels.
 * Decodes hex string labels to numbers and encodes numbers to label format.
 *
 * @since 2.0.0
 * @category schemas
 * @example
 * ```typescript
 * import * as Label from "@evolution-sdk/evolution/Assets/Label"
 * import { Schema } from "effect"
 *
 * const decoded = Schema.decodeSync(Label.LabelFromHex)("000de140")
 * // => 222
 *
 * const encoded = Schema.encodeSync(Label.LabelFromHex)(222)
 * // => "000de140"
 * ```
 */
export const LabelFromHex = Schema.transformOrFail(
  Schema.String.pipe(
    Schema.pattern(/^0[0-9a-fA-F]{6}0$/, {
      message: () => "Label must be 8 hex characters starting and ending with 0"
    })
  ),
  Schema.Int.pipe(Schema.between(0, 65535)),
  {
    strict: true,
    decode: (label, _, ast) => {
      const num = fromLabel(label)
      if (num === undefined) {
        return ParseResult.fail(new ParseResult.Type(ast, label, "Invalid label: checksum mismatch"))
      }
      return ParseResult.succeed(num)
    },
    encode: (num) => ParseResult.succeed(toLabel(num))
  }
).annotations({
  identifier: "Label.LabelFromHex",
  description: "CIP-67 compliant label with checksum validation"
})
