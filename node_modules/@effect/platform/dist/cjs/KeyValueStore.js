"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prefix = exports.makeStringOnly = exports.make = exports.layerStorage = exports.layerSchema = exports.layerMemory = exports.layerFileSystem = exports.TypeId = exports.SchemaStoreTypeId = exports.KeyValueStore = void 0;
var internal = _interopRequireWildcard(require("./internal/keyValueStore.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type id
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category tags
 */
const KeyValueStore = exports.KeyValueStore = internal.keyValueStoreTag;
/**
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = internal.make;
/**
 * @since 1.0.0
 * @category constructors
 */
const makeStringOnly = exports.makeStringOnly = internal.makeStringOnly;
/**
 * @since 1.0.0
 * @category combinators
 */
const prefix = exports.prefix = internal.prefix;
/**
 * @since 1.0.0
 * @category layers
 */
const layerMemory = exports.layerMemory = internal.layerMemory;
/**
 * @since 1.0.0
 * @category layers
 */
const layerFileSystem = exports.layerFileSystem = internal.layerFileSystem;
/**
 * @since 1.0.0
 * @category type id
 */
const SchemaStoreTypeId = exports.SchemaStoreTypeId = internal.SchemaStoreTypeId;
/**
 * @since 1.0.0
 * @category layers
 */
const layerSchema = exports.layerSchema = internal.layerSchema;
/**
 * Creates an KeyValueStorage from an instance of the `Storage` api.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
 *
 * @since 1.0.0
 * @category layers
 */
const layerStorage = exports.layerStorage = internal.layerStorage;
//# sourceMappingURL=KeyValueStore.js.map