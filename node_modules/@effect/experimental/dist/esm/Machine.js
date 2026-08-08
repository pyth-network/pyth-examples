/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as FiberMap from "effect/FiberMap";
import * as FiberRef from "effect/FiberRef";
import * as FiberRefs from "effect/FiberRefs";
import * as FiberSet from "effect/FiberSet";
import { dual, identity, pipe } from "effect/Function";
import { globalValue } from "effect/GlobalValue";
import * as Option from "effect/Option";
import { pipeArguments } from "effect/Pipeable";
import * as PubSub from "effect/PubSub";
import * as Queue from "effect/Queue";
import * as Readable from "effect/Readable";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Subscribable from "effect/Subscribable";
import * as Tracer from "effect/Tracer";
import * as Procedure from "./Machine/Procedure.js";
/**
 * @since 1.0.0
 * @category procedures
 */
export * as procedures from "./Machine/ProcedureList.js";
/**
 * @since 1.0.0
 * @category procedures
 */
export * as serializable from "./Machine/SerializableProcedureList.js";
export {
/**
 * @since 1.0.0
 * @category symbols
 */
NoReply } from "./Machine/Procedure.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine");
/**
 * @since 1.0.0
 * @category type ids
 */
export const SerializableTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/Serializable");
/**
 * @since 1.0.0
 * @category type ids
 */
export const ActorTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/Actor");
/**
 * @since 1.0.0
 * @category errors
 */
export class MachineDefect extends /*#__PURE__*/Schema.TaggedError()("MachineDefect", {
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
export class MachineContext extends /*#__PURE__*/Context.Tag("@effect/experimental/Machine/Context")() {}
const ActorProto = {
  [ActorTypeId]: ActorTypeId,
  [Readable.TypeId]: Readable.TypeId,
  [Subscribable.TypeId]: Subscribable.TypeId,
  pipe() {
    return pipeArguments(this, arguments);
  }
};
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = initialize => ({
  [TypeId]: TypeId,
  initialize: Effect.isEffect(initialize) ? () => initialize : initialize,
  retryPolicy: undefined,
  pipe() {
    return pipeArguments(this, arguments);
  }
});
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWith = () => make;
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerializable = (options, initialize) => ({
  [TypeId]: TypeId,
  [SerializableTypeId]: SerializableTypeId,
  initialize: Effect.isEffect(initialize) ? () => initialize : initialize,
  identifier: "SerializableMachine",
  retryPolicy: undefined,
  schemaInput: options.input,
  schemaState: options.state,
  pipe() {
    return pipeArguments(this, arguments);
  }
});
/**
 * @since 1.0.0
 * @category combinators
 */
export const retry = /*#__PURE__*/dual(2, (self, retryPolicy) => ({
  ...self,
  retryPolicy
}));
/**
 * @since 1.0.0
 * @category tracing
 */
export const currentTracingEnabled = /*#__PURE__*/globalValue("@effect/experimental/Machine/currentTracingEnabled", () => FiberRef.unsafeMake(true));
/**
 * @since 1.0.0
 * @category tracing
 */
export const withTracingEnabled = /*#__PURE__*/dual(2, (self, enabled) => Effect.locally(self, currentTracingEnabled, enabled));
/**
 * @since 1.0.0
 * @category runtime
 */
export const boot = (self, ...[input, options]) => Effect.gen(function* () {
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
    const forkWith = dual(2, (effect, state) => Effect.map(fork(effect), _ => [_, state]));
    const forkReplace = dual(2, (effect, id) => Effect.asVoid(FiberMap.run(fiberMap, id, MachineDefect.wrap(effect))));
    const forkReplaceWith = dual(3, (effect, id, state) => Effect.map(forkReplace(effect, id), _ => [_, state]));
    const forkOne = dual(2, (effect, id) => Effect.asVoid(FiberMap.run(fiberMap, id, MachineDefect.wrap(effect), {
      onlyIfMissing: true
    })));
    const forkOneWith = dual(3, (effect, id, state) => Effect.map(forkOne(effect, id), _ => [_, state]));
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
    const procedures = yield* pipe(self.initialize(input, currentState ?? options?.previousState), Effect.provideService(MachineContext, contextProto));
    const procedureMap = Object.fromEntries(procedures.private.map(p => [p.tag, p]).concat(procedures.public.map(p => [p.tag, p])));
    runState = {
      identifier: procedures.identifier,
      publicTags: new Set(procedures.public.map(p => p.tag)),
      decodeRequest: Schema.decodeUnknown(Schema.Union(...Arr.filter(procedures.public, Procedure.isSerializable).map(p => p.schema)))
    };
    yield* publishState(procedures.initialState);
    yield* Deferred.succeed(latch, void 0);
    const process = pipe(Queue.take(requests), Effect.flatMap(([request, deferred, span, addSpan]) => Effect.flatMap(Deferred.isDone(deferred), done => {
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
    yield* pipe(Effect.all([process, FiberSet.join(fiberSet), FiberMap.join(fiberMap)], {
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
  const fiber = yield* pipe(run, self.retryPolicy ? Effect.retry(self.retryPolicy) : identity, Effect.forkScoped, Effect.interruptible);
  yield* Deferred.await(latch);
  return identity(Object.assign(Object.create(ActorProto), {
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
export const snapshot = self => Effect.zip(Schema.encode(self.machine.schemaInput)(self.input), Effect.flatMap(self.get, Schema.encode(self.machine.schemaState)));
/**
 * @since 1.0.0
 * @category runtime
 */
export const restore = (self, snapshot) => Effect.flatMap(Schema.decodeUnknown(Schema.Tuple(self.schemaInput, self.schemaState))(snapshot), ([input, previousState]) => boot(self, input, {
  previousState
}));
//# sourceMappingURL=Machine.js.map