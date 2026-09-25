/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as ExecutionStrategy from "effect/ExecutionStrategy";
import * as Exit from "effect/Exit";
import * as FiberRef from "effect/FiberRef";
import * as FiberSet from "effect/FiberSet";
import { dual } from "effect/Function";
import { globalValue } from "effect/GlobalValue";
import * as Layer from "effect/Layer";
import * as Mailbox from "effect/Mailbox";
import * as Predicate from "effect/Predicate";
import * as Scope from "effect/Scope";
import { TypeIdError } from "./Error.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/Socket");
/**
 * @since 1.0.0
 * @category guards
 */
export const isSocket = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category tags
 */
export const Socket = /*#__PURE__*/Context.GenericTag("@effect/platform/Socket");
/**
 * @since 1.0.0
 * @category type ids
 */
export const CloseEventTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Socket/CloseEvent");
/**
 * @since 1.0.0
 * @category models
 */
export class CloseEvent {
  code;
  reason;
  /**
   * @since 1.0.0
   */
  [CloseEventTypeId];
  constructor(code = 1000, reason) {
    this.code = code;
    this.reason = reason;
    this[CloseEventTypeId] = CloseEventTypeId;
  }
  /**
   * @since 1.0.0
   */
  toString() {
    return this.reason ? `${this.code}: ${this.reason}` : `${this.code}`;
  }
}
/**
 * @since 1.0.0
 * @category refinements
 */
export const isCloseEvent = u => Predicate.hasProperty(u, CloseEventTypeId);
/**
 * @since 1.0.0
 * @category type ids
 */
export const SocketErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Socket/SocketError");
/**
 * @since 1.0.0
 * @category refinements
 */
export const isSocketError = u => Predicate.hasProperty(u, SocketErrorTypeId);
/**
 * @since 1.0.0
 * @category errors
 */
export class SocketGenericError extends /*#__PURE__*/TypeIdError(SocketErrorTypeId, "SocketError") {
  get message() {
    return `An error occurred during ${this.reason}`;
  }
}
/**
 * @since 1.0.0
 * @category errors
 */
export class SocketCloseError extends /*#__PURE__*/TypeIdError(SocketErrorTypeId, "SocketError") {
  /**
   * @since 1.0.0
   */
  static is(u) {
    return isSocketError(u) && u.reason === "Close";
  }
  /**
   * @since 1.0.0
   */
  static isClean(isClean) {
    return function (u) {
      return SocketCloseError.is(u) && isClean(u.code);
    };
  }
  get message() {
    if (this.closeReason) {
      return `${this.reason}: ${this.code}: ${this.closeReason}`;
    }
    return `${this.reason}: ${this.code}`;
  }
}
/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannelMap = (self, f) => Effect.gen(function* () {
  const scope = yield* Effect.scope;
  const mailbox = yield* Mailbox.make();
  const writeScope = yield* Scope.fork(scope, ExecutionStrategy.sequential);
  const write = yield* Scope.extend(self.writer, writeScope);
  function* emit(chunk) {
    for (const data of chunk) {
      yield* write(data);
    }
  }
  const input = {
    awaitRead: () => Effect.void,
    emit(chunk) {
      return Effect.catchAllCause(Effect.gen(() => emit(chunk)), cause => mailbox.failCause(cause));
    },
    error(error) {
      return Effect.zipRight(Scope.close(writeScope, Exit.void), mailbox.failCause(error));
    },
    done() {
      return Scope.close(writeScope, Exit.void);
    }
  };
  yield* self.runRaw(data => {
    mailbox.unsafeOffer(f(data));
  }).pipe(Mailbox.into(mailbox), Effect.forkIn(scope), Effect.interruptible);
  return Channel.embedInput(Mailbox.toChannel(mailbox), input);
}).pipe(Channel.unwrapScoped);
/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannel = self => {
  const encoder = new TextEncoder();
  return toChannelMap(self, data => typeof data === "string" ? encoder.encode(data) : data);
};
/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannelString = /*#__PURE__*/dual(args => isSocket(args[0]), (self, encoding) => {
  const decoder = new TextDecoder(encoding);
  return toChannelMap(self, data => typeof data === "string" ? data : decoder.decode(data));
});
/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannelWith = () => self => toChannel(self);
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeChannel = () => Channel.unwrap(Effect.map(Socket, toChannelWith()));
/**
 * @since 1.0.0
 */
