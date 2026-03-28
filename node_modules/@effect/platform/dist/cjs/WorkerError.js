"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isWorkerError = exports.WorkerErrorTypeId = exports.WorkerError = void 0;
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var internal = _interopRequireWildcard(require("./internal/workerError.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const WorkerErrorTypeId = exports.WorkerErrorTypeId = internal.WorkerErrorTypeId;
/**
 * @since 1.0.0
 * @category predicates
 */
const isWorkerError = u => Predicate.hasProperty(u, WorkerErrorTypeId);
/**
 * @since 1.0.0
 * @category errors
 */
exports.isWorkerError = isWorkerError;
class WorkerError extends /*#__PURE__*/Schema.TaggedError()("WorkerError", {
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
exports.WorkerError = WorkerError;
//# sourceMappingURL=WorkerError.js.map