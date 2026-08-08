"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.urlParams = exports.unsafeJson = exports.uint8Array = exports.text = exports.stream = exports.raw = exports.jsonSchema = exports.json = exports.isHttpBody = exports.formDataRecord = exports.formData = exports.fileWeb = exports.fileInfo = exports.file = exports.empty = exports.TypeId = exports.HttpBodyError = exports.ErrorTypeId = void 0;
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var internal = _interopRequireWildcard(require("./internal/httpBody.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category refinements
 */
const isHttpBody = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category type ids
 */
exports.isHttpBody = isHttpBody;
const ErrorTypeId = exports.ErrorTypeId = internal.ErrorTypeId;
/**
 * @since 1.0.0
 * @category errors
 */
const HttpBodyError = exports.HttpBodyError = internal.HttpBodyError;
/**
 * @since 1.0.0
 * @category constructors
 */
const empty = exports.empty = internal.empty;
/**
 * @since 1.0.0
 * @category constructors
 */
const raw = exports.raw = internal.raw;
/**
 * @since 1.0.0
 * @category constructors
 */
const uint8Array = exports.uint8Array = internal.uint8Array;
/**
 * @since 1.0.0
 * @category constructors
 */
const text = exports.text = internal.text;
/**
 * @since 1.0.0
 * @category constructors
 */
const unsafeJson = exports.unsafeJson = internal.unsafeJson;
/**
 * @since 1.0.0
 * @category constructors
 */
const json = exports.json = internal.json;
/**
 * @since 1.0.0
 * @category constructors
 */
const jsonSchema = exports.jsonSchema = internal.jsonSchema;
/**
 * @since 1.0.0
 * @category constructors
 */
const urlParams = exports.urlParams = internal.urlParams;
/**
 * @since 1.0.0
 * @category FormData
 */
const formData = exports.formData = internal.formData;
/**
 * @since 1.0.0
 * @category FormData
 */
const formDataRecord = exports.formDataRecord = internal.formDataRecord;
/**
 * @since 1.0.0
 * @category constructors
 */
const stream = exports.stream = internal.stream;
/**
 * @since 1.0.0
 * @category constructors
 */
const file = exports.file = internal.file;
/**
 * @since 1.0.0
 * @category constructors
 */
const fileInfo = exports.fileInfo = internal.fileInfo;
/**
 * @since 1.0.0
 * @category constructors
 */
const fileWeb = exports.fileWeb = internal.fileWeb;
//# sourceMappingURL=HttpBody.js.map