export const defaultCloseCodeIsError = code => code !== 1000 && code !== 1006;
/**
 * @since 1.0.0
 * @category tags
 */
export const WebSocket = /*#__PURE__*/Context.GenericTag("@effect/platform/Socket/WebSocket");
/**
 * @since 1.0.0
 * @category tags
 */
export const WebSocketConstructor = /*#__PURE__*/Context.GenericTag("@effect/platform/Socket/WebSocketConstructor");
/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocketConstructorGlobal = /*#__PURE__*/Layer.succeed(WebSocketConstructor, (url, protocols) => new globalThis.WebSocket(url, protocols));
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket = (url, options) => fromWebSocket(Effect.acquireRelease((typeof url === "string" ? Effect.succeed(url) : url).pipe(Effect.flatMap(url => Effect.map(WebSocketConstructor, f => f(url, options?.protocols)))), ws => Effect.sync(() => ws.close(1000))), options);
/**
 * @since 1.0.0
 * @category constructors
 */
export const fromWebSocket = (acquire, options) => Effect.withFiberRuntime(fiber => {
  let currentWS;
  const latch = Effect.unsafeMakeLatch(false);
  const acquireContext = fiber.currentContext;
  const closeCodeIsError = options?.closeCodeIsError ?? defaultCloseCodeIsError;
  const runRaw = (handler, opts) => Effect.scopedWith(Effect.fnUntraced(function* (scope) {
    const fiberSet = yield* FiberSet.make().pipe(Scope.extend(scope));
    const ws = yield* Scope.extend(acquire, scope);
    const run = yield* Effect.provideService(FiberSet.runtime(fiberSet)(), WebSocket, ws);
    let open = false;
    function onMessage(event) {
      if (event.data instanceof Blob) {
        return Effect.promise(() => event.data.arrayBuffer()).pipe(Effect.andThen(buffer => handler(new Uint8Array(buffer))), run);
      }
      const result = handler(event.data);
      if (Effect.isEffect(result)) {
        run(result);
      }
    }
    function onError(cause) {
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("close", onClose);
      Deferred.unsafeDone(fiberSet.deferred, Effect.fail(new SocketGenericError({
        reason: open ? "Read" : "Open",
        cause
      })));
    }
    function onClose(event) {
      ws.removeEventListener("message", onMessage);
      ws.removeEventListener("error", onError);
      Deferred.unsafeDone(fiberSet.deferred, Effect.fail(new SocketCloseError({
        reason: "Close",
        code: event.code,
        closeReason: event.reason
      })));
    }
    ws.addEventListener("close", onClose, {
      once: true
    });
    ws.addEventListener("error", onError, {
      once: true
    });
    ws.addEventListener("message", onMessage);
    if (ws.readyState !== 1) {
      const openDeferred = Deferred.unsafeMake(fiber.id());
      ws.addEventListener("open", () => {
        open = true;
        Deferred.unsafeDone(openDeferred, Effect.void);
      }, {
        once: true
      });
      yield* Deferred.await(openDeferred).pipe(Effect.timeoutFail({
        duration: options?.openTimeout ?? 10000,
        onTimeout: () => new SocketGenericError({
          reason: "OpenTimeout",
          cause: "timeout waiting for \"open\""
        })
      }), Effect.raceFirst(FiberSet.join(fiberSet)));
    }
    open = true;
    currentWS = ws;
    yield* latch.open;
    if (opts?.onOpen) yield* opts.onOpen;
    return yield* FiberSet.join(fiberSet).pipe(Effect.catchIf(SocketCloseError.isClean(_ => !closeCodeIsError(_)), _ => Effect.void));
  })).pipe(Effect.mapInputContext(input => Context.merge(acquireContext, input)), Effect.ensuring(Effect.sync(() => {
    latch.unsafeClose();
    currentWS = undefined;
  })), Effect.interruptible);
  const encoder = new TextEncoder();
  const run = (handler, opts) => runRaw(data => typeof data === "string" ? handler(encoder.encode(data)) : data instanceof Uint8Array ? handler(data) : handler(new Uint8Array(data)), opts);
  const write = chunk => latch.whenOpen(Effect.sync(() => {
    const ws = currentWS;
    if (isCloseEvent(chunk)) {
      ws.close(chunk.code, chunk.reason);
    } else {
      ws.send(chunk);
    }
  }));
  const writer = Effect.succeed(write);
  return Effect.succeed(Socket.of({
    [TypeId]: TypeId,
    run,
    runRaw,
    writer
  }));
});
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocketChannel = (url, options) => Channel.unwrapScoped(Effect.map(makeWebSocket(url, options), toChannelWith()));
/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (url, options) => Layer.effect(Socket, makeWebSocket(url, options));
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentSendQueueCapacity = /*#__PURE__*/globalValue("@effect/platform/Socket/currentSendQueueCapacity", () => FiberRef.unsafeMake(16));
/**
 * @since 1.0.0
 * @category constructors
 */
