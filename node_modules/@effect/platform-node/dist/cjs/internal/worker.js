"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerWorker = exports.layerPlatform = exports.layerManager = exports.layer = void 0;
var Worker = _interopRequireWildcard(require("@effect/platform/Worker"));
var _WorkerError = require("@effect/platform/WorkerError");
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Exit = _interopRequireWildcard(require("effect/Exit"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Scope = _interopRequireWildcard(require("effect/Scope"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
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
      Deferred.unsafeDone(deferred, new _WorkerError.WorkerError({
        reason: "decode",
        cause
      }));
    });
    port.worker.on("error", cause => {
      Deferred.unsafeDone(deferred, new _WorkerError.WorkerError({
        reason: "unknown",
        cause
      }));
    });
    port.worker.on("exit", code => {
      Deferred.unsafeDone(deferred, new _WorkerError.WorkerError({
        reason: "unknown",
        cause: new Error(`exited with code ${code}`)
      }));
    });
    return Effect.void;
  }
});
/** @internal */
const layerWorker = exports.layerWorker = /*#__PURE__*/Layer.succeed(Worker.PlatformWorker, platformWorkerImpl);
/** @internal */
const layerManager = exports.layerManager = /*#__PURE__*/Layer.provide(Worker.layerManager, layerWorker);
/** @internal */
const layer = spawn => Layer.merge(layerManager, Worker.layerSpawner(spawn));
/** @internal */
exports.layer = layer;
const layerPlatform = spawn => Layer.merge(layerWorker, Worker.layerSpawner(spawn));
exports.layerPlatform = layerPlatform;
//# sourceMappingURL=worker.js.map