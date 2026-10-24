"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Unauthorized = exports.TypeId = exports.ServiceUnavailable = exports.RequestTimeout = exports.NotImplemented = exports.NotFound = exports.NotAcceptable = exports.MethodNotAllowed = exports.Issue = exports.InternalServerError = exports.HttpApiDecodeError = exports.Gone = exports.Forbidden = exports.Conflict = exports.BadRequest = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var ParseResult = _interopRequireWildcard(require("effect/ParseResult"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var HttpApiSchema = _interopRequireWildcard(require("./HttpApiSchema.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiError");
/**
 * @since 1.0.0
 * @category schemas
 */
class Issue extends /*#__PURE__*/Schema.ArrayFormatterIssue.annotations({
  identifier: "Issue",
  description: "Represents an error encountered while parsing a value to match the schema"
}) {}
/**
 * @since 1.0.0
 * @category errors
 */
exports.Issue = Issue;
class HttpApiDecodeError extends /*#__PURE__*/Schema.TaggedError()("HttpApiDecodeError", {
  issues: /*#__PURE__*/Schema.Array(Issue),
  message: Schema.String
}, /*#__PURE__*/HttpApiSchema.annotations({
  status: 400,
  description: "The request did not match the expected schema"
})) {
  /**
   * @since 1.0.0
   */
  static fromParseError(error) {
    return ParseResult.ArrayFormatter.formatError(error).pipe(Effect.zip(ParseResult.TreeFormatter.formatError(error)), Effect.map(([issues, message]) => new HttpApiDecodeError({
      issues,
      message
    })));
  }
  /**
   * @since 1.0.0
   */
  static refailParseError(error) {
    return Effect.flatMap(HttpApiDecodeError.fromParseError(error), Effect.fail);
  }
}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.HttpApiDecodeError = HttpApiDecodeError;
class BadRequest extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "BadRequest",
  status: 400
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.BadRequest = BadRequest;
class Unauthorized extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "Unauthorized",
  status: 401
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.Unauthorized = Unauthorized;
class Forbidden extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "Forbidden",
  status: 403
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.Forbidden = Forbidden;
class NotFound extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "NotFound",
  status: 404
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.NotFound = NotFound;
class MethodNotAllowed extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "MethodNotAllowed",
  status: 405
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.MethodNotAllowed = MethodNotAllowed;
class NotAcceptable extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "NotAcceptable",
  status: 406
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.NotAcceptable = NotAcceptable;
class RequestTimeout extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "RequestTimeout",
  status: 408
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.RequestTimeout = RequestTimeout;
class Conflict extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "Conflict",
  status: 409
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.Conflict = Conflict;
class Gone extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "Gone",
  status: 410
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.Gone = Gone;
class InternalServerError extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "InternalServerError",
  status: 500
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.InternalServerError = InternalServerError;
class NotImplemented extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "NotImplemented",
  status: 501
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
exports.NotImplemented = NotImplemented;
class ServiceUnavailable extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "ServiceUnavailable",
  status: 503
}) {}
exports.ServiceUnavailable = ServiceUnavailable;
//# sourceMappingURL=HttpApiError.js.map