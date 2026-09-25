"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateUrl = exports.toUrl = exports.setUrlParams = exports.setUrlParam = exports.setUrl = exports.setMethod = exports.setHeaders = exports.setHeader = exports.setHash = exports.setBody = exports.schemaBodyJson = exports.removeHash = exports.put = exports.prependUrl = exports.post = exports.patch = exports.options = exports.modify = exports.make = exports.head = exports.get = exports.del = exports.bodyUrlParams = exports.bodyUnsafeJson = exports.bodyUint8Array = exports.bodyText = exports.bodyStream = exports.bodyJson = exports.bodyFormDataRecord = exports.bodyFormData = exports.bodyFileWeb = exports.bodyFile = exports.bearerToken = exports.basicAuth = exports.appendUrlParams = exports.appendUrlParam = exports.appendUrl = exports.acceptJson = exports.accept = exports.TypeId = void 0;
var internal = _interopRequireWildcard(require("./internal/httpClientRequest.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpClientRequest");
/**
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = internal.make;
/**
 * @since 1.0.0
 * @category constructors
 */
const get = exports.get = internal.get;
/**
 * @since 1.0.0
 * @category constructors
 */
const post = exports.post = internal.post;
/**
 * @since 1.0.0
 * @category constructors
 */
const patch = exports.patch = internal.patch;
/**
 * @since 1.0.0
 * @category constructors
 */
const put = exports.put = internal.put;
/**
 * @since 1.0.0
 * @category constructors
 */
const del = exports.del = internal.del;
/**
 * @since 1.0.0
 * @category constructors
 */
const head = exports.head = internal.head;
/**
 * @since 1.0.0
 * @category constructors
 */
const options = exports.options = internal.options;
/**
 * @since 1.0.0
 * @category combinators
 */
const modify = exports.modify = internal.modify;
/**
 * @since 1.0.0
 * @category combinators
 */
const setMethod = exports.setMethod = internal.setMethod;
/**
 * @since 1.0.0
 * @category combinators
 */
const setHeader = exports.setHeader = internal.setHeader;
/**
 * @since 1.0.0
 * @category combinators
 */
const setHeaders = exports.setHeaders = internal.setHeaders;
/**
 * @since 1.0.0
 * @category combinators
 */
const basicAuth = exports.basicAuth = internal.basicAuth;
/**
 * @since 1.0.0
 * @category combinators
 */
const bearerToken = exports.bearerToken = internal.bearerToken;
/**
 * @since 1.0.0
 * @category combinators
 */
const accept = exports.accept = internal.accept;
/**
 * @since 1.0.0
 * @category combinators
 */
const acceptJson = exports.acceptJson = internal.acceptJson;
/**
 * @since 1.0.0
 * @category combinators
 */
const setUrl = exports.setUrl = internal.setUrl;
/**
 * @since 1.0.0
 * @category combinators
 */
const prependUrl = exports.prependUrl = internal.prependUrl;
/**
 * @since 1.0.0
 * @category combinators
 */
const appendUrl = exports.appendUrl = internal.appendUrl;
/**
 * @since 1.0.0
 * @category combinators
 */
const updateUrl = exports.updateUrl = internal.updateUrl;
/**
 * @since 1.0.0
 * @category combinators
 */
const setUrlParam = exports.setUrlParam = internal.setUrlParam;
/**
 * @since 1.0.0
 * @category combinators
 */
const setUrlParams = exports.setUrlParams = internal.setUrlParams;
/**
 * @since 1.0.0
 * @category combinators
 */
const appendUrlParam = exports.appendUrlParam = internal.appendUrlParam;
/**
 * @since 1.0.0
 * @category combinators
 */
const appendUrlParams = exports.appendUrlParams = internal.appendUrlParams;
/**
 * @since 1.0.0
 * @category combinators
 */
const setHash = exports.setHash = internal.setHash;
/**
 * @since 1.0.0
 * @category combinators
 */
const removeHash = exports.removeHash = internal.removeHash;
/**
 * @since 1.0.0
 * @category combinators
 */
const toUrl = exports.toUrl = internal.toUrl;
/**
 * @since 1.0.0
 * @category combinators
 */
const setBody = exports.setBody = internal.setBody;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyUint8Array = exports.bodyUint8Array = internal.bodyUint8Array;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyText = exports.bodyText = internal.bodyText;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyJson = exports.bodyJson = internal.bodyJson;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyUnsafeJson = exports.bodyUnsafeJson = internal.bodyUnsafeJson;
/**
 * @since 1.0.0
 * @category combinators
 */
const schemaBodyJson = exports.schemaBodyJson = internal.schemaBodyJson;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyUrlParams = exports.bodyUrlParams = internal.bodyUrlParams;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyFormData = exports.bodyFormData = internal.bodyFormData;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyFormDataRecord = exports.bodyFormDataRecord = internal.bodyFormDataRecord;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyStream = exports.bodyStream = internal.bodyStream;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyFile = exports.bodyFile = internal.bodyFile;
/**
 * @since 1.0.0
 * @category combinators
 */
const bodyFileWeb = exports.bodyFileWeb = internal.bodyFileWeb;
//# sourceMappingURL=HttpClientRequest.js.map