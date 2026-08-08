import * as Worker from "@effect/platform/Worker";
import { WorkerError } from "@effect/platform/WorkerError";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
const platformWorkerImpl = /*#__PURE__*/Worker.makePlatform()({
  setup({
    scope,
    worker
  }) {
    return Effect.flatMap(Deferred.make(), exitDeferred => {
      const thing = "postMessage" in worker ? {
        postMessage(msg, t) {
          worker.postMessage(msg, t);
        },
        kill: () => worker.terminate(),
        worker
      } : {
        postMessage(msg, _) {
          worker.send(msg);
        },
        kill: () => worker.kill("SIGKILL"),
        worker
      };
      worker.on("exit", () => {
        Deferred.unsafeDone(exitDeferred, Exit.void);
      });
      return Effect.as(Scope.addFinalizer(scope, Effect.suspend(() => {
        thing.postMessage([1]);
        return Deferred.await(exitDeferred);
      }).pipe(Effect.interruptible, Effect.timeout(5000), Effect.catchAllCause(() => Effect.sync(() => thing.kill())))), thing);
    });
  },
  listen({
    deferred,
    emit,
    port
  }) {
    port.worker.on("message", message => {
      emit(message);
    });
    port.worker.on("messageerror", cause => {
      Deferred.unsafeDone(deferred, new WorkerError({
        reason: "decode",
        cause
      }));
    });
    port.worker.on("error", cause => {
      Deferred.unsafeDone(deferred, new WorkerError({
        reason: "unknown",
        cause
      }));
    });
    port.worker.on("exit", code => {
      Deferred.unsafeDone(deferred, new WorkerError({
        reason: "unknown",
        cause: new Error(`exited with code ${code}`)
      }));
    });
    return Effect.void;
  }
});
/** @internal */
export const layerWorker = /*#__PURE__*/Layer.succeed(Worker.PlatformWorker, platformWorkerImpl);
/** @internal */
export const layerManager = /*#__PURE__*/Layer.provide(Worker.layerManager, layerWorker);
/** @internal */
export const layer = spawn => Layer.merge(layerManager, Worker.layerSpawner(spawn));
/** @internal */
export const layerPlatform = spawn => Layer.merge(layerWorker, Worker.layerSpawner(spawn));
//# sourceMappingURL=worker.js.map