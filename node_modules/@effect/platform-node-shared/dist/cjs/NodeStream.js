"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toUint8Array = exports.toString = exports.toReadableNever = exports.toReadable = exports.stdout = exports.stdin = exports.stderr = exports.pipeThroughSimple = exports.pipeThroughDuplex = exports.fromReadableChannel = exports.fromReadable = exports.fromDuplex = void 0;
var Stream = _interopRequireWildcard(require("effect/Stream"));
var internal = _interopRequireWildcard(require("./internal/stream.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @category constructors
 * @since 1.0.0
 */
const fromReadable = exports.fromReadable = internal.fromReadable;
/**
 * @category constructors
 * @since 1.0.0
 */
const fromReadableChannel = exports.fromReadableChannel = internal.fromReadableChannel;
/**
 * @category constructors
 * @since 1.0.0
 */
const fromDuplex = exports.fromDuplex = internal.fromDuplex;
/**
 * @category combinators
 * @since 1.0.0
 */
const pipeThroughDuplex = exports.pipeThroughDuplex = internal.pipeThroughDuplex;
/**
 * @category combinators
 * @since 1.0.0
 */
const pipeThroughSimple = exports.pipeThroughSimple = internal.pipeThroughSimple;
/**
 * @since 1.0.0
 * @category conversions
 */
const toReadable = exports.toReadable = internal.toReadable;
/**
 * @since 1.0.0
 * @category conversions
 */
const toReadableNever = exports.toReadableNever = internal.toReadableNever;
/**
 * @since 1.0.0
 * @category conversions
 */
const toString = exports.toString = internal.toString;
/**
 * @since 1.0.0
 * @category conversions
 */
const toUint8Array = exports.toUint8Array = internal.toUint8Array;
/**
 * @since 1.0.0
 * @category stdio
 */
const stdin = exports.stdin = /*#__PURE__*/internal.fromReadable(() => process.stdin, err => err, {
  closeOnDone: false
}).pipe(Stream.orDie);
/**
 * @since 1.0.0
 * @category stdio
 */
const stdout = exports.stdout = /*#__PURE__*/internal.fromReadable(() => process.stdout, err => err, {
  closeOnDone: false
}).pipe(Stream.orDie);
/**
 * @since 1.0.0
 * @category stdio
 */
const stderr = exports.stderr = /*#__PURE__*/internal.fromReadable(() => process.stderr, err => err, {
  closeOnDone: false
}).pipe(Stream.orDie);
//# sourceMappingURL=NodeStream.js.map