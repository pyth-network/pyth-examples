/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
/**
 * @since 1.0.0
 * @category tags
 */
export class SocketServer extends /*#__PURE__*/Context.Tag("@effect/platform/SocketServer")() {}
/**
 * @since 1.0.0
 * @category errors
 */
export const ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/SocketServer/SocketServerError");
/**
 * @since 1.0.0
 * @category errors
 */
export class SocketServerError extends /*#__PURE__*/Data.TaggedError("SocketServerError") {
  /**
   * @since 1.0.0
   */
  [ErrorTypeId] = ErrorTypeId;
  /**
   * @since 1.0.0
   */
  get message() {
    return this.reason;
  }
}
//# sourceMappingURL=SocketServer.js.map