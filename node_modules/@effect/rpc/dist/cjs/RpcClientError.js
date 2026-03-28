"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TypeId = exports.RpcClientError = void 0;
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category Symbols
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcClientError");
/**
 * @since 1.0.0
 * @category Errors
 */
class RpcClientError extends /*#__PURE__*/Schema.TaggedError("@effect/rpc/RpcClientError")("RpcClientError", {
  reason: /*#__PURE__*/Schema.Literal("Protocol", "Unknown"),
  message: Schema.String,
  cause: /*#__PURE__*/Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  [TypeId] = TypeId;
}
exports.RpcClientError = RpcClientError;
//# sourceMappingURL=RpcClientError.js.map