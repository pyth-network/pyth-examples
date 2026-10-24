"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeRunMain = exports.defaultTeardown = void 0;
var Cause = _interopRequireWildcard(require("effect/Cause"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Exit = _interopRequireWildcard(require("effect/Exit"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var FiberRefs = _interopRequireWildcard(require("effect/FiberRefs"));
var _Function = require("effect/Function");
var HashSet = _interopRequireWildcard(require("effect/HashSet"));
var Logger = _interopRequireWildcard(require("effect/Logger"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @category teardown
 * @since 1.0.0
 */
const defaultTeardown = (exit, onExit) => {
  onExit(Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause) ? 1 : 0);
};
exports.defaultTeardown = defaultTeardown;
const addPrettyLogger = (refs, fiberId) => {
  const loggers = FiberRefs.getOrDefault(refs, FiberRef.currentLoggers);
  if (!HashSet.has(loggers, Logger.defaultLogger)) {
    return refs;
  }
  return FiberRefs.updateAs(refs, {
    fiberId,
    fiberRef: FiberRef.currentLoggers,
    value: loggers.pipe(HashSet.remove(Logger.defaultLogger), HashSet.add(Logger.prettyLoggerDefault))
  });
};
/**
 * @category constructors
 * @since 1.0.0
 */
const makeRunMain = f => (0, _Function.dual)(args => Effect.isEffect(args[0]), (effect, options) => {
  const fiber = options?.disableErrorReporting === true ? Effect.runFork(effect, {
    updateRefs: options?.disablePrettyLogger === true ? undefined : addPrettyLogger
  }) : Effect.runFork(Effect.tapErrorCause(effect, cause => {
    if (Cause.isInterruptedOnly(cause)) {
      return Effect.void;
    }
    return Effect.logError(cause);
  }), {
    updateRefs: options?.disablePrettyLogger === true ? undefined : addPrettyLogger
  });
  const teardown = options?.teardown ?? defaultTeardown;
  return f({
    fiber,
    teardown
  });
});
exports.makeRunMain = makeRunMain;
//# sourceMappingURL=Runtime.js.map