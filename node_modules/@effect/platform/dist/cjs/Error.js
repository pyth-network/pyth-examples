"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isPlatformError = exports.TypeIdError = exports.TypeId = exports.SystemErrorReason = exports.SystemError = exports.PlatformError = exports.Module = exports.BadArgument = void 0;
var Data = _interopRequireWildcard(require("effect/Data"));
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type id
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/Error");
/**
 * @since 1.0.0
 * @category refinements
 */
const isPlatformError = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category error
 */
exports.isPlatformError = isPlatformError;
const TypeIdError = (typeId, tag) => {
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
exports.TypeIdError = TypeIdError;
const Module = exports.Module = /*#__PURE__*/Schema.Literal("Clipboard", "Command", "FileSystem", "KeyValueStore", "Path", "Stream", "Terminal");
/**
 * @since 1.0.0
 * @category Models
 */
class BadArgument extends /*#__PURE__*/Schema.TaggedError("@effect/platform/Error/BadArgument")("BadArgument", {
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
exports.BadArgument = BadArgument;
const SystemErrorReason = exports.SystemErrorReason = /*#__PURE__*/Schema.Literal("AlreadyExists", "BadResource", "Busy", "InvalidData", "NotFound", "PermissionDenied", "TimedOut", "UnexpectedEof", "Unknown", "WouldBlock", "WriteZero");
/**
 * @since 1.0.0
 * @category models
 */
class SystemError extends /*#__PURE__*/Schema.TaggedError("@effect/platform/Error/SystemError")("SystemError", {
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
exports.SystemError = SystemError;
const PlatformError = exports.PlatformError = /*#__PURE__*/Schema.Union(BadArgument, SystemError);
//# sourceMappingURL=Error.js.map