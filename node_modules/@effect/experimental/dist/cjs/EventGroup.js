"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isEventGroup = exports.empty = exports.TypeId = void 0;
var HttpApiSchema = _interopRequireWildcard(require("@effect/platform/HttpApiSchema"));
var _Pipeable = require("effect/Pipeable");
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Record = _interopRequireWildcard(require("effect/Record"));
var EventApi = _interopRequireWildcard(require("./Event.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/EventGroup");
/**
 * @since 1.0.0
 * @category guards
 */
const isEventGroup = u => Predicate.hasProperty(u, TypeId);
exports.isEventGroup = isEventGroup;
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
    return (0, _Pipeable.pipeArguments)(this, arguments);
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
const empty = exports.empty = /*#__PURE__*/makeProto({
  events: /*#__PURE__*/Record.empty()
});
//# sourceMappingURL=EventGroup.js.map