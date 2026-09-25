"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeSerializable = exports.make = exports.isSerializable = exports.TypeId = exports.SerializableTypeId = exports.NoReply = void 0;
var _Pipeable = require("effect/Pipeable");
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/Procedure");
/**
 * @since 1.0.0
 * @category type ids
 */
const SerializableTypeId = exports.SerializableTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/SerializableProcedure");
/**
 * @since 1.0.0
 * @category refinements
 */
const isSerializable = u => Predicate.hasProperty(u, SerializableTypeId);
/**
 * @since 1.0.0
 * @category symbols
 */
exports.isSerializable = isSerializable;
const NoReply = exports.NoReply = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/Procedure/NoReply");
/**
 * @since 1.0.0
 * @category constructors
 */
const make = () => () => (tag, handler) => ({
  [TypeId]: TypeId,
  handler,
  tag,
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
});
/**
 * @since 1.0.0
 * @category constructors
 */
exports.make = make;
const makeSerializable = () => (schema, handler) => ({
  [TypeId]: TypeId,
  [SerializableTypeId]: SerializableTypeId,
  schema: schema,
  handler,
  tag: schema._tag,
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
});
exports.makeSerializable = makeSerializable;
//# sourceMappingURL=Procedure.js.map