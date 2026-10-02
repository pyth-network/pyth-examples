"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toString = exports.layerWeak = exports.layer = exports.GeneratorTypeId = exports.Generator = void 0;
var internal = _interopRequireWildcard(require("./internal/etag.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category convertions
 */
const toString = exports.toString = internal.toString;
/**
 * @since 1.0.0
 * @category type ids
 */
const GeneratorTypeId = exports.GeneratorTypeId = internal.GeneratorTypeId;
/**
 * @since 1.0.0
 * @category tags
 */
const Generator = exports.Generator = internal.tag;
/**
 * @since 1.0.0
 * @category layers
 */
const layer = exports.layer = internal.layer;
/**
 * @since 1.0.0
 * @category layers
 */
const layerWeak = exports.layerWeak = internal.layerWeak;
//# sourceMappingURL=Etag.js.map