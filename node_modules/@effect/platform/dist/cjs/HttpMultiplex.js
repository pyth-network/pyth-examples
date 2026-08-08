"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.hostStartsWith = exports.hostRegex = exports.hostExact = exports.hostEndsWith = exports.headerStartsWith = exports.headerRegex = exports.headerExact = exports.headerEndsWith = exports.empty = exports.add = exports.TypeId = void 0;
var internal = _interopRequireWildcard(require("./internal/httpMultiplex.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category constructors
 */
const empty = exports.empty = internal.empty;
/**
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = internal.make;
/**
 * @since 1.0.0
 * @category combinators
 */
const add = exports.add = internal.add;
/**
 * @since 1.0.0
 * @category combinators
 */
const headerExact = exports.headerExact = internal.headerExact;
/**
 * @since 1.0.0
 * @category combinators
 */
const headerRegex = exports.headerRegex = internal.headerRegex;
/**
 * @since 1.0.0
 * @category combinators
 */
const headerStartsWith = exports.headerStartsWith = internal.headerStartsWith;
/**
 * @since 1.0.0
 * @category combinators
 */
const headerEndsWith = exports.headerEndsWith = internal.headerEndsWith;
/**
 * @since 1.0.0
 * @category combinators
 */
const hostExact = exports.hostExact = internal.hostExact;
/**
 * @since 1.0.0
 * @category combinators
 */
const hostRegex = exports.hostRegex = internal.hostRegex;
/**
 * @since 1.0.0
 * @category combinators
 */
const hostStartsWith = exports.hostStartsWith = internal.hostStartsWith;
/**
 * @since 1.0.0
 * @category combinators
 */
const hostEndsWith = exports.hostEndsWith = internal.hostEndsWith;
//# sourceMappingURL=HttpMultiplex.js.map