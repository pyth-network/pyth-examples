"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.void = exports.single = exports.findOne = exports.findAll = void 0;
var Cause = _interopRequireWildcard(require("effect/Cause"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * Run a sql query with a request schema and a result schema.
 *
 * @since 1.0.0
 * @category constructor
 */
const findAll = options => {
  const encodeRequest = Schema.encode(options.Request);
  const decode = Schema.decodeUnknown(Schema.Array(options.Result));
  return request => Effect.flatMap(Effect.flatMap(encodeRequest(request), options.execute), decode);
};
exports.findAll = findAll;
const void_ = options => {
  const encode = Schema.encode(options.Request);
  return request => Effect.asVoid(Effect.flatMap(encode(request), options.execute));
};
exports.void = void_;
/**
 * Run a sql query with a request schema and a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
const findOne = options => {
  const encodeRequest = Schema.encode(options.Request);
  const decode = Schema.decodeUnknown(options.Result);
  return request => Effect.flatMap(Effect.flatMap(encodeRequest(request), options.execute), arr => Array.isArray(arr) && arr.length > 0 ? Effect.asSome(decode(arr[0])) : Effect.succeedNone);
};
/**
 * Run a sql query with a request schema and a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
exports.findOne = findOne;
const single = options => {
  const encodeRequest = Schema.encode(options.Request);
  const decode = Schema.decodeUnknown(options.Result);
  return request => Effect.flatMap(Effect.flatMap(encodeRequest(request), options.execute), arr => Array.isArray(arr) && arr.length > 0 ? decode(arr[0]) : Effect.fail(new Cause.NoSuchElementException()));
};
exports.single = single;
//# sourceMappingURL=SqlSchema.js.map