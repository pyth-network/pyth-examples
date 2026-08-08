"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeSerialized = exports.make = exports.layerSerialized = exports.layerCloseLatch = exports.layer = exports.launch = exports.PlatformRunnerTypeId = exports.PlatformRunner = exports.CloseLatch = void 0;
var Cause = _interopRequireWildcard(require("effect/Cause"));
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Either = _interopRequireWildcard(require("effect/Either"));
var Fiber = _interopRequireWildcard(require("effect/Fiber"));
var FiberId = _interopRequireWildcard(require("effect/FiberId"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var Transferable = _interopRequireWildcard(require("../Transferable.js"));
var _WorkerError = require("../WorkerError.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const PlatformRunnerTypeId = exports.PlatformRunnerTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Runner/PlatformRunner");
/** @internal */
const PlatformRunner = exports.PlatformRunner = /*#__PURE__*/Context.GenericTag("@effect/platform/Runner/PlatformRunner");
/** @internal */
const CloseLatch = exports.CloseLatch = /*#__PURE__*/Context.Reference()("@effect/platform/WorkerRunner/CloseLatch", {
  defaultValue: () => Deferred.unsafeMake(FiberId.none)
});
/** @internal */
const layerCloseLatch = exports.layerCloseLatch = /*#__PURE__*/Layer.effect(CloseLatch, /*#__PURE__*/Deferred.make());
/** @internal */
const make = exports.make = /*#__PURE__*/Effect.fnUntraced(function* (process, options) {
  const fiber = yield* Effect.withFiberRuntime(Effect.succeed);
  const platform = yield* PlatformRunner;
  const closeLatch = yield* CloseLatch;
  const backing = yield* platform.start(closeLatch);
  const fiberMap = new Map();
  yield* Deferred.await(closeLatch).pipe(Effect.onExit(() => {
    fiber.currentScheduler.scheduleTask(() => {
      fiber.unsafeInterruptAsFork(fiber.id());
    }, 0);
    return Effect.void;
  }), Effect.forkScoped);
  yield* backing.run((portId, [id, kind, data, span]) => {
    if (kind === 1) {
      const fiber = fiberMap.get(id);
      if (!fiber) return Effect.void;
      return Fiber.interrupt(fiber);
    }
    return Effect.withFiberRuntime(fiber => {
      fiberMap.set(id, fiber);
      return options?.decode ? options.decode(data) : Effect.succeed(data);
    }).pipe(Effect.flatMap(input => {
      const collector = Transferable.unsafeMakeCollector();
      const stream = process(input);
      let effect = Effect.isEffect(stream) ? Effect.flatMap(stream, out => (0, _Function.pipe)(options?.encodeOutput ? Effect.provideService(options.encodeOutput(input, out), Transferable.Collector, collector) : Effect.succeed(out), Effect.flatMap(payload => backing.send(portId, [id, 0, [payload]], collector.unsafeRead())))) : (0, _Function.pipe)(stream, Stream.runForEachChunk(chunk => {
        if (options?.encodeOutput === undefined) {
          const payload = Chunk.toReadonlyArray(chunk);
          return backing.send(portId, [id, 0, payload]);
        }
        collector.unsafeClear();
        return (0, _Function.pipe)(Effect.forEach(chunk, data => options.encodeOutput(input, data)), Effect.provideService(Transferable.Collector, collector), Effect.flatMap(payload => backing.send(portId, [id, 0, payload], collector.unsafeRead())));
      }), Effect.andThen(backing.send(portId, [id, 1])));
      if (span) {
        effect = Effect.withParentSpan(effect, {
          _tag: "ExternalSpan",
          traceId: span[0],
          spanId: span[1],
          sampled: span[2],
          context: Context.empty()
        });
      }
      return Effect.uninterruptibleMask(restore => restore(effect).pipe(Effect.catchIf(_WorkerError.isWorkerError, error => backing.send(portId, [id, 3, _WorkerError.WorkerError.encodeCause(Cause.fail(error))])), Effect.catchAllCause(cause => Either.match(Cause.failureOrCause(cause), {
        onLeft: error => {
          collector.unsafeClear();
          return (0, _Function.pipe)(options?.encodeError ? Effect.provideService(options.encodeError(input, error), Transferable.Collector, collector) : Effect.succeed(error), Effect.flatMap(payload => backing.send(portId, [id, 2, payload], collector.unsafeRead())), Effect.catchAllCause(cause => backing.send(portId, [id, 3, _WorkerError.WorkerError.encodeCause(cause)])));
        },
        onRight: cause => backing.send(portId, [id, 3, _WorkerError.WorkerError.encodeCause(cause)])
      }))));
    }), Effect.ensuring(Effect.sync(() => fiberMap.delete(id))));
  });
});
/** @internal */
const layer = (process, options) => Layer.scopedDiscard(make(process, options)).pipe(Layer.provide(layerCloseLatch));
/** @internal */
exports.layer = layer;
const makeSerialized = (schema, handlers) => Effect.gen(function* () {
  const scope = yield* Effect.scope;
  let context = Context.empty();
  const parseRequest = Schema.decodeUnknown(schema);
  return yield* make(request => {
    const result = handlers[request._tag](request);
    if (Layer.isLayer(result)) {
      return Effect.flatMap(Layer.buildWithScope(result, scope), _ => Effect.sync(() => {
        context = Context.merge(context, _);
      }));
    } else if (Effect.isEffect(result)) {
      return Effect.provide(result, context);
    }
    return Stream.provideContext(result, context);
  }, {
    decode(message) {
      return Effect.mapError(parseRequest(message), cause => new _WorkerError.WorkerError({
        reason: "decode",
        cause
      }));
    },
    encodeError(request, message) {
      return Effect.mapError(Schema.serializeFailure(request, message), cause => new _WorkerError.WorkerError({
        reason: "encode",
        cause
      }));
    },
    encodeOutput(request, message) {
      return Effect.catchAllCause(Schema.serializeSuccess(request, message), cause => new _WorkerError.WorkerError({
        reason: "encode",
        cause
      }));
    }
  });
});
/** @internal */
exports.makeSerialized = makeSerialized;
const layerSerialized = (schema, handlers) => Layer.scopedDiscard(makeSerialized(schema, handlers)).pipe(Layer.provide(layerCloseLatch));
/** @internal */
exports.layerSerialized = layerSerialized;
const launch = layer => Effect.scopedWith(Effect.fnUntraced(function* (scope) {
  const context = yield* Layer.buildWithScope(Layer.provideMerge(layer, layerCloseLatch), scope);
  const closeLatch = Context.get(context, CloseLatch);
  return yield* Deferred.await(closeLatch);
}));
exports.launch = launch;
//# sourceMappingURL=workerRunner.js.map