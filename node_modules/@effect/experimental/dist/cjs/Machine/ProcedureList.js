"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withInitialState = exports.make = exports.addProcedurePrivate = exports.addProcedure = exports.addPrivate = exports.add = exports.TypeId = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Effectable = _interopRequireWildcard(require("effect/Effectable"));
var _Function = require("effect/Function");
var Procedure = _interopRequireWildcard(require("./Procedure.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/Machine/ProcedureList");
const Proto = {
  ...Effectable.CommitPrototype,
  [TypeId]: TypeId,
  commit() {
    return Effect.succeed(this);
  }
};
const makeProto = options => Object.assign(Object.create(Proto), options);
/**
 * @since 1.0.0
 * @category constructors
 */
const make = (initialState, options) => makeProto({
  initialState,
  public: [],
  private: [],
  identifier: options?.identifier ?? "Unknown"
});
/**
 * @since 1.0.0
 * @category combinators
 */
exports.make = make;
const addProcedure = exports.addProcedure = /*#__PURE__*/(0, _Function.dual)(2, (self, procedure) => makeProto({
  ...self,
  public: [...self.public, procedure]
}));
/**
 * @since 1.0.0
 * @category combinators
 */
const addProcedurePrivate = exports.addProcedurePrivate = /*#__PURE__*/(0, _Function.dual)(2, (self, procedure) => makeProto({
  ...self,
  private: [...self.private, procedure]
}));
/**
 * @since 1.0.0
 * @category combinators
 */
const add = () => (0, _Function.dual)(3, (self, tag, handler) => addProcedure(self, Procedure.make()()(tag, handler)));
/**
 * @since 1.0.0
 * @category combinators
 */
exports.add = add;
const addPrivate = () => (0, _Function.dual)(3, (self, tag, handler) => addProcedurePrivate(self, Procedure.make()()(tag, handler)));
/**
 * @since 1.0.0
 * @category combinators
 */
exports.addPrivate = addPrivate;
const withInitialState = exports.withInitialState = /*#__PURE__*/(0, _Function.dual)(2, (self, initialState) => makeProto({
  ...self,
  initialState
}));
//# sourceMappingURL=ProcedureList.js.map