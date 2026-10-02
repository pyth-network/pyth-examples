import { WorkerError } from "@effect/platform/WorkerError";
import * as Runner from "@effect/platform/WorkerRunner";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberSet from "effect/FiberSet";
import * as Layer from "effect/Layer";
import * as Runtime from "effect/Runtime";
import * as Scope from "effect/Scope";
import * as WorkerThreads from "node:worker_threads";
const platformRunnerImpl = /*#__PURE__*/Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start(closeLatch) {
    return Effect.gen(function* () {
      if (!WorkerThreads.parentPort && !process.send) {
        return yield* new WorkerError({
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
            Deferred.unsafeDone(closeLatch, new WorkerError({
              reason: "decode",
              cause
            }));
          });
          WorkerThreads.parentPort.on("error", cause => {
            Deferred.unsafeDone(closeLatch, new WorkerError({
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
export const layer = /*#__PURE__*/Layer.succeed(Runner.PlatformRunner, platformRunnerImpl);
//# sourceMappingURL=workerRunner.js.map