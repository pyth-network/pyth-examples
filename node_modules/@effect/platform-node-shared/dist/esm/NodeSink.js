import { SystemError } from "@effect/platform/Error";
import * as internal from "./internal/sink.js";
/**
 * @category constructor
 * @since 1.0.0
 */
export const fromWritable = internal.fromWritable;
/**
 * @category constructor
 * @since 1.0.0
 */
export const fromWritableChannel = internal.fromWritableChannel;
/**
 * @category stdio
 * @since 1.0.0
 */
export const stdout = /*#__PURE__*/fromWritable(() => process.stdout, cause => new SystemError({
  module: "Stream",
  method: "stdout",
  reason: "Unknown",
  cause
}));
/**
 * @category stdio
 * @since 1.0.0
 */
export const stderr = /*#__PURE__*/fromWritable(() => process.stderr, cause => new SystemError({
  module: "Stream",
  method: "stderr",
  reason: "Unknown",
  cause
}));
/**
 * @category stdio
 * @since 1.0.0
 */
export const stdin = /*#__PURE__*/fromWritable(() => process.stdin, cause => new SystemError({
  module: "Stream",
  method: "stdin",
  reason: "Unknown",
  cause
}));
//# sourceMappingURL=NodeSink.js.map