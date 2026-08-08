"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withMaxBodySize = exports.schemaHeaders = exports.schemaBodyUrlParams = exports.schemaBodyJson = exports.inspect = exports.TypeId = exports.MaxBodySize = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var FileSystem = _interopRequireWildcard(require("./FileSystem.js"));
var UrlParams = _interopRequireWildcard(require("./UrlParams.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpIncomingMessage");
/**
 * @since 1.0.0
 * @category schema
 */
const schemaBodyJson = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return self => Effect.flatMap(self.json, parse);
};
/**
 * @since 1.0.0
 * @category schema
 */
exports.schemaBodyJson = schemaBodyJson;
const schemaBodyUrlParams = (schema, options) => {
  const decode = UrlParams.schemaStruct(schema, options);
  return self => Effect.flatMap(self.urlParamsBody, decode);
};
/**
 * @since 1.0.0
 * @category schema
 */
exports.schemaBodyUrlParams = schemaBodyUrlParams;
const schemaHeaders = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return self => parse(self.headers);
};
/**
 * @since 1.0.0
 * @category fiber refs
 */
exports.schemaHeaders = schemaHeaders;
class MaxBodySize extends /*#__PURE__*/Context.Reference()("@effect/platform/HttpIncomingMessage/MaxBodySize", {
  defaultValue: Option.none
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
exports.MaxBodySize = MaxBodySize;
const withMaxBodySize = exports.withMaxBodySize = /*#__PURE__*/(0, _Function.dual)(2, (effect, size) => Effect.provideService(effect, MaxBodySize, Option.map(size, FileSystem.Size)));
/**
 * @since 1.0.0
 */
const inspect = (self, that) => {
  const contentType = self.headers["content-type"] ?? "";
  let body;
  if (contentType.includes("application/json")) {
    try {
      body = Effect.runSync(self.json);
    } catch {
      //
    }
  } else if (contentType.includes("text/") || contentType.includes("urlencoded")) {
    try {
      body = Effect.runSync(self.text);
    } catch {
      //
    }
  }
  const obj = {
    ...that,
    headers: Inspectable.redact(self.headers),
    remoteAddress: self.remoteAddress.toJSON()
  };
  if (body !== undefined) {
    obj.body = body;
  }
  return obj;
};
exports.inspect = inspect;
//# sourceMappingURL=HttpIncomingMessage.js.map