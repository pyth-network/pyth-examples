"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeSerialized = exports.makePoolSerializedLayer = exports.makePoolSerialized = exports.makePoolLayer = exports.makePool = exports.makePlatform = exports.makeManager = exports.layerSpawner = exports.layerManager = exports.WorkerManagerTypeId = exports.WorkerManager = exports.Spawner = exports.PlatformWorkerTypeId = exports.PlatformWorker = void 0;
var Channel = _interopRequireWildcard(require("effect/Channel"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Exit = _interopRequireWildcard(require("effect/Exit"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var FiberSet = _interopRequireWildcard(require("effect/FiberSet"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Mailbox = _interopRequireWildcard(require("effect/Mailbox"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Pool = _interopRequireWildcard(require("effect/Pool"));
var Runtime = _interopRequireWildcard(require("effect/Runtime"));
var Schedule = _interopRequireWildcard(require("effect/Schedule"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Scope = _interopRequireWildcard(require("effect/Scope"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var Tracer = _interopRequireWildcard(require("effect/Tracer"));
var Transferable = _interopRequireWildcard(require("../Transferable.js"));
var _WorkerError = require("../WorkerError.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const PlatformWorkerTypeId = exports.PlatformWorkerTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Worker/PlatformWorker");
/** @internal */
const PlatformWorker = exports.PlatformWorker = /*#__PURE__*/Context.GenericTag("@effect/platform/Worker/PlatformWorker");
/** @internal */
const WorkerManagerTypeId = exports.WorkerManagerTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Worker/WorkerManager");
/** @internal */
const WorkerManager = exports.WorkerManager = /*#__PURE__*/Context.GenericTag("@effect/platform/Worker/WorkerManager");
/** @internal */
const Spawner = exports.Spawner = /*#__PURE__*/Context.GenericTag("@effect/platform/Worker/Spawner");
/** @internal */
const makeManager = exports.makeManager = /*#__PURE__*/Effect.gen(function* () {
  const platform = yield* PlatformWorker;
  let idCounter = 0;
  return WorkerManager.of({
    [WorkerManagerTypeId]: WorkerManagerTypeId,
    spawn({
      encode,
      initialMessage
    }) {
      return Effect.gen(function* () {
        const id = idCounter++;
        let requestIdCounter = 0;
        const requestMap = new Map();
        const collector = Transferable.unsafeMakeCollector();
        const wrappedEncode = encode ? message => Effect.zipRight(collector.clear, Effect.provideService(encode(message), Transferable.Collector, collector)) : Effect.succeed;
        const readyLatch = yield* Deferred.make();
        const backing = yield* platform.spawn(id);
        yield* backing.run(message => {
          if (message[0] === 0) {
            return Deferred.complete(readyLatch, Effect.void);
          }
          return handleMessage(message[1]);
        }).pipe(Effect.onError(cause => Effect.forEach(requestMap.values(), mailbox => Deferred.DeferredTypeId in mailbox ? Deferred.failCause(mailbox, cause) : mailbox.failCause(cause))), Effect.tapErrorCause(Effect.logWarning), Effect.retry(Schedule.spaced(1000)), Effect.annotateLogs({
          package: "@effect/platform",
          module: "Worker"
        }), Effect.interruptible, Effect.forkScoped);
        yield* Effect.addFinalizer(() => Effect.zipRight(Effect.forEach(requestMap.values(), mailbox => Deferred.DeferredTypeId in mailbox ? Deferred.interrupt(mailbox) : mailbox.end, {
          discard: true
        }), Effect.sync(() => requestMap.clear())));
        const handleMessage = response => Effect.suspend(() => {
          const mailbox = requestMap.get(response[0]);
          if (!mailbox) return Effect.void;
          switch (response[1]) {
            // data
            case 0:
              {
                return Deferred.DeferredTypeId in mailbox ? Deferred.succeed(mailbox, response[2][0]) : mailbox.offerAll(response[2]);
              }
            // end
            case 1:
              {
                if (response.length === 2) {
                  return Deferred.DeferredTypeId in mailbox ? Deferred.interrupt(mailbox) : mailbox.end;
                }
                return Deferred.DeferredTypeId in mailbox ? Deferred.succeed(mailbox, response[2][0]) : Effect.zipRight(mailbox.offerAll(response[2]), mailbox.end);
              }
            // error / defect
            case 2:
            case 3:
              {
                if (response[1] === 2) {
                  return Deferred.DeferredTypeId in mailbox ? Deferred.fail(mailbox, response[2]) : mailbox.fail(response[2]);
                }
                const cause = _WorkerError.WorkerError.decodeCause(response[2]);
                return Deferred.DeferredTypeId in mailbox ? Deferred.failCause(mailbox, cause) : mailbox.failCause(cause);
              }
          }
        });
        const executeAcquire = (request, makeMailbox) => Effect.withFiberRuntime(fiber => {
          const context = fiber.getFiberRef(FiberRef.currentContext);
          const span = Context.getOption(context, Tracer.ParentSpan).pipe(Option.filter(span => span._tag === "Span"));
          const id = requestIdCounter++;
          return makeMailbox.pipe(Effect.tap(mailbox => {
            requestMap.set(id, mailbox);
            return wrappedEncode(request).pipe(Effect.tap(payload => backing.send([id, 0, payload, span._tag === "Some" ? [span.value.traceId, span.value.spanId, span.value.sampled] : undefined], collector.unsafeRead())), Effect.catchAllCause(cause => Mailbox.isMailbox(mailbox) ? mailbox.failCause(cause) : Deferred.failCause(mailbox, cause)));
          }), Effect.map(mailbox => ({
            id,
            mailbox
          })));
        });
        const executeRelease = ({
          id
        }, exit) => {
          const release = Effect.sync(() => requestMap.delete(id));
          return Exit.isFailure(exit) ? Effect.zipRight(Effect.orDie(backing.send([id, 1])), release) : release;
        };
        const execute = request => Stream.fromChannel(Channel.acquireUseRelease(executeAcquire(request, Mailbox.make()), ({
          mailbox
        }) => Mailbox.toChannel(mailbox), executeRelease));
        const executeEffect = request => Effect.acquireUseRelease(executeAcquire(request, Deferred.make()), ({
          mailbox
        }) => Deferred.await(mailbox), executeRelease);
        yield* Deferred.await(readyLatch);
        if (initialMessage) {
          yield* Effect.sync(initialMessage).pipe(Effect.flatMap(executeEffect), Effect.mapError(cause => new _WorkerError.WorkerError({
            reason: "spawn",
            cause
          })));
        }
        return {
          id,
          execute,
          executeEffect
        };
      });
    }
  });
});
/** @internal */
const layerManager = exports.layerManager = /*#__PURE__*/Layer.effect(WorkerManager, makeManager);
/** @internal */
const makePool = options => Effect.gen(function* () {
  const manager = yield* WorkerManager;
  const workers = new Set();
  const acquire = (0, _Function.pipe)(manager.spawn(options), Effect.tap(worker => Effect.acquireRelease(Effect.sync(() => workers.add(worker)), () => Effect.sync(() => workers.delete(worker)))), options.onCreate ? Effect.tap(options.onCreate) : _Function.identity);
  const backing = "minSize" in options ? yield* Pool.makeWithTTL({
    acquire,
    min: options.minSize,
    max: options.maxSize,
    concurrency: options.concurrency,
    targetUtilization: options.targetUtilization,
    timeToLive: options.timeToLive
  }) : yield* Pool.make({
    acquire,
    size: options.size,
    concurrency: options.concurrency,
    targetUtilization: options.targetUtilization
  });
  const pool = {
    backing,
    broadcast: message => Effect.forEach(workers, worker => worker.executeEffect(message), {
      concurrency: "unbounded",
      discard: true
    }),
    execute: message => Stream.unwrapScoped(Effect.map(backing.get, worker => worker.execute(message))),
    executeEffect: message => Effect.scoped(Effect.flatMap(backing.get, worker => worker.executeEffect(message)))
  };
  // report any spawn errors
  yield* Effect.scoped(backing.get);
  return pool;
});
/** @internal */
exports.makePool = makePool;
const makePoolLayer = (tag, options) => Layer.scoped(tag, makePool(options));
/** @internal */
exports.makePoolLayer = makePoolLayer;
const makeSerialized = options => Effect.gen(function* () {
  const manager = yield* WorkerManager;
  const backing = yield* manager.spawn({
    ...options,
    encode(message) {
      return Effect.mapError(Schema.serialize(message), cause => new _WorkerError.WorkerError({
        reason: "encode",
        cause
      }));
    }
  });
  const execute = message => {
    const parseSuccess = Schema.decode(Schema.successSchema(message));
    const parseFailure = Schema.decode(Schema.failureSchema(message));
    return (0, _Function.pipe)(backing.execute(message), Stream.catchAll(error => Effect.flatMap(parseFailure(error), Effect.fail)), Stream.mapEffect(parseSuccess));
  };
  const executeEffect = message => {
    const parseSuccess = Schema.decode(Schema.successSchema(message));
    const parseFailure = Schema.decode(Schema.failureSchema(message));
    return Effect.matchEffect(backing.executeEffect(message), {
      onFailure: error => Effect.flatMap(parseFailure(error), Effect.fail),
      onSuccess: parseSuccess
    });
  };
  return (0, _Function.identity)({
    id: backing.id,
    execute: execute,
    executeEffect: executeEffect
  });
});
/** @internal */
exports.makeSerialized = makeSerialized;
const makePoolSerialized = options => Effect.gen(function* () {
  const manager = yield* WorkerManager;
  const workers = new Set();
  const acquire = (0, _Function.pipe)(makeSerialized(options), Effect.tap(worker => Effect.sync(() => workers.add(worker))), Effect.tap(worker => Effect.addFinalizer(() => Effect.sync(() => workers.delete(worker)))), options.onCreate ? Effect.tap(options.onCreate) : _Function.identity, Effect.provideService(WorkerManager, manager));
  const backing = yield* "timeToLive" in options ? Pool.makeWithTTL({
    acquire,
    min: options.minSize,
    max: options.maxSize,
    concurrency: options.concurrency,
    targetUtilization: options.targetUtilization,
    timeToLive: options.timeToLive
  }) : Pool.make({
    acquire,
    size: options.size,
    concurrency: options.concurrency,
    targetUtilization: options.targetUtilization
  });
  const pool = {
    backing,
    broadcast: message => Effect.forEach(workers, worker => worker.executeEffect(message), {
      concurrency: "unbounded",
      discard: true
    }),
    execute: message => Stream.unwrapScoped(Effect.map(backing.get, worker => worker.execute(message))),
    executeEffect: message => Effect.scoped(Effect.flatMap(backing.get, worker => worker.executeEffect(message)))
  };
  // report any spawn errors
  yield* Effect.scoped(backing.get);
  return pool;
});
/** @internal */
exports.makePoolSerialized = makePoolSerialized;
const makePoolSerializedLayer = (tag, options) => Layer.scoped(tag, makePoolSerialized(options));
/** @internal */
exports.makePoolSerializedLayer = makePoolSerializedLayer;
const layerSpawner = spawner => Layer.succeed(Spawner, spawner);
/** @internal */
exports.layerSpawner = layerSpawner;
const makePlatform = () => options => PlatformWorker.of({
  [PlatformWorkerTypeId]: PlatformWorkerTypeId,
  spawn(id) {
    return Effect.gen(function* () {
      const spawn = yield* Spawner;
      let currentPort;
      const buffer = [];
      const run = handler => Effect.uninterruptibleMask(restore => Effect.gen(function* () {
        const scope = yield* Effect.scope;
        const port = yield* options.setup({
          worker: spawn(id),
          scope
        });
        currentPort = port;
        yield* Scope.addFinalizer(scope, Effect.sync(() => {
          currentPort = undefined;
        }));
        const runtime = (yield* Effect.runtime()).pipe(Runtime.updateContext(Context.omit(Scope.Scope)));
        const fiberSet = yield* FiberSet.make();
        const runFork = Runtime.runFork(runtime);
        yield* options.listen({
          port,
          scope,
          emit(data) {
            FiberSet.unsafeAdd(fiberSet, runFork(handler(data)));
          },
          deferred: fiberSet.deferred
        });
        if (buffer.length > 0) {
          for (const [message, transfers] of buffer) {
            port.postMessage([0, message], transfers);
          }
          buffer.length = 0;
        }
        return yield* restore(FiberSet.join(fiberSet));
      }).pipe(Effect.scoped));
      const send = (message, transfers) => Effect.try({
        try: () => {
          if (currentPort === undefined) {
            buffer.push([message, transfers]);
          } else {
            currentPort.postMessage([0, message], transfers);
          }
        },
        catch: cause => new _WorkerError.WorkerError({
          reason: "send",
          cause
        })
      });
      return {
        run,
        send
      };
    });
  }
});
exports.makePlatform = makePlatform;
//# sourceMappingURL=worker.js.map