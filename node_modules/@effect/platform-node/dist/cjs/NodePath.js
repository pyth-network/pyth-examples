"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerWin32 = exports.layerPosix = exports.layer = void 0;
var NodePath = _interopRequireWildcard(require("@effect/platform-node-shared/NodePath"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category layer
 */
const layer = exports.layer = NodePath.layer;
/**
 * @since 1.0.0
 * @category layer
 */
const layerPosix = exports.layerPosix = NodePath.layerPosix;
/**
 * @since 1.0.0
 * @category layer
 */
const layerWin32 = exports.layerWin32 = NodePath.layerWin32;
//# sourceMappingURL=NodePath.js.map