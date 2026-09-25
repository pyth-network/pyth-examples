"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withInitialState = exports.make = exports.addPrivate = exports.add = void 0;
var _Function = require("effect/Function");
var Procedure = _interopRequireWildcard(require("./Procedure.js"));
var ProcedureList = _interopRequireWildcard(require("./ProcedureList.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = ProcedureList.make;
/**
 * @since 1.0.0
 * @category combinators
 */
const add = exports.add = /*#__PURE__*/(0, _Function.dual)(3, (self, schema, handler) => ProcedureList.addProcedure(self, Procedure.makeSerializable()(schema, handler)));
/**
 * @since 1.0.0
 * @category combinators
 */
const addPrivate = exports.addPrivate = /*#__PURE__*/(0, _Function.dual)(3, (self, schema, handler) => ProcedureList.addProcedurePrivate(self, Procedure.makeSerializable()(schema, handler)));
/**
 * @since 1.0.0
 * @category combinators
 */
const withInitialState = exports.withInitialState = ProcedureList.withInitialState;
//# sourceMappingURL=SerializableProcedureList.js.map