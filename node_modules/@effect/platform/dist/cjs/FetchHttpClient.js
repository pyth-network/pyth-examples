"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layer = exports.RequestInit = exports.Fetch = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var internal = _interopRequireWildcard(require("./internal/fetchHttpClient.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category tags
 */
class Fetch extends /*#__PURE__*/Context.Tag(internal.fetchTagKey)() {}
/**
 * @since 1.0.0
 * @category tags
 */
exports.Fetch = Fetch;
class RequestInit extends /*#__PURE__*/Context.Tag(internal.requestInitTagKey)() {}
/**
 * @since 1.0.0
 * @category layers
 */
exports.RequestInit = RequestInit;
const layer = exports.layer = internal.layer;
//# sourceMappingURL=FetchHttpClient.js.map