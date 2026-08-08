import { hasProperty } from "effect/Predicate";
/**
 * @since 1.0.0
 * @category symbols
 */
export const symbol = /*#__PURE__*/Symbol.for("@effect/cluster/DeliverAt");
/**
 * @since 1.0.0
 * @category guards
 */
export const isDeliverAt = self => hasProperty(self, symbol);
/**
 * @since 1.0.0
 * @category accessors
 */
export const toMillis = self => {
  if (isDeliverAt(self)) {
    return self[symbol]().epochMillis;
  }
  return null;
};
//# sourceMappingURL=DeliverAt.js.map