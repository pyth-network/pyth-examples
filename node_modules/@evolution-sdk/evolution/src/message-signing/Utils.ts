/**
 * Utility functions for COSE message signing.
 *
 * @since 2.0.0
 * @category Message Signing
 */

import { FastCheck } from "effect"

import * as Bytes from "../Bytes.js"

// ============================================================================
// Types
// ============================================================================

/**
 * Payload type - represents the data to be signed.
 *
 * @since 2.0.0
 * @category Model
 */
export type Payload = Uint8Array

// ============================================================================
// Payload Conversion
// ============================================================================

/**
 * Convert text to Payload (UTF-8 encoding).
 *
 * @since 2.0.0
 * @category Utilities
 */
export const fromText = (text: string): Payload => new TextEncoder().encode(text)

/**
 * Convert Payload to text (UTF-8 decoding).
 *
 * @since 2.0.0
 * @category Utilities
 */
export const toText = (payload: Payload): string => new TextDecoder().decode(payload)

/**
 * Convert hex string to Payload.
 *
 * @since 2.0.0
 * @category Utilities
 */
export const fromHex = (hex: string): Payload => Bytes.fromHex(hex)

/**
 * Convert Payload to hex string.
 *
 * @since 2.0.0
 * @category Utilities
 */
export const toHex = (payload: Payload): string => Bytes.toHex(payload)

// ============================================================================
// Testing Support
// ============================================================================

/**
 * FastCheck arbitrary for generating random Payload instances.
 *
 * @since 2.0.0
 * @category Testing
 */
export const arbitraryPayload: FastCheck.Arbitrary<Payload> = FastCheck.uint8Array({
  minLength: 0,
  maxLength: 256
})

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * FNV-1a 32-bit hash algorithm.
 * Used for checksums in user-facing encoding.
 *
 * @internal
 */
export function fnv32a(bytes: Uint8Array): number {
  const FNV_PRIME = 0x01000193
  let hash = 0x811c9dc5 // FNV offset basis

  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i]
    hash = Math.imul(hash, FNV_PRIME)
  }

  return hash >>> 0 // Convert to unsigned 32-bit
}
