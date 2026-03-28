"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.isEvent = exports.TypeId = void 0;
var MsgPack = _interopRequireWildcard(require("@effect/platform/MsgPack"));
var _Pipeable = require("effect/Pipeable");
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Event");
/**
 * @since 1.0.0
 * @category guards
 */
const isEvent = u => Predicate.hasProperty(u, TypeId);
exports.isEvent = isEvent;
const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
};
/**
 * @since 1.0.0
 * @category constructors
 */
const make = options => Object.assign(Object.create(Proto), {
  tag: options.tag,
  primaryKey: options.primaryKey,
  payload: options.payload ?? Schema.Void,
  payloadMsgPack: MsgPack.schema(options.payload ?? Schema.Void),
  success: options.success ?? Schema.Void,
  error: options.error ?? Schema.Never
});
exports.make = make;
//# sourceMappingURL=Event.js.map