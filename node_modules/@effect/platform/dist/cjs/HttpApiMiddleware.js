"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSecurity = exports.TypeId = exports.Tag = exports.SecurityTypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var _Predicate = require("effect/Predicate");
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiMiddleware");
/**
 * @since 1.0.0
 * @category type ids
 */
const SecurityTypeId = exports.SecurityTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiMiddleware/Security");
/**
 * @since 1.0.0
 * @category guards
 */
const isSecurity = u => (0, _Predicate.hasProperty)(u, SecurityTypeId);
/**
 * @since 1.0.0
 * @category tags
 */
exports.isSecurity = isSecurity;
const Tag = () => (id, options) => {
  const Err = globalThis.Error;
  const limit = Err.stackTraceLimit;
  Err.stackTraceLimit = 2;
  const creationError = new Err();
  Err.stackTraceLimit = limit;
  function TagClass() {}
  const TagClass_ = TagClass;
  Object.setPrototypeOf(TagClass, Object.getPrototypeOf(Context.GenericTag(id)));
  TagClass.key = id;
  Object.defineProperty(TagClass, "stack", {
    get() {
      return creationError.stack;
    }
  });
  TagClass_[TypeId] = TypeId;
  TagClass_.failure = options?.optional === true || options?.failure === undefined ? Schema.Never : options.failure;
  if (options?.provides) {
    TagClass_.provides = options.provides;
  }
  TagClass_.optional = options?.optional ?? false;
  if (options?.security) {
    if (Object.keys(options.security).length === 0) {
      throw new Error("HttpApiMiddleware.Tag: security object must not be empty");
    }
    TagClass_[SecurityTypeId] = SecurityTypeId;
    TagClass_.security = options.security;
  }
  return TagClass;
};
exports.Tag = Tag;
//# sourceMappingURL=HttpApiMiddleware.js.map