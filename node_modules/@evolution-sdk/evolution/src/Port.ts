import { Schema } from "effect"

import * as Numeric from "./Numeric.js"

/**
 * Schema for validating port numbers (0-65535).
 *
 * @since 2.0.0
 * @category schemas
 */
export const PortSchema = Numeric.Uint16Schema.annotations({
  identifier: "Port",
  description: "Network port number (16-bit unsigned integer)"
})

/**
 * Type alias for Port representing network port numbers.
 * Valid range is 0-65535 as per standard TCP/UDP port specification.
 *
 * @since 2.0.0
 * @category model
 */
export type Port = typeof PortSchema.Type

/**
 * Check if a value is a valid Port.
 *
 * @since 2.0.0
 * @category predicates
 */
export const is = (value: unknown): value is Port => Schema.is(PortSchema)(value)

/**
 * Check if a port is a well-known port (0-1023).
 *
 * @since 2.0.0
 * @category predicates
 */
export const isWellKnown = (port: Port): boolean => port >= 0 && port <= 1023

/**
 * Check if a port is a registered port (1024-49151).
 *
 * @since 2.0.0
 * @category predicates
 */
export const isRegistered = (port: Port): boolean => port >= 1024 && port <= 49151

/**
 * Check if a port is a dynamic/private port (49152-65535).
 *
 * @since 2.0.0
 * @category predicates
 */
export const isDynamic = (port: Port): boolean => port >= 49152 && port <= 65535

/**
 * Generate a random Port.
 *
 * @since 2.0.0
 * @category arbitrary
 */
export const arbitrary = Numeric.Uint16Arbitrary
