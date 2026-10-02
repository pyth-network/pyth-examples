"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withPreResponseHandler = exports.currentPreResponseHandlers = exports.appendPreResponseHandler = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var _Function = require("effect/Function");
var _GlobalValue = require("effect/GlobalValue");
var Option = _interopRequireWildcard(require("effect/Option"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const currentPreResponseHandlers = exports.currentPreResponseHandlers = /*#__PURE__*/(0, _GlobalValue.globalValue)(/*#__PURE__*/Symbol.for("@effect/platform/HttpApp/preResponseHandlers"), () => FiberRef.unsafeMake(Option.none()));
/** @internal */
const appendPreResponseHandler = handler => FiberRef.update(currentPreResponseHandlers, Option.match({
  onNone: () => Option.some(handler),
  onSome: prev => Option.some((request, response) => Effect.flatMap(prev(request, response), response => handler(request, response)))
}));
/** @internal */
exports.appendPreResponseHandler = appendPreResponseHandler;
const withPreResponseHandler = exports.withPreResponseHandler = /*#__PURE__*/(0, _Function.dual)(2, (self, handler) => Effect.locallyWith(self, currentPreResponseHandlers, Option.match({
  onNone: () => Option.some(handler),
  onSome: prev => Option.some((request, response) => Effect.flatMap(prev(request, response), response => handler(request, response)))
})));
//# sourceMappingURL=httpApp.js.map