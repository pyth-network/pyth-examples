"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layer = exports.TypeId = exports.Path = void 0;
var internal = _interopRequireWildcard(require("./internal/path.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category tag
 */
const Path = exports.Path = internal.Path;
/**
 * An implementation of the Path interface that can be used in all environments
 * (including browsers).
 *
 * It uses the POSIX standard for paths.
 *
 * @since 1.0.0
 * @category layer
 */
const layer = exports.layer = internal.layer;
//# sourceMappingURL=Path.js.map