import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as MutableHashMap from "effect/MutableHashMap";
import * as MutableRef from "effect/MutableRef";
import * as Option from "effect/Option";
import * as Scope from "effect/Scope";
export class ResourceMap {
  lookup;
  entries;
  isClosed;
  constructor(lookup, entries, isClosed) {
    this.lookup = lookup;
    this.entries = entries;
    this.isClosed = isClosed;
  }
  static make = /*#__PURE__*/Effect.fnUntraced(function* (lookup) {
    const scope = yield* Effect.scope;
    const context = yield* Effect.context();
    const isClosed = MutableRef.make(false);
    const entries = MutableHashMap.empty();
    yield* Scope.addFinalizerExit(scope, exit => {
      MutableRef.set(isClosed, true);
      return Effect.forEach(entries, ([key, {
        scope
      }]) => {
        MutableHashMap.remove(entries, key);
        return Effect.exit(Scope.close(scope, exit));
      }, {
        concurrency: "unbounded",
        discard: true
      });
    });
    return new ResourceMap((key, scope) => Effect.provide(lookup(key), Context.add(context, Scope.Scope, scope)), entries, isClosed);
  });
  get(key) {
    return Effect.withFiberRuntime(fiber => {
      if (MutableRef.get(this.isClosed)) {
        return Effect.interrupt;
      }
      const existing = MutableHashMap.get(this.entries, key);
      if (Option.isSome(existing)) {
        return Deferred.await(existing.value.deferred);
      }
      const scope = Effect.runSync(Scope.make());
      const deferred = Deferred.unsafeMake(fiber.id());
      MutableHashMap.set(this.entries, key, {
        scope,
        deferred
      });
      return Effect.onExit(this.lookup(key, scope), exit => {
        if (exit._tag === "Success") {
          return Deferred.done(deferred, exit);
        }
        MutableHashMap.remove(this.entries, key);
        return Deferred.done(deferred, exit);
      });
    });
  }
  remove(key) {
    return Effect.suspend(() => {
      const entry = MutableHashMap.get(this.entries, key);
      if (Option.isNone(entry)) {
        return Effect.void;
      }
      MutableHashMap.remove(this.entries, key);
      return Scope.close(entry.value.scope, Exit.void);
    });
  }
  removeIgnore(key) {
    return Effect.catchAllCause(this.remove(key), cause => Effect.annotateLogs(Effect.logDebug(cause), {
      module: "ResourceMap",
      method: "removeIgnore",
      key
    }));
  }
}
//# sourceMappingURL=resourceMap.js.map