"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.urlParams = exports.unsafeJson = exports.uint8Array = exports.text = exports.stream = exports.raw = exports.jsonSchema = exports.json = exports.formDataRecord = exports.formData = exports.fileWeb = exports.fileInfo = exports.file = exports.empty = exports.TypeId = exports.HttpBodyError = exports.ErrorTypeId = void 0;
var Data = _interopRequireWildcard(require("effect/Data"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Stream_ = _interopRequireWildcard(require("effect/Stream"));
var FileSystem = _interopRequireWildcard(require("../FileSystem.js"));
var UrlParams = _interopRequireWildcard(require("../UrlParams.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpBody");
/** @internal */
const ErrorTypeId = exports.ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpBody/HttpBodyError");
const bodyError = /*#__PURE__*/Data.tagged("HttpBodyError");
/** @internal */
const HttpBodyError = reason => bodyError({
  [ErrorTypeId]: ErrorTypeId,
  reason
});
exports.HttpBodyError = HttpBodyError;
class BodyBase {
  [TypeId];
  constructor() {
    this[TypeId] = TypeId;
  }
  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON();
  }
  toString() {
    return Inspectable.format(this);
  }
}
class EmptyImpl extends BodyBase {
  _tag = "Empty";
  toJSON() {
    return {
      _id: "@effect/platform/HttpBody",
      _tag: "Empty"
    };
  }
}
/** @internal */
const empty = exports.empty = /*#__PURE__*/new EmptyImpl();
class RawImpl extends BodyBase {
  body;
  contentType;
  contentLength;
  _tag = "Raw";
  constructor(body, contentType, contentLength) {
    super();
    this.body = body;
    this.contentType = contentType;
    this.contentLength = contentLength;
  }
  toJSON() {
    return {
      _id: "@effect/platform/HttpBody",
      _tag: "Raw",
      body: this.body,
      contentType: this.contentType,
      contentLength: this.contentLength
    };
  }
}
/** @internal */
const raw = (body, options) => new RawImpl(body, options?.contentType, options?.contentLength);
exports.raw = raw;
class Uint8ArrayImpl extends BodyBase {
  body;
  contentType;
  _tag = "Uint8Array";
  constructor(body, contentType) {
    super();
    this.body = body;
    this.contentType = contentType;
  }
  get contentLength() {
    return this.body.length;
  }
  toJSON() {
    const toString = this.contentType.startsWith("text/") || this.contentType.endsWith("json");
    return {
      _id: "@effect/platform/HttpBody",
      _tag: "Uint8Array",
      body: toString ? new TextDecoder().decode(this.body) : `Uint8Array(${this.body.length})`,
      contentType: this.contentType,
      contentLength: this.contentLength
    };
  }
}
/** @internal */
const uint8Array = (body, contentType) => new Uint8ArrayImpl(body, contentType ?? "application/octet-stream");
exports.uint8Array = uint8Array;
const encoder = /*#__PURE__*/new TextEncoder();
/** @internal */
const text = (body, contentType) => uint8Array(encoder.encode(body), contentType ?? "text/plain");
/** @internal */
exports.text = text;
const unsafeJson = body => text(JSON.stringify(body), "application/json");
/** @internal */
exports.unsafeJson = unsafeJson;
const json = body => Effect.try({
  try: () => unsafeJson(body),
  catch: error => HttpBodyError({
    _tag: "JsonError",
    error
  })
});
/** @internal */
exports.json = json;
const urlParams = urlParams => text(UrlParams.toString(urlParams), "application/x-www-form-urlencoded");
/** @internal */
exports.urlParams = urlParams;
const jsonSchema = (schema, options) => {
  const encode = Schema.encode(schema, options);
  return body => Effect.flatMap(Effect.mapError(encode(body), error => HttpBodyError({
    _tag: "SchemaError",
    error
  })), json);
};
/** @internal */
exports.jsonSchema = jsonSchema;
const file = (path, options) => Effect.flatMap(FileSystem.FileSystem, fs => Effect.map(fs.stat(path), info => stream(fs.stream(path, options), options?.contentType, Number(info.size))));
/** @internal */
exports.file = file;
const fileInfo = (path, info, options) => Effect.map(FileSystem.FileSystem, fs => stream(fs.stream(path, options), options?.contentType, Number(info.size)));
/** @internal */
exports.fileInfo = fileInfo;
const fileWeb = file => stream(Stream_.fromReadableStream(() => file.stream(), _Function.identity), file.type, file.size);
exports.fileWeb = fileWeb;
class FormDataImpl extends BodyBase {
  formData;
  _tag = "FormData";
  constructor(formData) {
    super();
    this.formData = formData;
  }
  toJSON() {
    return {
      _id: "@effect/platform/HttpBody",
      _tag: "FormData",
      formData: this.formData
    };
  }
}
/** @internal */
const formData = body => new FormDataImpl(body);
/** @internal */
exports.formData = formData;
const formDataRecord = entries => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item == null) continue;
        formData.append(key, typeof value === "object" ? item : String(item));
      }
    } else if (value != null) {
      formData.append(key, typeof value === "object" ? value : String(value));
    }
  }
  return new FormDataImpl(formData);
};
exports.formDataRecord = formDataRecord;
class StreamImpl extends BodyBase {
  stream;
  contentType;
  contentLength;
  _tag = "Stream";
  constructor(stream, contentType, contentLength) {
    super();
    this.stream = stream;
    this.contentType = contentType;
    this.contentLength = contentLength;
  }
  toJSON() {
    return {
      _id: "@effect/platform/HttpBody",
      _tag: "Stream",
      contentType: this.contentType,
      contentLength: this.contentLength
    };
  }
}
/** @internal */
const stream = (body, contentType, contentLength) => new StreamImpl(body, contentType ?? "application/octet-stream", contentLength);
exports.stream = stream;
//# sourceMappingURL=httpBody.js.map