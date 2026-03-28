/**
 * @since 1.0.0
 */
import * as MsgPack from "@effect/platform/MsgPack";
import { pipeArguments } from "effect/Pipeable";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Event");
/**
 * @since 1.0.0
 * @category guards
 */
export const isEvent = u => Predicate.hasProperty(u, TypeId);
const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments);
  }
};
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = options => Object.assign(Object.create(Proto), {
  tag: options.tag,
  primaryKey: options.primaryKey,
  payload: options.payload ?? Schema.Void,
  payloadMsgPack: MsgPack.schema(options.payload ?? Schema.Void),
  success: options.success ?? Schema.Void,
  error: options.error ?? Schema.Never
});
//# sourceMappingURL=Event.js.map