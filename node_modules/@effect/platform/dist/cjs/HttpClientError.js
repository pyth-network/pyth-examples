"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isHttpClientError = exports.TypeId = exports.ResponseError = exports.RequestError = void 0;
var _Predicate = require("effect/Predicate");
var Error = _interopRequireWildcard(require("./Error.js"));
var internal = _interopRequireWildcard(require("./internal/httpClientError.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type id
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category guards
 */
const isHttpClientError = u => (0, _Predicate.hasProperty)(u, TypeId);
/**
 * @since 1.0.0
 * @category error
 */
exports.isHttpClientError = isHttpClientError;
class RequestError extends /*#__PURE__*/Error.TypeIdError(TypeId, "RequestError") {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    return this.description ? `${this.reason}: ${this.description} (${this.methodAndUrl})` : `${this.reason} error (${this.methodAndUrl})`;
  }
}
/**
 * @since 1.0.0
 * @category error
 */
exports.RequestError = RequestError;
class ResponseError extends /*#__PURE__*/Error.TypeIdError(TypeId, "ResponseError") {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`;
    return this.description ? `${this.reason}: ${this.description} (${info})` : `${this.reason} error (${info})`;
  }
}
exports.ResponseError = ResponseError;
//# sourceMappingURL=HttpClientError.js.map