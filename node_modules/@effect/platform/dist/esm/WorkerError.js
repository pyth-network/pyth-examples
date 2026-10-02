import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as internal from "./internal/workerError.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const WorkerErrorTypeId = internal.WorkerErrorTypeId;
/**
 * @since 1.0.0
 * @category predicates
 */
export const isWorkerError = u => Predicate.hasProperty(u, WorkerErrorTypeId);
/**
 * @since 1.0.0
 * @category errors
 */
export class WorkerError extends /*#__PURE__*/Schema.TaggedError()("WorkerError", {
  reason: /*#__PURE__*/Schema.Literal("spawn", "decode", "send", "unknown", "encode"),
  cause: Schema.Defect
}) {
  /**
   * @since 1.0.0
   */
  [WorkerErrorTypeId] = WorkerErrorTypeId;
  /**
   * @since 1.0.0
   */
  static Cause = /*#__PURE__*/Schema.Cause({
    error: this,
    defect: Schema.Defect
  });
  /**
   * @since 1.0.0
   */
  static encodeCause = /*#__PURE__*/Schema.encodeSync(this.Cause);
  /**
   * @since 1.0.0
   */
  static decodeCause = /*#__PURE__*/Schema.decodeSync(this.Cause);
  /**
   * @since 1.0.0
   */
  get message() {
    switch (this.reason) {
      case "send":
        return "An error occurred calling .postMessage";
      case "spawn":
        return "An error occurred while spawning a worker";
      case "decode":
        return "An error occurred during decoding";
      case "encode":
        return "An error occurred during encoding";
      case "unknown":
        return "An unexpected error occurred";
    }
  }
}
//# sourceMappingURL=WorkerError.js.map