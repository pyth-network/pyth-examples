"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SqlErrorTypeId = exports.SqlError = exports.ResultLengthMismatch = void 0;
var _Error = require("@effect/platform/Error");
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
const SqlErrorTypeId = exports.SqlErrorTypeId = /*#__PURE__*/Symbol.for("@effect/sql/SqlError");
/**
 * @since 1.0.0
 */
class SqlError extends /*#__PURE__*/(0, _Error.TypeIdError)(SqlErrorTypeId, "SqlError") {}
/**
 * @since 1.0.0
 */
exports.SqlError = SqlError;
class ResultLengthMismatch extends /*#__PURE__*/(0, _Error.TypeIdError)(SqlErrorTypeId, "ResultLengthMismatch") {
  get message() {
    return `Expected ${this.expected} results but got ${this.actual}`;
  }
}
exports.ResultLengthMismatch = ResultLengthMismatch;
//# sourceMappingURL=SqlError.js.map