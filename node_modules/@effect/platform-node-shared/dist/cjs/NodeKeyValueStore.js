"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerFileSystem = void 0;
var KeyValueStore = _interopRequireWildcard(require("@effect/platform/KeyValueStore"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var FileSystem = _interopRequireWildcard(require("./NodeFileSystem.js"));
var Path = _interopRequireWildcard(require("./NodePath.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category layers
 */
const layerFileSystem = directory => Layer.provide(KeyValueStore.layerFileSystem(directory), Layer.merge(FileSystem.layer, Path.layer));
exports.layerFileSystem = layerFileSystem;
//# sourceMappingURL=NodeKeyValueStore.js.map