"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = void 0;
var Cache = _interopRequireWildcard(require("effect/Cache"));
var Data = _interopRequireWildcard(require("effect/Data"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Equal = _interopRequireWildcard(require("effect/Equal"));
var _Function = require("effect/Function");
var Hash = _interopRequireWildcard(require("effect/Hash"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Tracer = _interopRequireWildcard(require("effect/Tracer"));
var Persistence = _interopRequireWildcard(require("./Persistence.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

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
const make = options => Persistence.ResultPersistence.pipe(Effect.flatMap(_ => _.make({
  storeId: options.storeId,
  timeToLive: options.timeToLive
})), Effect.bindTo("store"), Effect.bind("inMemoryCache", ({
  store
}) => Cache.make({
  lookup: request => {
    const effect = (0, _Function.pipe)(store.get(request.key), Effect.flatMap(Option.match({
      onNone: () => options.lookup(request.key).pipe(Effect.exit, Effect.tap(exit => store.set(request.key, exit)), Effect.flatten),
      onSome: _Function.identity
    })));
    return request.span._tag === "Some" ? Effect.withParentSpan(effect, request.span.value) : effect;
  },
  capacity: options.inMemoryCapacity ?? 64,
  timeToLive: options.inMemoryTTL ?? 10_000
})), Effect.map(({
  inMemoryCache,
  store
}) => (0, _Function.identity)({
  get: key => Effect.serviceOption(Tracer.ParentSpan).pipe(Effect.flatMap(span => inMemoryCache.get(new CacheRequest({
    key,
    span
  })))),
  invalidate: key => store.remove(key).pipe(Effect.zipRight(inMemoryCache.invalidate(new CacheRequest({
    key,
    span: Option.none()
  }))))
})));
exports.make = make;
//# sourceMappingURL=PersistedCache.js.map