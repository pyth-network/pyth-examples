/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as ParseResult from "effect/ParseResult";
import { hasProperty } from "effect/Predicate";
import * as ServerResponse from "./HttpServerResponse.js";
/**
 * @since 1.0.0
 * @category symbols
 */
export const symbol = /*#__PURE__*/Symbol.for("@effect/platform/HttpServerRespondable");
/**
 * @since 1.0.0
 * @category guards
 */
export const isRespondable = u => hasProperty(u, symbol);
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
export const toResponse = self => {
  if (ServerResponse.isServerResponse(self)) {
    return Effect.succeed(self);
  }
  return Effect.orDie(self[symbol]());
};
/**
 * @since 1.0.0
 * @category accessors
 */
export const toResponseOrElse = (u, orElse) => {
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
export const toResponseOrElseDefect = (u, orElse) => {
  if (ServerResponse.isServerResponse(u)) {
    return Effect.succeed(u);
  } else if (isRespondable(u)) {
    return Effect.catchAllCause(u[symbol](), () => Effect.succeed(orElse));
  }
  return Effect.succeed(orElse);
};
//# sourceMappingURL=HttpServerRespondable.js.map