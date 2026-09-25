"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.layerResultConfig = exports.layerResult = exports.layerConfig = exports.layer = void 0;
var Arr = _interopRequireWildcard(require("effect/Array"));
var Config = _interopRequireWildcard(require("effect/Config"));
var Duration = _interopRequireWildcard(require("effect/Duration"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var _ioredis = require("ioredis");
var Persistence = _interopRequireWildcard(require("../Persistence.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = /*#__PURE__*/Effect.fnUntraced(function* (options) {
  const redis = yield* Effect.acquireRelease(Effect.sync(() => new _ioredis.Redis(options)), redis => Effect.promise(() => redis.quit()));
  return Persistence.BackingPersistence.of({
    [Persistence.BackingPersistenceTypeId]: Persistence.BackingPersistenceTypeId,
    make: prefix => Effect.sync(() => {
      const prefixed = key => `${prefix}:${key}`;
      const parse = method => str => {
        if (str === null) {
          return Effect.succeedNone;
        }
        return Effect.try({
          try: () => Option.some(JSON.parse(str)),
          catch: error => Persistence.PersistenceBackingError.make(method, error)
        });
      };
      return (0, _Function.identity)({
        get: key => Effect.flatMap(Effect.tryPromise({
          try: () => redis.get(prefixed(key)),
          catch: error => Persistence.PersistenceBackingError.make("get", error)
        }), parse("get")),
        getMany: keys => Effect.flatMap(Effect.tryPromise({
          try: () => redis.mget(keys.map(prefixed)),
          catch: error => Persistence.PersistenceBackingError.make("getMany", error)
        }), Effect.forEach(parse("getMany"))),
        set: (key, value, ttl) => Effect.tryMapPromise(Effect.try({
          try: () => JSON.stringify(value),
          catch: error => Persistence.PersistenceBackingError.make("set", error)
        }), {
          try: value => ttl._tag === "None" ? redis.set(prefixed(key), value) : redis.set(prefixed(key), value, "PX", Duration.toMillis(ttl.value)),
          catch: error => Persistence.PersistenceBackingError.make("set", error)
        }),
        setMany: entries => Effect.suspend(() => {
          const sets = new Map();
          const expires = Arr.empty();
          for (const [key, value, ttl] of entries) {
            const pkey = prefixed(key);
            sets.set(pkey, JSON.stringify(value));
            if (Option.isSome(ttl)) {
              expires.push([pkey, Duration.toMillis(ttl.value)]);
            }
          }
          const multi = redis.multi();
          multi.mset(sets);
          for (const [key, ms] of expires) {
            multi.pexpire(key, ms);
          }
          return Effect.tryPromise({
            try: () => multi.exec(),
            catch: error => Persistence.PersistenceBackingError.make("setMany", error)
          });
        }),
        remove: key => Effect.tryPromise({
          try: () => redis.del(prefixed(key)),
          catch: error => Persistence.PersistenceBackingError.make("remove", error)
        }),
        clear: Effect.tryPromise({
          try: () => redis.keys(`${prefix}:*`).then(keys => redis.del(keys)),
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
const layer = options => Layer.scoped(Persistence.BackingPersistence, make(options));
/**
 * @since 1.0.0
 * @category layers
 */
exports.layer = layer;
const layerConfig = options => Layer.scoped(Persistence.BackingPersistence, Effect.flatMap(Config.unwrap(options), make));
/**
 * @since 1.0.0
 * @category layers
 */
exports.layerConfig = layerConfig;
const layerResult = options => Persistence.layerResult.pipe(Layer.provide(layer(options)));
/**
 * @since 1.0.0
 * @category layers
 */
exports.layerResult = layerResult;
const layerResultConfig = options => Persistence.layerResult.pipe(Layer.provide(layerConfig(options)));
exports.layerResultConfig = layerResultConfig;
//# sourceMappingURL=Redis.js.map