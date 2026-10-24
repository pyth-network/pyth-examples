/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import { hasProperty } from "effect/Predicate";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiMiddleware");
/**
 * @since 1.0.0
 * @category type ids
 */
export const SecurityTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiMiddleware/Security");
/**
 * @since 1.0.0
 * @category guards
 */
export const isSecurity = u => hasProperty(u, SecurityTypeId);
/**
 * @since 1.0.0
 * @category tags
 */
export const Tag = () => (id, options) => {
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
//# sourceMappingURL=HttpApiMiddleware.js.map