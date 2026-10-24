"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.matchStatus = exports.fromWeb = exports.filterStatusOk = exports.filterStatus = exports.TypeId = void 0;
Object.defineProperty(exports, "schemaBodyJson", {
  enumerable: true,
  get: function () {
    return _HttpIncomingMessage.schemaBodyJson;
  }
});
Object.defineProperty(exports, "schemaBodyUrlParams", {
  enumerable: true,
  get: function () {
    return _HttpIncomingMessage.schemaBodyUrlParams;
  }
});
Object.defineProperty(exports, "schemaHeaders", {
  enumerable: true,
  get: function () {
    return _HttpIncomingMessage.schemaHeaders;
  }
});
exports.stream = exports.schemaNoBody = exports.schemaJson = void 0;
var internal = _interopRequireWildcard(require("./internal/httpClientResponse.js"));
var _HttpIncomingMessage = require("./HttpIncomingMessage.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category constructors
 */
const fromWeb = exports.fromWeb = internal.fromWeb;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaJson = exports.schemaJson = internal.schemaJson;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaNoBody = exports.schemaNoBody = internal.schemaNoBody;
/**
 * @since 1.0.0
 * @category accessors
 */
const stream = exports.stream = internal.stream;
/**
 * @since 1.0.0
 * @category pattern matching
 */
const matchStatus = exports.matchStatus = internal.matchStatus;
/**
 * @since 1.0.0
 * @category filters
 */
const filterStatus = exports.filterStatus = internal.filterStatus;
/**
 * @since 1.0.0
 * @category filters
 */
const filterStatusOk = exports.filterStatusOk = internal.filterStatusOk;
//# sourceMappingURL=HttpClientResponse.js.map