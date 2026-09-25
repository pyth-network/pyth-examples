"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toResponseOrElseDefect = exports.toResponseOrElse = exports.toResponse = exports.symbol = exports.isRespondable = void 0;
var Cause = _interopRequireWildcard(require("effect/Cause"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var ParseResult = _interopRequireWildcard(require("effect/ParseResult"));
var _Predicate = require("effect/Predicate");
var ServerResponse = _interopRequireWildcard(require("./HttpServerResponse.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category symbols
 */
const symbol = exports.symbol = /*#__PURE__*/Symbol.for("@effect/platform/HttpServerRespondable");
/**
 * @since 1.0.0
 * @category guards
 */
const isRespondable = u => (0, _Predicate.hasProperty)(u, symbol);
exports.isRespondable = isRespondable;
const badRequest = /*#__PURE__*/ServerResponse.empty({
  status: 400
});
const notFound = /*#__PURE__*/ServerResponse.empty({
  status: 404
});
/**
 * @since 1.0.0
 * @category accessors
 */
const toResponse = self => {
  if (ServerResponse.isServerResponse(self)) {
    return Effect.succeed(self);
  }
  return Effect.orDie(self[symbol]());
};
/**
 * @since 1.0.0
 * @category accessors
 */
exports.toResponse = toResponse;
const toResponseOrElse = (u, orElse) => {
  if (ServerResponse.isServerResponse(u)) {
    return Effect.succeed(u);
  } else if (isRespondable(u)) {
    return Effect.catchAllCause(u[symbol](), () => Effect.succeed(orElse));
    // add support for some commmon types
  } else if (ParseResult.isParseError(u)) {
    return Effect.succeed(badRequest);
  } else if (Cause.isNoSuchElementException(u)) {
    return Effect.succeed(notFound);
  }
  return Effect.succeed(orElse);
};
/**
 * @since 1.0.0
 * @category accessors
 */
exports.toResponseOrElse = toResponseOrElse;
const toResponseOrElseDefect = (u, orElse) => {
  if (ServerResponse.isServerResponse(u)) {
    return Effect.succeed(u);
  } else if (isRespondable(u)) {
    return Effect.catchAllCause(u[symbol](), () => Effect.succeed(orElse));
  }
  return Effect.succeed(orElse);
};
exports.toResponseOrElseDefect = toResponseOrElseDefect;
//# sourceMappingURL=HttpServerRespondable.js.map