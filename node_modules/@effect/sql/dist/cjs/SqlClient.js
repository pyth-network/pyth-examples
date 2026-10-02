"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeWithTransaction = exports.make = exports.TypeId = exports.TransactionConnection = exports.SqlClient = exports.SafeIntegers = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var internal = _interopRequireWildcard(require("./internal/client.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @category type ids
 * @since 1.0.0
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @category models
 * @since 1.0.0
 */
const SqlClient = exports.SqlClient = internal.clientTag;
/**
 * @category constructors
 * @since 1.0.0
 */
const make = exports.make = internal.make;
/**
 * @since 1.0.0
 * @category transactions
 */
const makeWithTransaction = exports.makeWithTransaction = internal.makeWithTransaction;
/**
 * @since 1.0.0
 */
const TransactionConnection = exports.TransactionConnection = internal.TransactionConnection;
/**
 * @since 1.0.0
 */
class SafeIntegers extends /*#__PURE__*/Context.Reference()("@effect/sql/SqlClient/SafeIntegers", {
  defaultValue: () => false
}) {}
exports.SafeIntegers = SafeIntegers;
//# sourceMappingURL=SqlClient.js.map