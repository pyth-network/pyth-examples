import * as Data from "effect/Data";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/Error");
/**
 * @since 1.0.0
 * @category refinements
 */
export const isPlatformError = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category error
 */
export const TypeIdError = (typeId, tag) => {
  class Base extends Data.Error {
    _tag = tag;
  }
  ;
  Base.prototype[typeId] = typeId;
  Base.prototype.name = tag;
  return Base;
};
/**
 * @since 1.0.0
 * @category Models
 */
export const Module = /*#__PURE__*/Schema.Literal("Clipboard", "Command", "FileSystem", "KeyValueStore", "Path", "Stream", "Terminal");
/**
 * @since 1.0.0
 * @category Models
 */
export class BadArgument extends /*#__PURE__*/Schema.TaggedError("@effect/platform/Error/BadArgument")("BadArgument", {
  module: Module,
  method: Schema.String,
  description: /*#__PURE__*/Schema.optional(Schema.String),
  cause: /*#__PURE__*/Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  [TypeId] = TypeId;
  /**
   * @since 1.0.0
   */
  get message() {
    return `${this.module}.${this.method}${this.description ? `: ${this.description}` : ""}`;
  }
}
/**
 * @since 1.0.0
 * @category Model
 */
export const SystemErrorReason = /*#__PURE__*/Schema.Literal("AlreadyExists", "BadResource", "Busy", "InvalidData", "NotFound", "PermissionDenied", "TimedOut", "UnexpectedEof", "Unknown", "WouldBlock", "WriteZero");
/**
 * @since 1.0.0
 * @category models
 */
export class SystemError extends /*#__PURE__*/Schema.TaggedError("@effect/platform/Error/SystemError")("SystemError", {
  reason: SystemErrorReason,
  module: Module,
  method: Schema.String,
  description: /*#__PURE__*/Schema.optional(Schema.String),
  syscall: /*#__PURE__*/Schema.optional(Schema.String),
  pathOrDescriptor: /*#__PURE__*/Schema.optional(/*#__PURE__*/Schema.Union(Schema.String, Schema.Number)),
  cause: /*#__PURE__*/Schema.optional(Schema.Defect)
}) {
  /**
   * @since 1.0.0
   */
  [TypeId] = TypeId;
  /**
   * @since 1.0.0
   */
  get message() {
    return `${this.reason}: ${this.module}.${this.method}${this.pathOrDescriptor !== undefined ? ` (${this.pathOrDescriptor})` : ""}${this.description ? `: ${this.description}` : ""}`;
  }
}
/**
 * @since 1.0.0
 * @category Models
 */
export const PlatformError = /*#__PURE__*/Schema.Union(BadArgument, SystemError);
//# sourceMappingURL=Error.js.map