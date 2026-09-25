"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unsafeTtlToExpires = exports.layerResultMemory = exports.layerResultKeyValueStore = exports.layerResult = exports.layerMemory = exports.layerKeyValueStore = exports.ResultPersistenceTypeId = exports.ResultPersistence = exports.PersistenceParseError = exports.PersistenceBackingError = exports.ErrorTypeId = exports.BackingPersistenceTypeId = exports.BackingPersistence = void 0;
var _Error = require("@effect/platform/Error");
var KeyValueStore = _interopRequireWildcard(require("@effect/platform/KeyValueStore"));
var Arr = _interopRequireWildcard(require("effect/Array"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Duration = _interopRequireWildcard(require("effect/Duration"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var ParseResult = _interopRequireWildcard(require("effect/ParseResult"));
var PrimaryKey = _interopRequireWildcard(require("effect/PrimaryKey"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const ErrorTypeId = exports.ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/PersistenceError");
/**
 * @since 1.0.0
 * @category errors
 */
class PersistenceParseError extends /*#__PURE__*/(0, _Error.TypeIdError)(ErrorTypeId, "PersistenceError") {
  /**
   * @since 1.0.0
   */
  static make(method, error) {
    return new PersistenceParseError({
      reason: "ParseError",
      method,
      error
    });
  }
  get message() {
    return ParseResult.TreeFormatter.formatIssueSync(this.error);
  }
}
/**
 * @since 1.0.0
 * @category errors
 */
exports.PersistenceParseError = PersistenceParseError;
class PersistenceBackingError extends /*#__PURE__*/(0, _Error.TypeIdError)(ErrorTypeId, "PersistenceError") {
  /**
   * @since 1.0.0
   */
  static make(method, cause) {
    return new PersistenceBackingError({
      reason: "BackingError",
      method,
      cause
    });
  }
  get message() {
    return this.reason;
  }
}
/**
 * @since 1.0.0
 * @category type ids
 */
exports.PersistenceBackingError = PersistenceBackingError;
const BackingPersistenceTypeId = exports.BackingPersistenceTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/BackingPersistence");
/**
 * @since 1.0.0
 * @category tags
 */
const BackingPersistence = exports.BackingPersistence = /*#__PURE__*/Context.GenericTag("@effect/experimental/BackingPersistence");
/**
 * @since 1.0.0
 * @category type ids
 */
const ResultPersistenceTypeId = exports.ResultPersistenceTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/ResultPersistence");
/**
 * @since 1.0.0
 * @category tags
 */
const ResultPersistence = exports.ResultPersistence = /*#__PURE__*/Context.GenericTag("@effect/experimental/ResultPersistence");
/**
 * @since 1.0.0
 * @category layers
 */
const layerResult = exports.layerResult = /*#__PURE__*/Layer.effect(ResultPersistence, /*#__PURE__*/Effect.gen(function* () {
  const backing = yield* BackingPersistence;
  return ResultPersistence.of({
    [ResultPersistenceTypeId]: ResultPersistenceTypeId,
    make: options => Effect.gen(function* () {
      const storage = yield* backing.make(options.storeId);
      const timeToLive = options.timeToLive ?? (() => Duration.infinity);
      const parse = (method, key, value) => Effect.mapError(Schema.deserializeExit(key, value), _ => PersistenceParseError.make(method, _.issue));
      const encode = (method, key, value) => Effect.mapError(Schema.serializeExit(key, value), _ => PersistenceParseError.make(method, _.issue));
      const makeKey = key => key[PrimaryKey.symbol]();
      return (0, _Function.identity)({
        get: key => Effect.flatMap(storage.get(makeKey(key)), Option.match({
          onNone: () => Effect.succeedNone,
          onSome: _ => Effect.asSome(parse("get", key, _))
        })),
        getMany: keys => Effect.flatMap(storage.getMany(keys.map(makeKey)), Effect.forEach((result, i) => {
          const key = keys[i];
          return Option.match(result, {
            onNone: () => Effect.succeedNone,
            onSome: _ => parse("getMany", key, _).pipe(Effect.tapError(_ => storage.remove(makeKey(keys[i]))), Effect.option)
          });
        })),
        set: (key, value) => {
          const ttl = Duration.decode(timeToLive(key, value));
          if (Duration.isZero(ttl)) {
            return Effect.void;
          }
          return encode("set", key, value).pipe(Effect.flatMap(encoded => storage.set(makeKey(key), encoded, Duration.isFinite(ttl) ? Option.some(ttl) : Option.none())));
        },
        setMany: Effect.fnUntraced(function* (entries) {
          const encodedEntries = Arr.empty();
          for (const [key, value] of entries) {
            const ttl = Duration.decode(timeToLive(key, value));
            if (Duration.isZero(ttl)) continue;
            const encoded = yield* encode("setMany", key, value);
            encodedEntries.push([makeKey(key), encoded, Duration.isFinite(ttl) ? Option.some(ttl) : Option.none()]);
          }
          if (encodedEntries.length === 0) return;
          return yield* storage.setMany(encodedEntries).pipe(Effect.catchAll(error => Effect.fail(PersistenceBackingError.make("setMany", error))));
        }),
        remove: key => storage.remove(makeKey(key)),
        clear: storage.clear
      });
    })
  });
}));
/**
 * @since 1.0.0
 * @category layers
 */
const layerMemory = exports.layerMemory = /*#__PURE__*/Layer.sync(BackingPersistence, () => {
  const stores = new Map();
  const getStore = storeId => {
    let store = stores.get(storeId);
    if (store === undefined) {
      store = new Map();
      stores.set(storeId, store);
    }
    return store;
  };
  return BackingPersistence.of({
    [BackingPersistenceTypeId]: BackingPersistenceTypeId,
    make: storeId => Effect.map(Effect.clock, clock => {
      const map = getStore(storeId);
      const unsafeGet = key => {
        const value = map.get(key);
        if (value === undefined) {
          return Option.none();
        } else if (value[1] !== null && value[1] <= clock.unsafeCurrentTimeMillis()) {
          map.delete(key);
          return Option.none();
        }
        return Option.some(value[0]);
      };
      return (0, _Function.identity)({
        get: key => Effect.sync(() => unsafeGet(key)),
        getMany: keys => Effect.sync(() => keys.map(unsafeGet)),
        set: (key, value, ttl) => Effect.sync(() => map.set(key, [value, unsafeTtlToExpires(clock, ttl)])),
        setMany: entries => Effect.sync(() => {
          for (const [key, value, ttl] of entries) {
            map.set(key, [value, unsafeTtlToExpires(clock, ttl)]);
          }
        }),
        remove: key => Effect.sync(() => map.delete(key)),
        clear: Effect.sync(() => map.clear())
      });
    })
  });
});
/**
 * @since 1.0.0
 * @category layers
 */
const layerKeyValueStore = exports.layerKeyValueStore = /*#__PURE__*/Layer.effect(BackingPersistence, /*#__PURE__*/Effect.gen(function* () {
  const backing = yield* KeyValueStore.KeyValueStore;
  return BackingPersistence.of({
    [BackingPersistenceTypeId]: BackingPersistenceTypeId,
    make: storeId => Effect.map(Effect.clock, clock => {
      const store = KeyValueStore.prefix(backing, storeId);
      const get = (method, key) => Effect.flatMap(Effect.mapError(store.get(key), error => PersistenceBackingError.make(method, error)), Option.match({
        onNone: () => Effect.succeedNone,
        onSome: s => Effect.flatMap(Effect.try({
          try: () => JSON.parse(s),
          catch: error => PersistenceBackingError.make(method, error)
        }), _ => {
          if (!Array.isArray(_)) return Effect.succeedNone;
          const [value, expires] = _;
          if (expires !== null && expires <= clock.unsafeCurrentTimeMillis()) {
            return Effect.as(Effect.ignore(store.remove(key)), Option.none());
          }
          return Effect.succeed(Option.some(value));
        })
      }));
      return (0, _Function.identity)({
        get: key => get("get", key),
        getMany: keys => Effect.forEach(keys, key => get("getMany", key), {
          concurrency: "unbounded"
        }),
        set: (key, value, ttl) => Effect.flatMap(Effect.try({
          try: () => JSON.stringify([value, unsafeTtlToExpires(clock, ttl)]),
          catch: error => PersistenceBackingError.make("set", error)
        }), u => Effect.mapError(store.set(key, u), error => PersistenceBackingError.make("set", error))),
        setMany: entries => Effect.forEach(entries, ([key, value, ttl]) => {
          const expires = unsafeTtlToExpires(clock, ttl);
          if (expires === null) return Effect.void;
          const encoded = JSON.stringify([value, expires]);
          return store.set(key, encoded);
        }, {
          concurrency: "unbounded",
          discard: true
        }).pipe(Effect.mapError(error => PersistenceBackingError.make("setMany", error))),
        remove: key => Effect.mapError(store.remove(key), error => PersistenceBackingError.make("remove", error)),
        clear: Effect.mapError(store.clear, error => PersistenceBackingError.make("clear", error))
      });
    })
  });
}));
/**
 * @since 1.0.0
 * @category layers
 */
const layerResultMemory = exports.layerResultMemory = /*#__PURE__*/layerResult.pipe(/*#__PURE__*/Layer.provide(layerMemory));
/**
 * @since 1.0.0
 * @category layers
 */
const layerResultKeyValueStore = exports.layerResultKeyValueStore = /*#__PURE__*/layerResult.pipe(/*#__PURE__*/Layer.provide(layerKeyValueStore));
/**
 * @since 1.0.0
 */
const unsafeTtlToExpires = (clock, ttl) => ttl._tag === "None" ? null : clock.unsafeCurrentTimeMillis() + Duration.toMillis(ttl.value);
exports.unsafeTtlToExpires = unsafeTtlToExpires;
//# sourceMappingURL=Persistence.js.map