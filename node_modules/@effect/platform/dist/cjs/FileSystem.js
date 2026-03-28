"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeNoop = exports.make = exports.layerNoop = exports.isFile = exports.WatchEventUpdate = exports.WatchEventRemove = exports.WatchEventCreate = exports.WatchBackend = exports.TiB = exports.Size = exports.PiB = exports.MiB = exports.KiB = exports.GiB = exports.FileTypeId = exports.FileSystem = exports.FileDescriptor = void 0;
var Brand = _interopRequireWildcard(require("effect/Brand"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Data = _interopRequireWildcard(require("effect/Data"));
var internal = _interopRequireWildcard(require("./internal/fileSystem.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category sizes
 */
const Size = exports.Size = internal.Size;
/**
 * @since 1.0.0
 * @category sizes
 */
const KiB = exports.KiB = internal.KiB;
/**
 * @since 1.0.0
 * @category sizes
 */
const MiB = exports.MiB = internal.MiB;
/**
 * @since 1.0.0
 * @category sizes
 */
const GiB = exports.GiB = internal.GiB;
/**
 * @since 1.0.0
 * @category sizes
 */
const TiB = exports.TiB = internal.TiB;
/**
 * @since 1.0.0
 * @category sizes
 */
const PiB = exports.PiB = internal.PiB;
/**
 * @since 1.0.0
 * @category tag
 */
const FileSystem = exports.FileSystem = internal.tag;
/**
 * @since 1.0.0
 * @category constructor
 */
const make = exports.make = internal.make;
/**
 * Create a no-op file system that can be used for testing.
 *
 * @since 1.0.0
 * @category constructor
 */
const makeNoop = exports.makeNoop = internal.makeNoop;
/**
 * Create a no-op file system that can be used for testing.
 *
 * @since 1.0.0
 * @category layers
 */
const layerNoop = exports.layerNoop = internal.layerNoop;
/**
 * @since 1.0.0
 * @category type id
 */
const FileTypeId = exports.FileTypeId = /*#__PURE__*/Symbol.for("@effect/platform/FileSystem/File");
/**
 * @since 1.0.0
 * @category guard
 */
const isFile = u => typeof u === "object" && u !== null && FileTypeId in u;
/**
 * @since 1.0.0
 * @category constructor
 */
exports.isFile = isFile;
const FileDescriptor = exports.FileDescriptor = /*#__PURE__*/Brand.nominal();
/**
 * @since 1.0.0
 * @category constructor
 */
const WatchEventCreate = exports.WatchEventCreate = /*#__PURE__*/Data.tagged("Create");
/**
 * @since 1.0.0
 * @category constructor
 */
const WatchEventUpdate = exports.WatchEventUpdate = /*#__PURE__*/Data.tagged("Update");
/**
 * @since 1.0.0
 * @category constructor
 */
const WatchEventRemove = exports.WatchEventRemove = /*#__PURE__*/Data.tagged("Remove");
/**
 * @since 1.0.0
 * @category file watcher
 */
class WatchBackend extends /*#__PURE__*/Context.Tag("@effect/platform/FileSystem/WatchBackend")() {}
exports.WatchBackend = WatchBackend;
//# sourceMappingURL=FileSystem.js.map