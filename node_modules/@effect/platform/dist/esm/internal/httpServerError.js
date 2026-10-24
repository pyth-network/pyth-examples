import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as FiberId from "effect/FiberId";
import { globalValue } from "effect/GlobalValue";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Respondable from "../HttpServerRespondable.js";
import * as internalServerResponse from "./httpServerResponse.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpServerError");
/** @internal */
export const isServerError = u => Predicate.hasProperty(u, TypeId);
/** @internal */
export const clientAbortFiberId = /*#__PURE__*/globalValue("@effect/platform/HttpServerError/clientAbortFiberId", () => FiberId.runtime(-499, 0));
/** @internal */
export const causeResponse = cause => {
  const [effect, stripped] = Cause.reduce(cause, [Effect.succeed(internalServerError), Cause.empty], (acc, cause) => {
    switch (cause._tag) {
      case "Empty":
        {
          return Option.some(acc);
        }
      case "Fail":
        {
          return Option.some([Respondable.toResponseOrElse(cause.error, internalServerError), cause]);
        }
      case "Die":
        {
          return Option.some([Respondable.toResponseOrElseDefect(cause.defect, internalServerError), cause]);
        }
      case "Interrupt":
        {
          if (acc[1]._tag !== "Empty") {
            return Option.none();
          }
          const response = cause.fiberId === clientAbortFiberId ? clientAbortError : serverAbortError;
          return Option.some([Effect.succeed(response), cause]);
        }
      default:
        {
          return Option.none();
        }
    }
  });
  return Effect.map(effect, response => {
    if (Cause.isEmptyType(stripped)) {
      return [response, Cause.die(response)];
    }
    return [response, Cause.sequential(stripped, Cause.die(response))];
  });
};
/** @internal */
export const causeResponseStripped = cause => {
  let response;
  const stripped = Cause.stripSomeDefects(cause, defect => {
    if (internalServerResponse.isServerResponse(defect)) {
      response = defect;
      return Option.some(Cause.empty);
    }
    return Option.none();
  });
  return [response ?? internalServerError, stripped];
};
const internalServerError = /*#__PURE__*/internalServerResponse.empty({
  status: 500
});
const clientAbortError = /*#__PURE__*/internalServerResponse.empty({
  status: 499
});
const serverAbortError = /*#__PURE__*/internalServerResponse.empty({
  status: 503
});
/** @internal */
export const exitResponse = exit => {
  if (exit._tag === "Success") {
    return exit.value;
  }
  return causeResponseStripped(exit.cause)[0];
};
//# sourceMappingURL=httpServerError.js.map