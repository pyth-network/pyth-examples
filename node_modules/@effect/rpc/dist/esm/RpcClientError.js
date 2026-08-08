/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcClientError");
/**
 * @since 1.0.0
 * @category Errors
 */
export class RpcClientError extends /*#__PURE__*/Schema.TaggedError("@effect/rpc/RpcClientError")("RpcClientError", {
  reason: /*#__PURE__*/Schema.Literal("Protocol", "Unknown"),
  message: Schema.String,
  cause: /*#__PURE__*/Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  [TypeId] = TypeId;
}
//# sourceMappingURL=RpcClientError.js.map