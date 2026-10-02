"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MachineDefect = exports.MachineContext = exports.ActorTypeId = void 0;
Object.defineProperty(exports, "NoReply", {
  enumerable: true,
  get: function () {
    return Procedure.NoReply;
  }
});
exports.withTracingEnabled = exports.snapshot = exports.serializable = exports.retry = exports.restore = exports.procedures = exports.makeWith = exports.makeSerializable = exports.make = exports.currentTracingEnabled = exports.boot = exports.TypeId = exports.SerializableTypeId = void 0;
var Arr = _interopRequireWildcard(require("effect/Array"));
var Cause = _interopRequireWildcard(require("effect/Cause"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Fiber = _interopRequireWildcard(require("effect/Fiber"));
var FiberMap = _interopRequireWildcard(require("effect/FiberMap"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var FiberRefs = _interopRequireWildcard(require("effect/FiberRefs"));
var FiberSet = _interopRequireWildcard(require("effect/FiberSet"));
var _Function = require("effect/Function");
var _GlobalValue = require("effect/GlobalValue");
var Option = _interopRequireWildcard(require("effect/Option"));
var _Pipeable = require("effect/Pipeable");
var PubSub = _interopRequireWildcard(require("effect/PubSub"));
var Queue = _interopRequireWildcard(require("effect/Queue"));
var Readable = _interopRequireWildcard(require("effect/Readable"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var Subscribable = _interopRequireWildcard(require("effect/Subscribable"));
var Tracer = _interopRequireWildcard(require("effect/Tracer"));
var Procedure = _interopRequireWildcard(require("./Machine/Procedure.js"));
var _procedures = _interopRequireWildcard(require("./Machine/ProcedureList.js"));
exports.procedures = _procedures;
var _serializable = _interopRequireWildcard(require("./Machine/SerializableProcedureList.js"));
exports.serializable = _serializable;
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category procedures
 */

/**
 * @since 1.0.0
 * @category procedures
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine");
/**
 * @since 1.0.0
 * @category type ids
 */
const SerializableTypeId = exports.SerializableTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/Serializable");
/**
 * @since 1.0.0
 * @category type ids
 */
const ActorTypeId = exports.ActorTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/Actor");
/**
 * @since 1.0.0
 * @category errors
 */
class MachineDefect extends /*#__PURE__*/Schema.TaggedError()("MachineDefect", {
  cause: Schema.Defect
}) {
  /**
   * @since 1.0.0
   */
  static wrap(effect) {
    return Effect.catchAllCause(Effect.orDie(effect), cause => Effect.fail(new MachineDefect({
      cause: Cause.squash(cause)
    })));
  }
}
/**
 * @since 1.0.0
 * @category tags
 */
exports.MachineDefect = MachineDefect;
class MachineContext extends /*#__PURE__*/Context.Tag("@effect/experimental/Machine/Context")() {}
exports.MachineContext = MachineContext;
const ActorProto = {
  [ActorTypeId]: ActorTypeId,
  [Readable.TypeId]: Readable.TypeId,
  [Subscribable.TypeId]: Subscribable.TypeId,
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
};
/**
 * @since 1.0.0
 * @category constructors
 */
const make = initialize => ({
  [TypeId]: TypeId,
  initialize: Effect.isEffect(initialize) ? () => initialize : initialize,
  retryPolicy: undefined,
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
});
/**
 * @since 1.0.0
 * @category constructors
 */
exports.make = make;
const makeWith = () => make;
/**
 * @since 1.0.0
 * @category constructors
 */
exports.makeWith = makeWith;
const makeSerializable = (options, initialize) => ({
  [TypeId]: TypeId,
  [SerializableTypeId]: SerializableTypeId,
  initialize: Effect.isEffect(initialize) ? () => initialize : initialize,
  identifier: "SerializableMachine",
  retryPolicy: undefined,
  schemaInput: options.input,
  schemaState: options.state,
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
});
/**
 * @since 1.0.0
 * @category combinators
 */
exports.makeSerializable = makeSerializable;
const retry = exports.retry = /*#__PURE__*/(0, _Function.dual)(2, (self, retryPolicy) => ({
  ...self,
  retryPolicy
}));
/**
 * @since 1.0.0
 * @category tracing
 */
const currentTracingEnabled = exports.currentTracingEnabled = /*#__PURE__*/(0, _GlobalValue.globalValue)("@effect/experimental/Machine/currentTracingEnabled", () => FiberRef.unsafeMake(true));
/**
 * @since 1.0.0
 * @category tracing
 */
const withTracingEnabled = exports.withTracingEnabled = /*#__PURE__*/(0, _Function.dual)(2, (self, enabled) => Effect.locally(self, currentTracingEnabled, enabled));
/**
 * @since 1.0.0
 * @category runtime
 */
const boot = (self, ...[input, options]) => Effect.gen(function* () {
  const context = yield* Effect.context();
  const requests = yield* Queue.unbounded();
  const pubsub = yield* Effect.acquireRelease(PubSub.unbounded(), PubSub.shutdown);
  const latch = yield* Deferred.make();
  let currentState = undefined;
  let runState = {
    identifier: "Unknown",
    publicTags: new Set(),
    decodeRequest: undefined
  };
  const requestContext = request => Effect.sync(() => {
    const fiber = Option.getOrThrow(Fiber.getCurrentFiber());
    const fiberRefs = fiber.getFiberRefs();
    const context = FiberRefs.getOrDefault(fiberRefs, FiberRef.currentContext);
    const deferred = Deferred.unsafeMake(fiber.id());
    const span = context.unsafeMap.get(Tracer.ParentSpan.key);
    const addSpans = FiberRefs.getOrDefault(fiberRefs, currentTracingEnabled);
    return [request, deferred, span, addSpans];
  });
  const send = request => Effect.flatMap(requestContext(request), item => {
    if (!item[3]) {
      return Queue.offer(requests, item).pipe(Effect.zipRight(Deferred.await(item[1])), Effect.onInterrupt(() => Deferred.interrupt(item[1])));
    }
    const [, deferred, span] = item;
    return Effect.useSpan(`Machine.send ${request._tag}`, {
      parent: span,
      attributes: {
        "effect.machine": runState.identifier,
        ...request
      },
      kind: "client",
      captureStackTrace: false
    }, span => Queue.offer(requests, [request, deferred, span, true]).pipe(Effect.zipRight(Deferred.await(deferred)), Effect.onInterrupt(() => Deferred.interrupt(deferred))));
  });
  const sendIgnore = request => Effect.flatMap(requestContext(request), item => {
    if (!item[3]) {
      return Queue.offer(requests, item);
    }
    const [, deferred, span] = item;
    return Effect.useSpan(`Machine.sendIgnore ${request._tag}`, {
      parent: span,
      attributes: {
        "effect.machine": runState.identifier,
        ...request
      },
      kind: "client",
      captureStackTrace: false
    }, span => Queue.offer(requests, [request, deferred, span, true]));
  });
  const sendExternal = request => Effect.suspend(() => runState.publicTags.has(request._tag) ? send(request) : Effect.die(`Request ${request._tag} marked as internal`));
  const sendUnknown = u => Effect.suspend(() => runState.decodeRequest(u).pipe(Effect.flatMap(req => Effect.flatMap(Effect.exit(send(req)), exit => Schema.serializeExit(req, exit))), Effect.provide(context)));
  const publishState = newState => {
    if (currentState !== newState) {
      currentState = newState;
      return PubSub.publish(pubsub, newState);
    }
    return Effect.void;
  };
  const run = Effect.gen(function* () {
    const fiberSet = yield* FiberSet.make();
    const fiberMap = yield* FiberMap.make();
    const fork = effect => Effect.asVoid(FiberSet.run(fiberSet, MachineDefect.wrap(effect)));
    const forkWith = (0, _Function.dual)(2, (effect, state) => Effect.map(fork(effect), _ => [_, state]));
    const forkReplace = (0, _Function.dual)(2, (effect, id) => Effect.asVoid(FiberMap.run(fiberMap, id, MachineDefect.wrap(effect))));
    const forkReplaceWith = (0, _Function.dual)(3, (effect, id, state) => Effect.map(forkReplace(effect, id), _ => [_, state]));
    const forkOne = (0, _Function.dual)(2, (effect, id) => Effect.asVoid(FiberMap.run(fiberMap, id, MachineDefect.wrap(effect), {
      onlyIfMissing: true
    })));
    const forkOneWith = (0, _Function.dual)(3, (effect, id, state) => Effect.map(forkOne(effect, id), _ => [_, state]));
    const contextProto = {
      sendAwait: send,
      send: sendIgnore,
      unsafeSend: sendIgnore,
      unsafeSendAwait: send,
      fork,
      forkWith,
      forkOne,
      forkOneWith,
      forkReplace,
      forkReplaceWith
    };
    const procedures = yield* (0, _Function.pipe)(self.initialize(input, currentState ?? options?.previousState), Effect.provideService(MachineContext, contextProto));
    const procedureMap = Object.fromEntries(procedures.private.map(p => [p.tag, p]).concat(procedures.public.map(p => [p.tag, p])));
    runState = {
      identifier: procedures.identifier,
      publicTags: new Set(procedures.public.map(p => p.tag)),
      decodeRequest: Schema.decodeUnknown(Schema.Union(...Arr.filter(procedures.public, Procedure.isSerializable).map(p => p.schema)))
    };
    yield* publishState(procedures.initialState);
    yield* Deferred.succeed(latch, void 0);
    const process = (0, _Function.pipe)(Queue.take(requests), Effect.flatMap(([request, deferred, span, addSpan]) => Effect.flatMap(Deferred.isDone(deferred), done => {
      if (done) {
        return Effect.void;
      }
      const procedure = procedureMap[request._tag];
      if (procedure === undefined) {
        return Deferred.die(deferred, `Unknown request ${request._tag}`);
      }
      const context = Object.create(contextProto);
      context.state = currentState;
      context.request = request;
      context.deferred = deferred;
      let handler = Effect.matchCauseEffect(procedure.handler(context), {
        onFailure: e => {
          if (Cause.isFailure(e)) {
            return Deferred.failCause(deferred, e);
          }
          // defects kill the actor
          return Effect.zipRight(Deferred.failCause(deferred, e), Effect.failCause(e));
        },
        onSuccess: ([response, newState]) => {
          if (response === Procedure.NoReply) {
            return publishState(newState);
          }
          return Effect.zipRight(publishState(newState), Deferred.succeed(deferred, response));
        }
      });
      if (addSpan) {
        handler = Effect.withSpan(handler, `Machine.process ${request._tag}`, {
          kind: "server",
          parent: span,
          attributes: {
            "effect.machine": runState.identifier
          },
          captureStackTrace: false
        });
      } else if (span !== undefined) {
        handler = Effect.provideService(handler, Tracer.ParentSpan, span);
      }
      return handler;
    })), Effect.forever, Effect.provideService(MachineContext, contextProto));
    yield* (0, _Function.pipe)(Effect.all([process, FiberSet.join(fiberSet), FiberMap.join(fiberMap)], {
      concurrency: "unbounded",
      discard: true
    }), Effect.onExit(exit => {
      if (exit._tag === "Success") return Effect.die("absurd");
      return Effect.flatMap(Queue.takeAll(requests), Effect.forEach(([, deferred]) => Deferred.failCause(deferred, exit.cause)));
    }), Effect.tapErrorCause(cause => FiberRef.getWith(FiberRef.unhandledErrorLogLevel, Option.match({
      onNone: () => Effect.void,
      onSome: level => Effect.log(`Unhandled Machine (${runState.identifier}) failure`, cause).pipe(Effect.locally(FiberRef.currentLogLevel, level))
    }))), Effect.catchAllDefect(cause => Effect.fail(new MachineDefect({
      cause
    }))));
  }).pipe(Effect.scoped);
  const fiber = yield* (0, _Function.pipe)(run, self.retryPolicy ? Effect.retry(self.retryPolicy) : _Function.identity, Effect.forkScoped, Effect.interruptible);
  yield* Deferred.await(latch);
  return (0, _Function.identity)(Object.assign(Object.create(ActorProto), {
    machine: self,
    input: input,
    get: Effect.sync(() => currentState),
    changes: Stream.concat(Stream.sync(() => currentState), Stream.fromPubSub(pubsub)),
    send: sendExternal,
    sendUnknown,
    join: Fiber.join(fiber)
  }));
});
/**
 * @since 1.0.0
 * @category runtime
 */
exports.boot = boot;
const snapshot = self => Effect.zip(Schema.encode(self.machine.schemaInput)(self.input), Effect.flatMap(self.get, Schema.encode(self.machine.schemaState)));
/**
 * @since 1.0.0
 * @category runtime
 */
exports.snapshot = snapshot;
const restore = (self, snapshot) => Effect.flatMap(Schema.decodeUnknown(Schema.Tuple(self.schemaInput, self.schemaState))(snapshot), ([input, previousState]) => boot(self, input, {
  previousState
}));
exports.restore = restore;
//# sourceMappingURL=Machine.js.map