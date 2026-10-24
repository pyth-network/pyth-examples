"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.layerResult = exports.layer = void 0;
var Arr = _interopRequireWildcard(require("effect/Array"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Lmdb = _interopRequireWildcard(require("lmdb"));
var Persistence = _interopRequireWildcard(require("../Persistence.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category constructors
 */
const make = options => Effect.gen(function* () {
  const lmdb = yield* Effect.acquireRelease(Effect.sync(() => Lmdb.open(options)), lmdb => Effect.promise(() => lmdb.close()));
  return Persistence.BackingPersistence.of({
    [Persistence.BackingPersistenceTypeId]: Persistence.BackingPersistenceTypeId,
    make: storeId => Effect.gen(function* () {
      const clock = yield* Effect.clock;
      const store = yield* Effect.acquireRelease(Effect.sync(() => lmdb.openDB({
        name: storeId
      })), store => Effect.promise(() => store.close()));
      const valueToOption = (key, _) => {
        if (!Arr.isArray(_)) return Option.none();
        const [value, expires] = _;
        if (expires !== null && expires <= clock.unsafeCurrentTimeMillis()) {
          store.remove(key);
          return Option.none();
        }
        return Option.some(value);
      };
      return (0, _Function.identity)({
        get: key => Effect.try({
          try: () => valueToOption(key, store.get(key)),
          catch: error => Persistence.PersistenceBackingError.make("get", error)
        }),
        getMany: keys => Effect.map(Effect.tryPromise({
          try: () => store.getMany(keys),
          catch: error => Persistence.PersistenceBackingError.make("getMany", error)
        }), Arr.map((value, i) => valueToOption(keys[i], value))),
        set: (key, value, ttl) => Effect.tryPromise({
          try: () => store.put(key, [value, Persistence.unsafeTtlToExpires(clock, ttl)]),
          catch: error => Persistence.PersistenceBackingError.make("set", error)
        }),
        setMany: entries => Effect.tryPromise({
          try: () => Promise.all(entries.map(([key, value, ttl]) => store.put(key, [value, Persistence.unsafeTtlToExpires(clock, ttl)]))),
          catch: error => Persistence.PersistenceBackingError.make("setMany", error)
        }),
        remove: key => Effect.tryPromise({
          try: () => store.remove(key),
          catch: error => Persistence.PersistenceBackingError.make("remove", error)
        }),
        clear: Effect.tryPromise({
          try: () => store.clearAsync(),
          catch: error => Persistence.PersistenceBackingError.make("clear", error)
        })
      });
    })
  });
});
/**
 * @since 1.0.0
 * @category layers
 */
exports.make = make;
const layer = options => Layer.scoped(Persistence.BackingPersistence, make(options));
/**
 * @since 1.0.0
 * @category layers
 */
exports.layer = layer;
const layerResult = options => Persistence.layerResult.pipe(Layer.provide(layer(options)));
exports.layerResult = layerResult;
//# sourceMappingURL=Lmdb.js.map