/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Runtime from "effect/Runtime";
import * as Stream from "effect/Stream";
/**
 * @since 1.0.0
 */
export const asyncPauseResume = (register, bufferSize = 2) => {
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
//# sourceMappingURL=SqlStream.js.map