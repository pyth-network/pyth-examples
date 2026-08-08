"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layer = void 0;
var _WorkerError = require("@effect/platform/WorkerError");
var Runner = _interopRequireWildcard(require("@effect/platform/WorkerRunner"));
var Cause = _interopRequireWildcard(require("effect/Cause"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Exit = _interopRequireWildcard(require("effect/Exit"));
var FiberSet = _interopRequireWildcard(require("effect/FiberSet"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Runtime = _interopRequireWildcard(require("effect/Runtime"));
var Scope = _interopRequireWildcard(require("effect/Scope"));
var WorkerThreads = _interopRequireWildcard(require("node:worker_threads"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const platformRunnerImpl = /*#__PURE__*/Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start(closeLatch) {
    return Effect.gen(function* () {
      if (!WorkerThreads.parentPort && !process.send) {
        return yield* new _WorkerError.WorkerError({
          reason: "spawn",
          cause: new Error("not in a worker")
        });
      }
      const unsafeSend = WorkerThreads.parentPort ? (message, transfers) => WorkerThreads.parentPort.postMessage(message, transfers) : (message, _transfers) => process.send(message);
      const send = (_portId, message, transfers) => Effect.sync(() => unsafeSend([1, message], transfers));
      const run = Effect.fnUntraced(function* (handler) {
        const runtime = (yield* Effect.interruptible(Effect.runtime())).pipe(Runtime.updateContext(Context.omit(Scope.Scope)));
        const fiberSet = yield* FiberSet.make();
        const runFork = Runtime.runFork(runtime);
        const onExit = exit => {
          if (exit._tag === "Failure" && !Cause.isInterruptedOnly(exit.cause)) {
            Deferred.unsafeDone(closeLatch, Exit.die(Cause.squash(exit.cause)));
          }
        };
        (WorkerThreads.parentPort ?? process).on("message", message => {
          if (message[0] === 0) {
            const result = handler(0, message[1]);
            if (Effect.isEffect(result)) {
              const fiber = runFork(result);
              fiber.addObserver(onExit);
              FiberSet.unsafeAdd(fiberSet, fiber);
            }
          } else {
            if (WorkerThreads.parentPort) {
              WorkerThreads.parentPort.close();
            } else {
              process.channel?.unref();
            }
            Deferred.unsafeDone(closeLatch, Exit.void);
          }
        });
        if (WorkerThreads.parentPort) {
          WorkerThreads.parentPort.on("messageerror", cause => {
            Deferred.unsafeDone(closeLatch, new _WorkerError.WorkerError({
              reason: "decode",
              cause
            }));
          });
          WorkerThreads.parentPort.on("error", cause => {
            Deferred.unsafeDone(closeLatch, new _WorkerError.WorkerError({
              reason: "unknown",
              cause
            }));
          });
        }
        unsafeSend([0]);
      });
      return {
        run,
        send
      };
    });
  }
});
/** @internal */
const layer = exports.layer = /*#__PURE__*/Layer.succeed(Runner.PlatformRunner, platformRunnerImpl);
//# sourceMappingURL=workerRunner.js.map