/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
/**
 * @since 1.0.0
 */
export const SqlErrorTypeId = /*#__PURE__*/Symbol.for("@effect/sql/SqlError");
/**
 * @since 1.0.0
 */
export class SqlError extends /*#__PURE__*/TypeIdError(SqlErrorTypeId, "SqlError") {}
/**
 * @since 1.0.0
 */
export class ResultLengthMismatch extends /*#__PURE__*/TypeIdError(SqlErrorTypeId, "ResultLengthMismatch") {
  get message() {
    return `Expected ${this.expected} results but got ${this.actual}`;
  }
}
//# sourceMappingURL=SqlError.js.map