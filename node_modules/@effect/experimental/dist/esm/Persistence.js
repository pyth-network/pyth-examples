/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
import * as KeyValueStore from "@effect/platform/KeyValueStore";
import * as Arr from "effect/Array";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import { identity } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import * as PrimaryKey from "effect/PrimaryKey";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/PersistenceError");
/**
 * @since 1.0.0
 * @category errors
 */
export class PersistenceParseError extends /*#__PURE__*/TypeIdError(ErrorTypeId, "PersistenceError") {
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
export class PersistenceBackingError extends /*#__PURE__*/TypeIdError(ErrorTypeId, "PersistenceError") {
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
export const BackingPersistenceTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/BackingPersistence");
/**
 * @since 1.0.0
 * @category tags
 */
export const BackingPersistence = /*#__PURE__*/Context.GenericTag("@effect/experimental/BackingPersistence");
/**
 * @since 1.0.0
 * @category type ids
 */
export const ResultPersistenceTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/ResultPersistence");
/**
 * @since 1.0.0
 * @category tags
 */
export const ResultPersistence = /*#__PURE__*/Context.GenericTag("@effect/experimental/ResultPersistence");
/**
 * @since 1.0.0
 * @category layers
 */
export const layerResult = /*#__PURE__*/Layer.effect(ResultPersistence, /*#__PURE__*/Effect.gen(function* () {
  const backing = yield* BackingPersistence;
  return ResultPersistence.of({
    [ResultPersistenceTypeId]: ResultPersistenceTypeId,
    make: options => Effect.gen(function* () {
      const storage = yield* backing.make(options.storeId);
      const timeToLive = options.timeToLive ?? (() => Duration.infinity);
      const parse = (method, key, value) => Effect.mapError(Schema.deserializeExit(key, value), _ => PersistenceParseError.make(method, _.issue));
      const encode = (method, key, value) => Effect.mapError(Schema.serializeExit(key, value), _ => PersistenceParseError.make(method, _.issue));
      const makeKey = key => key[PrimaryKey.symbol]();
      return identity({
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
export const layerMemory = /*#__PURE__*/Layer.sync(BackingPersistence, () => {
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
      return identity({
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
export const layerKeyValueStore = /*#__PURE__*/Layer.effect(BackingPersistence, /*#__PURE__*/Effect.gen(function* () {
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
      return identity({
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
export const layerResultMemory = /*#__PURE__*/layerResult.pipe(/*#__PURE__*/Layer.provide(layerMemory));
/**
 * @since 1.0.0
 * @category layers
 */
export const layerResultKeyValueStore = /*#__PURE__*/layerResult.pipe(/*#__PURE__*/Layer.provide(layerKeyValueStore));
/**
 * @since 1.0.0
 */
export const unsafeTtlToExpires = (clock, ttl) => ttl._tag === "None" ? null : clock.unsafeCurrentTimeMillis() + Duration.toMillis(ttl.value);
//# sourceMappingURL=Persistence.js.map