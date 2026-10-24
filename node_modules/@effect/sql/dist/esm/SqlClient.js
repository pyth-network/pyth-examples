import * as Context from "effect/Context";
import * as internal from "./internal/client.js";
/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId = internal.TypeId;
/**
 * @category models
 * @since 1.0.0
 */
export const SqlClient = internal.clientTag;
/**
 * @category constructors
 * @since 1.0.0
 */
export const make = internal.make;
/**
 * @since 1.0.0
 * @category transactions
 */
export const makeWithTransaction = internal.makeWithTransaction;
/**
 * @since 1.0.0
 */
export const TransactionConnection = internal.TransactionConnection;
/**
 * @since 1.0.0
 */
export class SafeIntegers extends /*#__PURE__*/Context.Reference()("@effect/sql/SqlClient/SafeIntegers", {
  defaultValue: () => false
}) {}
//# sourceMappingURL=SqlClient.js.map