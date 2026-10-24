import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category request
 */
export const RequestIdTypeId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcServer/RequestId");
/**
 * @since 1.0.0
 * @category request
 */
export const RequestId = id => typeof id === "bigint" ? id : BigInt(id);
/**
 * @since 1.0.0
 * @category request
 */
export const constEof = {
  _tag: "Eof"
};
/**
 * @since 1.0.0
 * @category request
 */
export const constPing = {
  _tag: "Ping"
};
/**
 * @since 1.0.0
 * @category response
 */
export const ResponseIdTypeId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcServer/ResponseId");
const encodeDefect = /*#__PURE__*/Schema.encodeSync(Schema.Defect);
/**
 * @since 1.0.0
 * @category response
 */
export const ResponseDefectEncoded = input => ({
  _tag: "Defect",
  defect: encodeDefect(input)
});
/**
 * @since 1.0.0
 * @category response
 */
export const constPong = {
  _tag: "Pong"
};
//# sourceMappingURL=RpcMessage.js.map