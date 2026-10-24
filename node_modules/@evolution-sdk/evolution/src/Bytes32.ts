/**
 * Bytes32 module provides utilities for handling fixed-length and variable-length byte arrays.
 *
 * @since 2.0.0
 */
import { Schema } from "effect"

import * as Bytes from "./Bytes.js"

/**
 * Constant bytes length
 *
 * @since 2.0.0
 * @category constants
 */
export const BYTES_LENGTH = 32

export const BytesFromHex = Schema.Uint8ArrayFromHex.pipe(Bytes.bytesLengthEquals(BYTES_LENGTH))

export const VariableBytesFromHex = Schema.Uint8ArrayFromHex.pipe(Bytes.bytesLengthBetween(0, BYTES_LENGTH))

export const equals = Bytes.equals

// =============================================================================
// Public (throwing) API
// =============================================================================

/**
 * Decode fixed-length hex into bytes.
 *
 * @since 2.0.0
 * @category decoding
 */
export const fromHex = Schema.decodeSync(BytesFromHex)

/**
 * Encode fixed-length bytes to hex.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toHex = Schema.encodeSync(BytesFromHex)

/**
 * Decode variable-length hex (0..BYTES_LENGTH) into bytes.
 *
 * @since 2.0.0
 * @category decoding
 */
export const fromVariableHex = Schema.decodeSync(VariableBytesFromHex)

/**
 * Encode variable-length bytes (0..BYTES_LENGTH) to hex.
 *
 * @since 2.0.0
 * @category encoding
 */
export const toVariableHex = Schema.encodeSync(VariableBytesFromHex)
