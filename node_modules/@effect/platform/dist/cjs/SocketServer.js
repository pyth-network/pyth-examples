"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SocketServerError = exports.SocketServer = exports.ErrorTypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Data = _interopRequireWildcard(require("effect/Data"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category tags
 */
class SocketServer extends /*#__PURE__*/Context.Tag("@effect/platform/SocketServer")() {}
/**
 * @since 1.0.0
 * @category errors
 */
exports.SocketServer = SocketServer;
const ErrorTypeId = exports.ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/SocketServer/SocketServerError");
/**
 * @since 1.0.0
 * @category errors
 */
class SocketServerError extends /*#__PURE__*/Data.TaggedError("SocketServerError") {
  /**
   * @since 1.0.0
   */
  [ErrorTypeId] = ErrorTypeId;
  /**
   * @since 1.0.0
   */
  get message() {
    return this.reason;
  }
}
exports.SocketServerError = SocketServerError;
//# sourceMappingURL=SocketServer.js.map