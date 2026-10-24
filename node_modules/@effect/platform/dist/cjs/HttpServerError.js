"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isServerError = exports.exitResponse = exports.clientAbortFiberId = exports.causeResponseStripped = exports.causeResponse = exports.TypeId = exports.ServeError = exports.RouteNotFound = exports.ResponseError = exports.RequestError = void 0;
var _Error = require("./Error.js");
var Respondable = _interopRequireWildcard(require("./HttpServerRespondable.js"));
var ServerResponse = _interopRequireWildcard(require("./HttpServerResponse.js"));
var internal = _interopRequireWildcard(require("./internal/httpServerError.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type id
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category error
 */
class RequestError extends /*#__PURE__*/(0, _Error.TypeIdError)(TypeId, "RequestError") {
  /**
   * @since 1.0.0
   */
  [Respondable.symbol]() {
    return ServerResponse.empty({
      status: 400
    });
  }
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    return this.description ? `${this.reason}: ${this.description} (${this.methodAndUrl})` : `${this.reason} error (${this.methodAndUrl})`;
  }
}
/**
 * @since 1.0.0
 * @category predicates
 */
exports.RequestError = RequestError;
const isServerError = exports.isServerError = internal.isServerError;
/**
 * @since 1.0.0
 * @category error
 */
class RouteNotFound extends /*#__PURE__*/(0, _Error.TypeIdError)(TypeId, "RouteNotFound") {
  constructor(options) {
    super(options);
    this.stack = `${this.name}: ${this.message}`;
  }
  /**
   * @since 1.0.0
   */
  [Respondable.symbol]() {
    return ServerResponse.empty({
      status: 404
    });
  }
  get message() {
    return `${this.request.method} ${this.request.url} not found`;
  }
}
/**
 * @since 1.0.0
 * @category error
 */
exports.RouteNotFound = RouteNotFound;
class ResponseError extends /*#__PURE__*/(0, _Error.TypeIdError)(TypeId, "ResponseError") {
  /**
   * @since 1.0.0
   */
  [Respondable.symbol]() {
    return ServerResponse.empty({
      status: 500
    });
  }
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`;
    return this.description ? `${this.description} (${info})` : `${this.reason} error (${info})`;
  }
}
/**
 * @since 1.0.0
 * @category error
 */
exports.ResponseError = ResponseError;
class ServeError extends /*#__PURE__*/(0, _Error.TypeIdError)(TypeId, "ServeError") {}
/**
 * @since 1.0.0
 */
exports.ServeError = ServeError;
const clientAbortFiberId = exports.clientAbortFiberId = internal.clientAbortFiberId;
/**
 * @since 1.0.0
 */
const causeResponse = exports.causeResponse = internal.causeResponse;
/**
 * @since 1.0.0
 */
const causeResponseStripped = exports.causeResponseStripped = internal.causeResponseStripped;
/**
 * @since 1.0.0
 */
const exitResponse = exports.exitResponse = internal.exitResponse;
//# sourceMappingURL=HttpServerError.js.map