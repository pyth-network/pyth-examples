"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.match = exports.SingletonRegistered = exports.EntityRegistered = void 0;
var Data = _interopRequireWildcard(require("effect/Data"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category pattern matching
 */
const {
  /**
   * @since 1.0.0
   * @category pattern matching
   */
  $match: match,
  /**
   * @since 1.0.0
   * @category constructors
   */
  EntityRegistered,
  /**
   * @since 1.0.0
   * @category constructors
   */
  SingletonRegistered
} = /*#__PURE__*/Data.taggedEnum();
exports.SingletonRegistered = SingletonRegistered;
exports.EntityRegistered = EntityRegistered;
exports.match = match;
//# sourceMappingURL=ShardingRegistrationEvent.js.map