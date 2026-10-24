"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stdout = exports.stdin = exports.stderr = exports.fromWritableChannel = exports.fromWritable = void 0;
var _Error = require("@effect/platform/Error");
var internal = _interopRequireWildcard(require("./internal/sink.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @category constructor
 * @since 1.0.0
 */
const fromWritable = exports.fromWritable = internal.fromWritable;
/**
 * @category constructor
 * @since 1.0.0
 */
const fromWritableChannel = exports.fromWritableChannel = internal.fromWritableChannel;
/**
 * @category stdio
 * @since 1.0.0
 */
const stdout = exports.stdout = /*#__PURE__*/fromWritable(() => process.stdout, cause => new _Error.SystemError({
  module: "Stream",
  method: "stdout",
  reason: "Unknown",
  cause
}));
/**
 * @category stdio
 * @since 1.0.0
 */
const stderr = exports.stderr = /*#__PURE__*/fromWritable(() => process.stderr, cause => new _Error.SystemError({
  module: "Stream",
  method: "stderr",
  reason: "Unknown",
  cause
}));
/**
 * @category stdio
 * @since 1.0.0
 */
const stdin = exports.stdin = /*#__PURE__*/fromWritable(() => process.stdin, cause => new _Error.SystemError({
  module: "Stream",
  method: "stdin",
  reason: "Unknown",
  cause
}));
//# sourceMappingURL=NodeSink.js.map