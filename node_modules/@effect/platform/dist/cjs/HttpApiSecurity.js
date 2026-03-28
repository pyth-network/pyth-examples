"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bearer = exports.basic = exports.apiKey = exports.annotateContext = exports.annotate = exports.TypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var _Function = require("effect/Function");
var _Pipeable = require("effect/Pipeable");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSecurity");
const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
};
/**
 * Create an Bearer token security scheme.
 *
 * You can implement some api middleware for this security scheme using
 * `HttpApiBuilder.middlewareSecurity`.
 *
 * @since 1.0.0
 * @category constructors
 */
const bearer = exports.bearer = /*#__PURE__*/Object.assign(/*#__PURE__*/Object.create(Proto), {
  _tag: "Bearer",
  annotations: /*#__PURE__*/Context.empty()
});
/**
 * Create an API key security scheme.
 *
 * You can implement some api middleware for this security scheme using
 * `HttpApiBuilder.middlewareSecurity`.
 *
 * To set the correct cookie in a handler, you can use
 * `HttpApiBuilder.securitySetCookie`.
 *
 * The default value for `in` is "header".
 *
 * @since 1.0.0
 * @category constructors
 */
const apiKey = options => Object.assign(Object.create(Proto), {
  _tag: "ApiKey",
  key: options.key,
  in: options.in ?? "header",
  annotations: Context.empty()
});
/**
 * @since 1.0.0
 * @category constructors
 */
exports.apiKey = apiKey;
const basic = exports.basic = /*#__PURE__*/Object.assign(/*#__PURE__*/Object.create(Proto), {
  _tag: "Basic",
  annotations: /*#__PURE__*/Context.empty()
});
/**
 * @since 1.0.0
 * @category annotations
 */
const annotateContext = exports.annotateContext = /*#__PURE__*/(0, _Function.dual)(2, (self, context) => Object.assign(Object.create(Proto), {
  ...self,
  annotations: Context.merge(self.annotations, context)
}));
/**
 * @since 1.0.0
 * @category annotations
 */
const annotate = exports.annotate = /*#__PURE__*/(0, _Function.dual)(3, (self, tag, value) => Object.assign(Object.create(Proto), {
  ...self,
  annotations: Context.add(self.annotations, tag, value)
}));
//# sourceMappingURL=HttpApiSecurity.js.map