"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ResourceMap = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Exit = _interopRequireWildcard(require("effect/Exit"));
var MutableHashMap = _interopRequireWildcard(require("effect/MutableHashMap"));
var MutableRef = _interopRequireWildcard(require("effect/MutableRef"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Scope = _interopRequireWildcard(require("effect/Scope"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
class ResourceMap {
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
exports.ResourceMap = ResourceMap;
//# sourceMappingURL=resourceMap.js.map