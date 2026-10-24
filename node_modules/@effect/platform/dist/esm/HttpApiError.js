/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import * as HttpApiSchema from "./HttpApiSchema.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiError");
/**
 * @since 1.0.0
 * @category schemas
 */
export class Issue extends /*#__PURE__*/Schema.ArrayFormatterIssue.annotations({
  identifier: "Issue",
  description: "Represents an error encountered while parsing a value to match the schema"
}) {}
/**
 * @since 1.0.0
 * @category errors
 */
export class HttpApiDecodeError extends /*#__PURE__*/Schema.TaggedError()("HttpApiDecodeError", {
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
export class BadRequest extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "BadRequest",
  status: 400
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class Unauthorized extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "Unauthorized",
  status: 401
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class Forbidden extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "Forbidden",
  status: 403
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class NotFound extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "NotFound",
  status: 404
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class MethodNotAllowed extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "MethodNotAllowed",
  status: 405
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class NotAcceptable extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "NotAcceptable",
  status: 406
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class RequestTimeout extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "RequestTimeout",
  status: 408
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class Conflict extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "Conflict",
  status: 409
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class Gone extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "Gone",
  status: 410
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class InternalServerError extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "InternalServerError",
  status: 500
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class NotImplemented extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "NotImplemented",
  status: 501
}) {}
/**
 * @since 1.0.0
 * @category empty errors
 */
export class ServiceUnavailable extends /*#__PURE__*/HttpApiSchema.EmptyError()({
  tag: "ServiceUnavailable",
  status: 503
}) {}
//# sourceMappingURL=HttpApiError.js.map