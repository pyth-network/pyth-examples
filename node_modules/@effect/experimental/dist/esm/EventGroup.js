/**
 * @since 1.0.0
 */
import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import { pipeArguments } from "effect/Pipeable";
import * as Predicate from "effect/Predicate";
import * as Record from "effect/Record";
import * as EventApi from "./Event.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/EventGroup");
/**
 * @since 1.0.0
 * @category guards
 */
export const isEventGroup = u => Predicate.hasProperty(u, TypeId);
const Proto = {
  [TypeId]: TypeId,
  add(options) {
    return makeProto({
      events: {
        ...this.events,
        [options.tag]: EventApi.make(options)
      }
    });
  },
  addError(error) {
    return makeProto({
      events: Record.map(this.events, event => EventApi.make({
        ...event,
        error: HttpApiSchema.UnionUnify(event.error, error)
      }))
    });
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
const makeProto = options => {
  function EventGroup() {}
  Object.setPrototypeOf(EventGroup, Proto);
  return Object.assign(EventGroup, options);
};
/**
 * An `EventGroup` is a collection of `Event`s. You can use an `EventGroup` to
 * represent a portion of your domain.
 *
 * The events can be implemented later using the `EventLog.group` api.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty = /*#__PURE__*/makeProto({
  events: /*#__PURE__*/Record.empty()
});
//# sourceMappingURL=EventGroup.js.map