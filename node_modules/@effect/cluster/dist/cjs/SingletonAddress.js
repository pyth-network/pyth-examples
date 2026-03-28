"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TypeId = exports.SingletonAddress = void 0;
var Equal = _interopRequireWildcard(require("effect/Equal"));
var Hash = _interopRequireWildcard(require("effect/Hash"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var _ShardId = require("./ShardId.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category Address
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/cluster/SingletonAddress");
/**
 * Represents the unique address of an singleton within the cluster.
 *
 * @since 1.0.0
 * @category Address
 */
class SingletonAddress extends /*#__PURE__*/Schema.Class("@effect/cluster/SingletonAddress")({
  shardId: _ShardId.ShardId,
  name: Schema.NonEmptyTrimmedString
}) {
  /**
   * @since 1.0.0
   */
  [TypeId] = TypeId;
  /**
   * @since 1.0.0
   */
  [Hash.symbol]() {
    return Hash.cached(this)(Hash.string(`${this.name}:${this.shardId.toString()}`));
  }
  /**
   * @since 1.0.0
   */
  [Equal.symbol](that) {
    return this.name === that.name && this.shardId[Equal.symbol](that.shardId);
  }
}
exports.SingletonAddress = SingletonAddress;
//# sourceMappingURL=SingletonAddress.js.map