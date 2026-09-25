"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerWin32 = exports.layerPosix = exports.layer = void 0;
var _Error = require("@effect/platform/Error");
var _Path = require("@effect/platform/Path");
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var NodePath = _interopRequireWildcard(require("node:path"));
var NodeUrl = _interopRequireWildcard(require("node:url"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const fromFileUrl = url => Effect.try({
  try: () => NodeUrl.fileURLToPath(url),
  catch: error => new _Error.BadArgument({
    module: "Path",
    method: "fromFileUrl",
    description: `Invalid file URL: ${url}`,
    cause: error
  })
});
const toFileUrl = path => Effect.try({
  try: () => NodeUrl.pathToFileURL(path),
  catch: error => new _Error.BadArgument({
    module: "Path",
    method: "toFileUrl",
    description: `Invalid path: ${path}`,
    cause: error
  })
});
/** @internal */
const layerPosix = exports.layerPosix = /*#__PURE__*/Layer.succeed(_Path.Path, /*#__PURE__*/_Path.Path.of({
  [_Path.TypeId]: _Path.TypeId,
  ...NodePath.posix,
  fromFileUrl,
  toFileUrl
}));
/** @internal */
const layerWin32 = exports.layerWin32 = /*#__PURE__*/Layer.succeed(_Path.Path, /*#__PURE__*/_Path.Path.of({
  [_Path.TypeId]: _Path.TypeId,
  ...NodePath.win32,
  fromFileUrl,
  toFileUrl
}));
/** @internal */
const layer = exports.layer = /*#__PURE__*/Layer.succeed(_Path.Path, /*#__PURE__*/_Path.Path.of({
  [_Path.TypeId]: _Path.TypeId,
  ...NodePath,
  fromFileUrl,
  toFileUrl
}));
//# sourceMappingURL=path.js.map