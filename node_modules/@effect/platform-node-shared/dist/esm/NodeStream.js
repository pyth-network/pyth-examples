import * as Stream from "effect/Stream";
import * as internal from "./internal/stream.js";
/**
 * @category constructors
 * @since 1.0.0
 */
export const fromReadable = internal.fromReadable;
/**
 * @category constructors
 * @since 1.0.0
 */
export const fromReadableChannel = internal.fromReadableChannel;
/**
 * @category constructors
 * @since 1.0.0
 */
export const fromDuplex = internal.fromDuplex;
/**
 * @category combinators
 * @since 1.0.0
 */
export const pipeThroughDuplex = internal.pipeThroughDuplex;
/**
 * @category combinators
 * @since 1.0.0
 */
export const pipeThroughSimple = internal.pipeThroughSimple;
/**
 * @since 1.0.0
 * @category conversions
 */
export const toReadable = internal.toReadable;
/**
 * @since 1.0.0
 * @category conversions
 */
export const toReadableNever = internal.toReadableNever;
/**
 * @since 1.0.0
 * @category conversions
 */
export const toString = internal.toString;
/**
 * @since 1.0.0
 * @category conversions
 */
export const toUint8Array = internal.toUint8Array;
/**
 * @since 1.0.0
 * @category stdio
 */
export const stdin = /*#__PURE__*/internal.fromReadable(() => process.stdin, err => err, {
  closeOnDone: false
}).pipe(Stream.orDie);
/**
 * @since 1.0.0
 * @category stdio
 */
export const stdout = /*#__PURE__*/internal.fromReadable(() => process.stdout, err => err, {
  closeOnDone: false
}).pipe(Stream.orDie);
/**
 * @since 1.0.0
 * @category stdio
 */
export const stderr = /*#__PURE__*/internal.fromReadable(() => process.stderr, err => err, {
  closeOnDone: false
}).pipe(Stream.orDie);
//# sourceMappingURL=NodeStream.js.map