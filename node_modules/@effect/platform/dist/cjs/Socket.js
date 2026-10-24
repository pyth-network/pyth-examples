"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toChannelWith = exports.toChannelString = exports.toChannelMap = exports.toChannel = exports.makeWebSocketChannel = exports.makeWebSocket = exports.makeChannel = exports.layerWebSocketConstructorGlobal = exports.layerWebSocket = exports.isSocketError = exports.isSocket = exports.isCloseEvent = exports.fromWebSocket = exports.fromTransformStream = exports.defaultCloseCodeIsError = exports.currentSendQueueCapacity = exports.WebSocketConstructor = exports.WebSocket = exports.TypeId = exports.SocketGenericError = exports.SocketErrorTypeId = exports.SocketCloseError = exports.Socket = exports.CloseEventTypeId = exports.CloseEvent = void 0;
var Channel = _interopRequireWildcard(require("effect/Channel"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var ExecutionStrategy = _interopRequireWildcard(require("effect/ExecutionStrategy"));
var Exit = _interopRequireWildcard(require("effect/Exit"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var FiberSet = _interopRequireWildcard(require("effect/FiberSet"));
var _Function = require("effect/Function");
var _GlobalValue = require("effect/GlobalValue");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Mailbox = _interopRequireWildcard(require("effect/Mailbox"));
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Scope = _interopRequireWildcard(require("effect/Scope"));
var _Error = require("./Error.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/Socket");
/**
 * @since 1.0.0
 * @category guards
 */
const isSocket = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category tags
 */
exports.isSocket = isSocket;
const Socket = exports.Socket = /*#__PURE__*/Context.GenericTag("@effect/platform/Socket");
/**
 * @since 1.0.0
 * @category type ids
 */
const CloseEventTypeId = exports.CloseEventTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Socket/CloseEvent");
/**
 * @since 1.0.0
 * @category models
 */
class CloseEvent {
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
exports.CloseEvent = CloseEvent;
const isCloseEvent = u => Predicate.hasProperty(u, CloseEventTypeId);
/**
 * @since 1.0.0
 * @category type ids
 */
exports.isCloseEvent = isCloseEvent;
const SocketErrorTypeId = exports.SocketErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Socket/SocketError");
/**
 * @since 1.0.0
 * @category refinements
 */
const isSocketError = u => Predicate.hasProperty(u, SocketErrorTypeId);
/**
 * @since 1.0.0
 * @category errors
 */
exports.isSocketError = isSocketError;
class SocketGenericError extends /*#__PURE__*/(0, _Error.TypeIdError)(SocketErrorTypeId, "SocketError") {
  get message() {
    return `An error occurred during ${this.reason}`;
  }
}
/**
 * @since 1.0.0
 * @category errors
 */
exports.SocketGenericError = SocketGenericError;
class SocketCloseError extends /*#__PURE__*/(0, _Error.TypeIdError)(SocketErrorTypeId, "SocketError") {
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
exports.SocketCloseError = SocketCloseError;
const toChannelMap = (self, f) => Effect.gen(function* () {
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
exports.toChannelMap = toChannelMap;
const toChannel = self => {
  const encoder = new TextEncoder();
  return toChannelMap(self, data => typeof data === "string" ? encoder.encode(data) : data);
};
/**
 * @since 1.0.0
 * @category combinators
 */
exports.toChannel = toChannel;
const toChannelString = exports.toChannelString = /*#__PURE__*/(0, _Function.dual)(args => isSocket(args[0]), (self, encoding) => {
  const decoder = new TextDecoder(encoding);
  return toChannelMap(self, data => typeof data === "string" ? data : decoder.decode(data));
});
/**
 * @since 1.0.0
 * @category combinators
 */
const toChannelWith = () => self => toChannel(self);
/**
 * @since 1.0.0
 * @category constructors
 */
exports.toChannelWith = toChannelWith;
const makeChannel = () => Channel.unwrap(Effect.map(Socket, toChannelWith()));
/**
 * @since 1.0.0
 */
exports.makeChannel = makeChannel;
const defaultCloseCodeIsError = code => code !== 1000 && code !== 1006;
/**
 * @since 1.0.0
 * @category tags
 */
exports.defaultCloseCodeIsError = defaultCloseCodeIsError;
const WebSocket = exports.WebSocket = /*#__PURE__*/Context.GenericTag("@effect/platform/Socket/WebSocket");
/**
 * @since 1.0.0
 * @category tags
 */
const WebSocketConstructor = exports.WebSocketConstructor = /*#__PURE__*/Context.GenericTag("@effect/platform/Socket/WebSocketConstructor");
/**
 * @since 1.0.0
 * @category layers
 */
const layerWebSocketConstructorGlobal = exports.layerWebSocketConstructorGlobal = /*#__PURE__*/Layer.succeed(WebSocketConstructor, (url, protocols) => new globalThis.WebSocket(url, protocols));
/**
 * @since 1.0.0
 * @category constructors
 */
const makeWebSocket = (url, options) => fromWebSocket(Effect.acquireRelease((typeof url === "string" ? Effect.succeed(url) : url).pipe(Effect.flatMap(url => Effect.map(WebSocketConstructor, f => f(url, options?.protocols)))), ws => Effect.sync(() => ws.close(1000))), options);
/**
 * @since 1.0.0
 * @category constructors
 */
exports.makeWebSocket = makeWebSocket;
const fromWebSocket = (acquire, options) => Effect.withFiberRuntime(fiber => {
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
exports.fromWebSocket = fromWebSocket;
const makeWebSocketChannel = (url, options) => Channel.unwrapScoped(Effect.map(makeWebSocket(url, options), toChannelWith()));
/**
 * @since 1.0.0
 * @category layers
 */
exports.makeWebSocketChannel = makeWebSocketChannel;
const layerWebSocket = (url, options) => Layer.effect(Socket, makeWebSocket(url, options));
/**
 * @since 1.0.0
 * @category fiber refs
 */
exports.layerWebSocket = layerWebSocket;
const currentSendQueueCapacity = exports.currentSendQueueCapacity = /*#__PURE__*/(0, _GlobalValue.globalValue)("@effect/platform/Socket/currentSendQueueCapacity", () => FiberRef.unsafeMake(16));
/**
 * @since 1.0.0
 * @category constructors
 */
const fromTransformStream = (acquire, options) => Effect.withFiberRuntime(fiber => {
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
exports.fromTransformStream = fromTransformStream;
//# sourceMappingURL=Socket.js.map