"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.constPong = exports.constPing = exports.constEof = exports.ResponseIdTypeId = exports.ResponseDefectEncoded = exports.RequestIdTypeId = exports.RequestId = void 0;
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category request
 */
const RequestIdTypeId = exports.RequestIdTypeId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcServer/RequestId");
/**
 * @since 1.0.0
 * @category request
 */
const RequestId = id => typeof id === "bigint" ? id : BigInt(id);
/**
 * @since 1.0.0
 * @category request
 */
exports.RequestId = RequestId;
const constEof = exports.constEof = {
  _tag: "Eof"
};
/**
 * @since 1.0.0
 * @category request
 */
const constPing = exports.constPing = {
  _tag: "Ping"
};
/**
 * @since 1.0.0
 * @category response
 */
const ResponseIdTypeId = exports.ResponseIdTypeId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcServer/ResponseId");
const encodeDefect = /*#__PURE__*/Schema.encodeSync(Schema.Defect);
/**
 * @since 1.0.0
 * @category response
 */
const ResponseDefectEncoded = input => ({
  _tag: "Defect",
  defect: encodeDefect(input)
});
/**
 * @since 1.0.0
 * @category response
 */
exports.ResponseDefectEncoded = ResponseDefectEncoded;
const constPong = exports.constPong = {
  _tag: "Pong"
};
//# sourceMappingURL=RpcMessage.js.map