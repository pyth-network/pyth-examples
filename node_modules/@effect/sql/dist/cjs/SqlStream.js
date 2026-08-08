"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.asyncPauseResume = void 0;
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Queue = _interopRequireWildcard(require("effect/Queue"));
var Runtime = _interopRequireWildcard(require("effect/Runtime"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
const asyncPauseResume = (register, bufferSize = 2) => {
  const EOF = Symbol();
  return Effect.all([Queue.bounded(bufferSize), Deferred.make(), Effect.runtime()]).pipe(Effect.flatMap(([queue, deferred, runtime]) => {
    return Effect.async(cb => {
      const runFork = Runtime.runFork(runtime);
      // eslint-disable-next-line prefer-const
      let effects;
      const offer = chunk => Queue.isFull(queue).pipe(Effect.tap(full => full ? effects.onPause : Effect.void), Effect.zipRight(Queue.offer(queue, chunk)), Effect.zipRight(effects.onResume));
      effects = register({
        single: item => runFork(offer(Chunk.of(item))),
        chunk: chunk => runFork(offer(chunk)),
        array: chunk => runFork(offer(Chunk.unsafeFromArray(chunk))),
        fail: error => cb(Effect.fail(Option.some(error))),
        end: () => cb(Effect.fail(Option.none()))
      });
      return effects.onInterrupt;
    }).pipe(Effect.ensuring(Queue.offer(queue, EOF)), Effect.intoDeferred(deferred), Effect.forkScoped, Effect.as(Stream.repeatEffectChunkOption(Effect.flatMap(Queue.take(queue), chunk => chunk === EOF ? Deferred.await(deferred) : Effect.succeed(chunk)))));
  }), Stream.unwrapScoped);
};
exports.asyncPauseResume = asyncPauseResume;
//# sourceMappingURL=SqlStream.js.map