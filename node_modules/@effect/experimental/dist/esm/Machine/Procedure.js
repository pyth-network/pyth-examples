import { pipeArguments } from "effect/Pipeable";
import * as Predicate from "effect/Predicate";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/Procedure");
/**
 * @since 1.0.0
 * @category type ids
 */
export const SerializableTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/SerializableProcedure");
/**
 * @since 1.0.0
 * @category refinements
 */
export const isSerializable = u => Predicate.hasProperty(u, SerializableTypeId);
/**
 * @since 1.0.0
 * @category symbols
 */
export const NoReply = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/Procedure/NoReply");
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = () => () => (tag, handler) => ({
  [TypeId]: TypeId,
  handler,
  tag,
  pipe() {
    return pipeArguments(this, arguments);
  }
});
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerializable = () => (schema, handler) => ({
  [TypeId]: TypeId,
  [SerializableTypeId]: SerializableTypeId,
  schema: schema,
  handler,
  tag: schema._tag,
  pipe() {
    return pipeArguments(this, arguments);
  }
});
//# sourceMappingURL=Procedure.js.map