"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toMillis = exports.symbol = exports.isDeliverAt = void 0;
var _Predicate = require("effect/Predicate");
/**
 * @since 1.0.0
 * @category symbols
 */
const symbol = exports.symbol = /*#__PURE__*/Symbol.for("@effect/cluster/DeliverAt");
/**
 * @since 1.0.0
 * @category guards
 */
const isDeliverAt = self => (0, _Predicate.hasProperty)(self, symbol);
/**
 * @since 1.0.0
 * @category accessors
 */
exports.isDeliverAt = isDeliverAt;
const toMillis = self => {
  if (isDeliverAt(self)) {
    return self[symbol]().epochMillis;
  }
  return null;
};
exports.toMillis = toMillis;
//# sourceMappingURL=DeliverAt.js.map