/**
 * Unix time in milliseconds since epoch (January 1, 1970 00:00:00 UTC).
 * Used for JavaScript Date interop and general time operations.
 *
 * @category Time
 * @since 2.0.0
 */
export type UnixTime = bigint

/**
 * Convert UnixTime (milliseconds) to seconds.
 *
 * @param unixTime - Unix time in milliseconds
 * @returns Unix time in seconds
 *
 * @category Time
 * @since 2.0.0
 */
export const toSeconds = (unixTime: UnixTime): bigint => unixTime / 1000n

/**
 * Convert seconds to UnixTime (milliseconds).
 *
 * @param seconds - Time in seconds
 * @returns Unix time in milliseconds
 *
 * @category Time
 * @since 2.0.0
 */
export const fromSeconds = (seconds: bigint): UnixTime => seconds * 1000n

/**
 * Get current UnixTime.
 *
 * @returns Current Unix time in milliseconds
 *
 * @category Time
 * @since 2.0.0
 */
export const now = (): UnixTime => BigInt(Date.now())

/**
 * Convert JavaScript Date to UnixTime.
 *
 * @param date - JavaScript Date object
 * @returns Unix time in milliseconds
 *
 * @category Time
 * @since 2.0.0
 */
export const fromDate = (date: Date): UnixTime => BigInt(date.getTime())

/**
 * Convert UnixTime to JavaScript Date.
 *
 * @param unixTime - Unix time in milliseconds
 * @returns JavaScript Date object
 *
 * @category Time
 * @since 2.0.0
 */
export const toDate = (unixTime: UnixTime): Date => new Date(Number(unixTime))