export const fromTransformStream = (acquire, options) => Effect.withFiberRuntime(fiber => {
  const latch = Effect.unsafeMakeLatch(false);
  let currentStream;
  const acquireContext = fiber.currentContext;
  const closeCodeIsError = options?.closeCodeIsError ?? defaultCloseCodeIsError;
  const runRaw = (handler, opts) => Effect.scopedWith(Effect.fnUntraced(function* (scope) {
    const stream = yield* Scope.extend(acquire, scope);
    const reader = stream.readable.getReader();
    yield* Scope.addFinalizer(scope, Effect.promise(() => reader.cancel()));
    const fiberSet = yield* FiberSet.make().pipe(Scope.extend(scope));
    const runFork = yield* FiberSet.runtime(fiberSet)();
    yield* Effect.tryPromise({
      try: async () => {
        while (true) {
          const {
            done,
            value
          } = await reader.read();
          if (done) {
            throw new SocketCloseError({
              reason: "Close",
              code: 1000
            });
          }
          const result = handler(value);
          if (Effect.isEffect(result)) {
            runFork(result);
          }
        }
      },
      catch: cause => isSocketError(cause) ? cause : new SocketGenericError({
        reason: "Read",
        cause
      })
    }).pipe(FiberSet.run(fiberSet));
    currentStream = {
      stream,
      fiberSet
    };
    yield* latch.open;
    if (opts?.onOpen) yield* opts.onOpen;
    return yield* FiberSet.join(fiberSet).pipe(Effect.catchIf(SocketCloseError.isClean(_ => !closeCodeIsError(_)), _ => Effect.void));
  })).pipe(_ => _, Effect.mapInputContext(input => Context.merge(acquireContext, input)), Effect.ensuring(Effect.sync(() => {
    latch.unsafeClose();
    currentStream = undefined;
  })), Effect.interruptible);
  const encoder = new TextEncoder();
  const run = (handler, opts) => runRaw(data => typeof data === "string" ? handler(encoder.encode(data)) : handler(data), opts);
  const writers = new WeakMap();
  const getWriter = stream => {
    let writer = writers.get(stream);
    if (!writer) {
      writer = stream.writable.getWriter();
      writers.set(stream, writer);
    }
    return writer;
  };
  const write = chunk => latch.whenOpen(Effect.suspend(() => {
    const {
      fiberSet,
      stream
    } = currentStream;
    if (isCloseEvent(chunk)) {
      return Deferred.fail(fiberSet.deferred, new SocketCloseError({
        reason: "Close",
        code: chunk.code,
        closeReason: chunk.reason
      }));
    }
    return Effect.promise(() => getWriter(stream).write(typeof chunk === "string" ? encoder.encode(chunk) : chunk));
  }));
  const writer = Effect.acquireRelease(Effect.succeed(write), () => Effect.promise(async () => {
    if (!currentStream) return;
    await getWriter(currentStream.stream).close();
  }));
  return Effect.succeed(Socket.of({
    [TypeId]: TypeId,
    run,
    runRaw,
    writer
  }));
});
//# sourceMappingURL=Socket.js.map