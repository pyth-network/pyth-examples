"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromFileSystem = void 0;
var _FileSystem = require("@effect/platform/FileSystem");
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Option = _interopRequireWildcard(require("effect/Option"));
var _Migrator = require("../Migrator.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category loaders
 */
const fromFileSystem = directory => _FileSystem.FileSystem.pipe(Effect.flatMap(FS => FS.readDirectory(directory)), Effect.mapError(error => new _Migrator.MigrationError({
  reason: "failed",
  message: error.message
})), Effect.map(files => files.map(file => Option.fromNullable(file.match(/^(?:.*\/)?(\d+)_([^.]+)\.(js|ts)$/))).flatMap(Option.match({
  onNone: () => [],
  onSome: ([basename, id, name]) => [[Number(id), name, Effect.promise(() => import(/* @vite-ignore */
  /* webpackIgnore: true */
  `${directory}/${basename}`))]]
})).sort(([a], [b]) => a - b)));
exports.fromFileSystem = fromFileSystem;
//# sourceMappingURL=FileSystem.js.map