"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HttpServerRequest = void 0;
Object.defineProperty(exports, "MaxBodySize", {
  enumerable: true,
  get: function () {
    return _HttpIncomingMessage.MaxBodySize;
  }
});
exports.upgradeChannel = exports.upgrade = exports.toURL = exports.searchParamsFromURL = exports.schemaSearchParams = exports.schemaHeaders = exports.schemaCookies = exports.schemaBodyUrlParams = exports.schemaBodyMultipart = exports.schemaBodyJson = exports.schemaBodyFormJson = exports.schemaBodyForm = exports.persistedMultipart = exports.fromWeb = exports.TypeId = exports.ParsedSearchParams = void 0;
Object.defineProperty(exports, "withMaxBodySize", {
  enumerable: true,
  get: function () {
    return _HttpIncomingMessage.withMaxBodySize;
  }
});
var internal = _interopRequireWildcard(require("./internal/httpServerRequest.js"));
var _HttpIncomingMessage = require("./HttpIncomingMessage.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category context
 */
const HttpServerRequest = exports.HttpServerRequest = internal.serverRequestTag;
/**
 * @since 1.0.0
 * @category search params
 */
const ParsedSearchParams = exports.ParsedSearchParams = internal.parsedSearchParamsTag;
/**
 * @since 1.0.0
 * @category search params
 */
const searchParamsFromURL = exports.searchParamsFromURL = internal.searchParamsFromURL;
/**
 * @since 1.0.0
 * @category accessors
 */
const persistedMultipart = exports.persistedMultipart = internal.multipartPersisted;
/**
 * @since 1.0.0
 * @category accessors
 */
const upgrade = exports.upgrade = internal.upgrade;
/**
 * @since 1.0.0
 * @category accessors
 */
const upgradeChannel = exports.upgradeChannel = internal.upgradeChannel;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaCookies = exports.schemaCookies = internal.schemaCookies;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaHeaders = exports.schemaHeaders = internal.schemaHeaders;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaSearchParams = exports.schemaSearchParams = internal.schemaSearchParams;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaBodyJson = exports.schemaBodyJson = internal.schemaBodyJson;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaBodyForm = exports.schemaBodyForm = internal.schemaBodyForm;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaBodyUrlParams = exports.schemaBodyUrlParams = internal.schemaBodyUrlParams;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaBodyMultipart = exports.schemaBodyMultipart = internal.schemaBodyMultipart;
/**
 * @since 1.0.0
 * @category schema
 */
const schemaBodyFormJson = exports.schemaBodyFormJson = internal.schemaBodyFormJson;
/**
 * @since 1.0.0
 * @category conversions
 */
const fromWeb = exports.fromWeb = internal.fromWeb;
/**
 * @since 1.0.0
 * @category conversions
 */
const toURL = exports.toURL = internal.toURL;
//# sourceMappingURL=HttpServerRequest.js.map