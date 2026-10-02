"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stream = exports.persisted = exports.fileToReadable = void 0;
var internal = _interopRequireWildcard(require("./internal/multipart.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category constructors
 */
const stream = exports.stream = internal.stream;
/**
 * @since 1.0.0
 * @category constructors
 */
const persisted = exports.persisted = internal.persisted;
/**
 * @since 1.0.0
 * @category conversions
 */
const fileToReadable = exports.fileToReadable = internal.fileToReadable;
//# sourceMappingURL=NodeMultipart.js.map