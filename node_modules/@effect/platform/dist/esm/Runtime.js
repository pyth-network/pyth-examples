/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberRef from "effect/FiberRef";
import * as FiberRefs from "effect/FiberRefs";
import { dual } from "effect/Function";
import * as HashSet from "effect/HashSet";
import * as Logger from "effect/Logger";
/**
 * @category teardown
 * @since 1.0.0
 */
export const defaultTeardown = (exit, onExit) => {
  onExit(Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause) ? 1 : 0);
};
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
export const makeRunMain = f => dual(args => Effect.isEffect(args[0]), (effect, options) => {
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
//# sourceMappingURL=Runtime.js.map