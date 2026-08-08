"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isServerError = exports.exitResponse = exports.clientAbortFiberId = exports.causeResponseStripped = exports.causeResponse = exports.TypeId = void 0;
var Cause = _interopRequireWildcard(require("effect/Cause"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var FiberId = _interopRequireWildcard(require("effect/FiberId"));
var _GlobalValue = require("effect/GlobalValue");
var Option = _interopRequireWildcard(require("effect/Option"));
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Respondable = _interopRequireWildcard(require("../HttpServerRespondable.js"));
var internalServerResponse = _interopRequireWildcard(require("./httpServerResponse.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpServerError");
/** @internal */
const isServerError = u => Predicate.hasProperty(u, TypeId);
/** @internal */
exports.isServerError = isServerError;
const clientAbortFiberId = exports.clientAbortFiberId = /*#__PURE__*/(0, _GlobalValue.globalValue)("@effect/platform/HttpServerError/clientAbortFiberId", () => FiberId.runtime(-499, 0));
/** @internal */
const causeResponse = cause => {
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
exports.causeResponse = causeResponse;
const causeResponseStripped = cause => {
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
exports.causeResponseStripped = causeResponseStripped;
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
const exitResponse = exit => {
  if (exit._tag === "Success") {
    return exit.value;
  }
  return causeResponseStripped(exit.cause)[0];
};
exports.exitResponse = exitResponse;
//# sourceMappingURL=httpServerError.js.map