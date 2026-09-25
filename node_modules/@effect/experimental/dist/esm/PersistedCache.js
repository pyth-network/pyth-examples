/**
 * @since 1.0.0
 */
import * as Cache from "effect/Cache";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import { identity, pipe } from "effect/Function";
import * as Hash from "effect/Hash";
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import * as Persistence from "./Persistence.js";
class CacheRequest extends Data.Class {
  [Equal.symbol](that) {
    return Equal.equals(this.key, that.key);
  }
  [Hash.symbol]() {
    return Hash.hash(this.key);
  }
}
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = options => Persistence.ResultPersistence.pipe(Effect.flatMap(_ => _.make({
  storeId: options.storeId,
  timeToLive: options.timeToLive
})), Effect.bindTo("store"), Effect.bind("inMemoryCache", ({
  store
}) => Cache.make({
  lookup: request => {
    const effect = pipe(store.get(request.key), Effect.flatMap(Option.match({
      onNone: () => options.lookup(request.key).pipe(Effect.exit, Effect.tap(exit => store.set(request.key, exit)), Effect.flatten),
      onSome: identity
    })));
    return request.span._tag === "Some" ? Effect.withParentSpan(effect, request.span.value) : effect;
  },
  capacity: options.inMemoryCapacity ?? 64,
  timeToLive: options.inMemoryTTL ?? 10_000
})), Effect.map(({
  inMemoryCache,
  store
}) => identity({
  get: key => Effect.serviceOption(Tracer.ParentSpan).pipe(Effect.flatMap(span => inMemoryCache.get(new CacheRequest({
    key,
    span
  })))),
  invalidate: key => store.remove(key).pipe(Effect.zipRight(inMemoryCache.invalidate(new CacheRequest({
    key,
    span: Option.none()
  }))))
})));
//# sourceMappingURL=PersistedCache.js.map