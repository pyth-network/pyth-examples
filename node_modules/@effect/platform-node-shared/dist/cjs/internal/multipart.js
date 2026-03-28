"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stream = exports.persisted = exports.fileToReadable = void 0;
var Multipart = _interopRequireWildcard(require("@effect/platform/Multipart"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var _multipasta = require("multipasta");
var MP = _interopRequireWildcard(require("multipasta/node"));
var NFS = _interopRequireWildcard(require("node:fs"));
var NodeStreamP = _interopRequireWildcard(require("node:stream/promises"));
var NodeStream = _interopRequireWildcard(require("./stream.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const stream = (source, headers) => (0, _Function.pipe)(Multipart.makeConfig(headers), Effect.map(config => NodeStream.fromReadable(() => {
  const parser = MP.make(config);
  source.pipe(parser);
  return parser;
}, error => convertError(error))), Stream.unwrap, Stream.map(convertPart));
/** @internal */
exports.stream = stream;
const persisted = (source, headers) => Multipart.toPersisted(stream(source, headers), (path, file) => Effect.tryPromise({
  try: signal => NodeStreamP.pipeline(file.file, NFS.createWriteStream(path), {
    signal
  }),
  catch: cause => new Multipart.MultipartError({
    reason: "InternalError",
    cause
  })
}));
exports.persisted = persisted;
const convertPart = part => part._tag === "Field" ? new FieldImpl(part.info, part.value) : new FileImpl(part);
class PartBase extends Inspectable.Class {
  [Multipart.TypeId];
  constructor() {
    super();
    this[Multipart.TypeId] = Multipart.TypeId;
  }
}
class FieldImpl extends PartBase {
  _tag = "Field";
  key;
  contentType;
  value;
  constructor(info, value) {
    super();
    this.key = info.name;
    this.contentType = info.contentType;
    this.value = (0, _multipasta.decodeField)(info, value);
  }
  toJSON() {
    return {
      _id: "@effect/platform/Multipart/Part",
      _tag: "Field",
      key: this.key,
      value: this.value,
      contentType: this.contentType
    };
  }
}
class FileImpl extends PartBase {
  file;
  _tag = "File";
  key;
  name;
  contentType;
  content;
  contentEffect;
  constructor(file) {
    super();
    this.file = file;
    this.key = file.info.name;
    this.name = file.filename ?? file.info.name;
    this.contentType = file.info.contentType;
    this.content = NodeStream.fromReadable(() => file, cause => new Multipart.MultipartError({
      reason: "InternalError",
      cause
    }));
    this.contentEffect = NodeStream.toUint8Array(() => file, {
      onFailure: cause => new Multipart.MultipartError({
        reason: "InternalError",
        cause
      })
    });
  }
  toJSON() {
    return {
      _id: "@effect/platform/Multipart/Part",
      _tag: "File",
      key: this.key,
      name: this.name,
      contentType: this.contentType
    };
  }
}
/** @internal */
const fileToReadable = file => file.file;
exports.fileToReadable = fileToReadable;
function convertError(cause) {
  switch (cause._tag) {
    case "ReachedLimit":
      {
        switch (cause.limit) {
          case "MaxParts":
            {
              return new Multipart.MultipartError({
                reason: "TooManyParts",
                cause
              });
            }
          case "MaxFieldSize":
            {
              return new Multipart.MultipartError({
                reason: "FieldTooLarge",
                cause
              });
            }
          case "MaxPartSize":
            {
              return new Multipart.MultipartError({
                reason: "FileTooLarge",
                cause
              });
            }
          case "MaxTotalSize":
            {
              return new Multipart.MultipartError({
                reason: "BodyTooLarge",
                cause
              });
            }
        }
      }
    default:
      {
        return new Multipart.MultipartError({
          reason: "Parse",
          cause
        });
      }
  }
}
//# sourceMappingURL=multipart.js.map