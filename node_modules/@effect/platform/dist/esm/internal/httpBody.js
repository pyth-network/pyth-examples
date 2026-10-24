import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { identity } from "effect/Function";
import * as Inspectable from "effect/Inspectable";
import * as Schema from "effect/Schema";
import * as Stream_ from "effect/Stream";
import * as FileSystem from "../FileSystem.js";
import * as UrlParams from "../UrlParams.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpBody");
/** @internal */
export const ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpBody/HttpBodyError");
const bodyError = /*#__PURE__*/Data.tagged("HttpBodyError");
/** @internal */
export const HttpBodyError = reason => bodyError({
  [ErrorTypeId]: ErrorTypeId,
  reason
});
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
export const empty = /*#__PURE__*/new EmptyImpl();
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
export const raw = (body, options) => new RawImpl(body, options?.contentType, options?.contentLength);
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
export const uint8Array = (body, contentType) => new Uint8ArrayImpl(body, contentType ?? "application/octet-stream");
const encoder = /*#__PURE__*/new TextEncoder();
/** @internal */
export const text = (body, contentType) => uint8Array(encoder.encode(body), contentType ?? "text/plain");
/** @internal */
export const unsafeJson = body => text(JSON.stringify(body), "application/json");
/** @internal */
export const json = body => Effect.try({
  try: () => unsafeJson(body),
  catch: error => HttpBodyError({
    _tag: "JsonError",
    error
  })
});
/** @internal */
export const urlParams = urlParams => text(UrlParams.toString(urlParams), "application/x-www-form-urlencoded");
/** @internal */
export const jsonSchema = (schema, options) => {
  const encode = Schema.encode(schema, options);
  return body => Effect.flatMap(Effect.mapError(encode(body), error => HttpBodyError({
    _tag: "SchemaError",
    error
  })), json);
};
/** @internal */
export const file = (path, options) => Effect.flatMap(FileSystem.FileSystem, fs => Effect.map(fs.stat(path), info => stream(fs.stream(path, options), options?.contentType, Number(info.size))));
/** @internal */
export const fileInfo = (path, info, options) => Effect.map(FileSystem.FileSystem, fs => stream(fs.stream(path, options), options?.contentType, Number(info.size)));
/** @internal */
export const fileWeb = file => stream(Stream_.fromReadableStream(() => file.stream(), identity), file.type, file.size);
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
export const formData = body => new FormDataImpl(body);
/** @internal */
export const formDataRecord = entries => {
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
export const stream = (body, contentType, contentLength) => new StreamImpl(body, contentType ?? "application/octet-stream", contentLength);
//# sourceMappingURL=httpBody.js.map