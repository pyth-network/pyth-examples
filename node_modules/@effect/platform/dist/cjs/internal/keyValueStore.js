"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prefix = exports.makeStringOnly = exports.make = exports.layerStorage = exports.layerSchema = exports.layerMemory = exports.layerFileSystem = exports.keyValueStoreTag = exports.TypeId = exports.SchemaStoreTypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Either = _interopRequireWildcard(require("effect/Either"));
var Encoding = _interopRequireWildcard(require("effect/Encoding"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var PlatformError = _interopRequireWildcard(require("../Error.js"));
var FileSystem = _interopRequireWildcard(require("../FileSystem.js"));
var Path = _interopRequireWildcard(require("../Path.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/KeyValueStore");
/** @internal */
const keyValueStoreTag = exports.keyValueStoreTag = /*#__PURE__*/Context.GenericTag("@effect/platform/KeyValueStore");
/** @internal */
const make = impl => keyValueStoreTag.of({
  [TypeId]: TypeId,
  has: key => Effect.map(impl.get(key), Option.isSome),
  isEmpty: Effect.map(impl.size, size => size === 0),
  modify: (key, f) => Effect.flatMap(impl.get(key), o => {
    if (Option.isNone(o)) {
      return Effect.succeedNone;
    }
    const newValue = f(o.value);
    return Effect.as(impl.set(key, newValue), Option.some(newValue));
  }),
  modifyUint8Array: (key, f) => Effect.flatMap(impl.getUint8Array(key), o => {
    if (Option.isNone(o)) {
      return Effect.succeedNone;
    }
    const newValue = f(o.value);
    return Effect.as(impl.set(key, newValue), Option.some(newValue));
  }),
  forSchema(schema) {
    return makeSchemaStore(this, schema);
  },
  ...impl
});
/** @internal */
exports.make = make;
const makeStringOnly = impl => {
  const encoder = new TextEncoder();
  return make({
    ...impl,
    getUint8Array: key => impl.get(key).pipe(Effect.map(Option.map(value => Either.match(Encoding.decodeBase64(value), {
      onLeft: () => encoder.encode(value),
      onRight: _Function.identity
    })))),
    set: (key, value) => typeof value === "string" ? impl.set(key, value) : Effect.suspend(() => impl.set(key, Encoding.encodeBase64(value)))
  });
};
/** @internal */
exports.makeStringOnly = makeStringOnly;
const prefix = exports.prefix = /*#__PURE__*/(0, _Function.dual)(2, (self, prefix) => ({
  ...self,
  get: key => self.get(`${prefix}${key}`),
  set: (key, value) => self.set(`${prefix}${key}`, value),
  remove: key => self.remove(`${prefix}${key}`),
  has: key => self.has(`${prefix}${key}`),
  modify: (key, f) => self.modify(`${prefix}${key}`, f)
}));
/** @internal */
const SchemaStoreTypeId = exports.SchemaStoreTypeId = /*#__PURE__*/Symbol.for("@effect/platform/KeyValueStore/SchemaStore");
/** @internal */
const makeSchemaStore = (store, schema) => {
  const jsonSchema = Schema.parseJson(schema);
  const parse = Schema.decodeUnknown(jsonSchema);
  const encode = Schema.encode(jsonSchema);
  const get = key => Effect.flatMap(store.get(key), Option.match({
    onNone: () => Effect.succeedNone,
    onSome: value => Effect.asSome(parse(value))
  }));
  const set = (key, value) => Effect.flatMap(encode(value), json => store.set(key, json));
  const modify = (key, f) => Effect.flatMap(get(key), o => {
    if (Option.isNone(o)) {
      return Effect.succeedNone;
    }
    const newValue = f(o.value);
    return Effect.as(set(key, newValue), Option.some(newValue));
  });
  return {
    [SchemaStoreTypeId]: SchemaStoreTypeId,
    get,
    set,
    modify,
    remove: store.remove,
    clear: store.clear,
    size: store.size,
    has: store.has,
    isEmpty: store.isEmpty
  };
};
/** @internal */
const layerMemory = exports.layerMemory = /*#__PURE__*/Layer.sync(keyValueStoreTag, () => {
  const store = new Map();
  const encoder = new TextEncoder();
  return make({
    get: key => Effect.sync(() => Option.fromNullable(store.get(key)).pipe(Option.map(value => typeof value === "string" ? value : Encoding.encodeBase64(value)))),
    getUint8Array: key => Effect.sync(() => Option.fromNullable(store.get(key)).pipe(Option.map(value => typeof value === "string" ? encoder.encode(value) : value))),
    set: (key, value) => Effect.sync(() => store.set(key, value)),
    remove: key => Effect.sync(() => store.delete(key)),
    clear: Effect.sync(() => store.clear()),
    size: Effect.sync(() => store.size)
  });
});
/** @internal */
const layerFileSystem = directory => Layer.effect(keyValueStoreTag, Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const keyPath = key => path.join(directory, encodeURIComponent(key));
  if (!(yield* fs.exists(directory))) {
    yield* fs.makeDirectory(directory, {
      recursive: true
    });
  }
  return make({
    get: key => (0, _Function.pipe)(Effect.map(fs.readFileString(keyPath(key)), Option.some), Effect.catchTag("SystemError", sysError => sysError.reason === "NotFound" ? Effect.succeed(Option.none()) : Effect.fail(sysError))),
    getUint8Array: key => (0, _Function.pipe)(Effect.map(fs.readFile(keyPath(key)), Option.some), Effect.catchTag("SystemError", sysError => sysError.reason === "NotFound" ? Effect.succeed(Option.none()) : Effect.fail(sysError))),
    set: (key, value) => typeof value === "string" ? fs.writeFileString(keyPath(key), value) : fs.writeFile(keyPath(key), value),
    remove: key => fs.remove(keyPath(key)),
    has: key => fs.exists(keyPath(key)),
    clear: Effect.zipRight(fs.remove(directory, {
      recursive: true
    }), fs.makeDirectory(directory, {
      recursive: true
    })),
    size: Effect.map(fs.readDirectory(directory), files => files.length)
  });
}));
/** @internal */
exports.layerFileSystem = layerFileSystem;
const layerSchema = (schema, tagIdentifier) => {
  const tag = Context.GenericTag(tagIdentifier);
  const layer = Layer.effect(tag, Effect.map(keyValueStoreTag, store => store.forSchema(schema)));
  return {
    tag,
    layer
  };
};
/** @internal */
exports.layerSchema = layerSchema;
const storageError = props => new PlatformError.SystemError({
  reason: "PermissionDenied",
  module: "KeyValueStore",
  ...props
});
/** @internal */
const layerStorage = evaluate => Layer.sync(keyValueStoreTag, () => {
  const storage = evaluate();
  return makeStringOnly({
    get: key => Effect.try({
      try: () => Option.fromNullable(storage.getItem(key)),
      catch: () => storageError({
        pathOrDescriptor: key,
        method: "get",
        description: `Unable to get item with key ${key}`
      })
    }),
    set: (key, value) => Effect.try({
      try: () => storage.setItem(key, value),
      catch: () => storageError({
        pathOrDescriptor: key,
        method: "set",
        description: `Unable to set item with key ${key}`
      })
    }),
    remove: key => Effect.try({
      try: () => storage.removeItem(key),
      catch: () => storageError({
        pathOrDescriptor: key,
        method: "remove",
        description: `Unable to remove item with key ${key}`
      })
    }),
    clear: Effect.try({
      try: () => storage.clear(),
      catch: () => storageError({
        pathOrDescriptor: "clear",
        method: "clear",
        description: `Unable to clear storage`
      })
    }),
    size: Effect.try({
      try: () => storage.length,
      catch: () => storageError({
        pathOrDescriptor: "size",
        method: "size",
        description: `Unable to get size`
      })
    })
  });
});
exports.layerStorage = layerStorage;
//# sourceMappingURL=keyValueStore.js.map