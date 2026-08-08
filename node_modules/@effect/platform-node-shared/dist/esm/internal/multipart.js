import * as Multipart from "@effect/platform/Multipart";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Inspectable from "effect/Inspectable";
import * as Stream from "effect/Stream";
import { decodeField } from "multipasta";
import * as MP from "multipasta/node";
import * as NFS from "node:fs";
import * as NodeStreamP from "node:stream/promises";
import * as NodeStream from "./stream.js";
/** @internal */
export const stream = (source, headers) => pipe(Multipart.makeConfig(headers), Effect.map(config => NodeStream.fromReadable(() => {
  const parser = MP.make(config);
  source.pipe(parser);
  return parser;
}, error => convertError(error))), Stream.unwrap, Stream.map(convertPart));
/** @internal */
export const persisted = (source, headers) => Multipart.toPersisted(stream(source, headers), (path, file) => Effect.tryPromise({
  try: signal => NodeStreamP.pipeline(file.file, NFS.createWriteStream(path), {
    signal
  }),
  catch: cause => new Multipart.MultipartError({
    reason: "InternalError",
    cause
  })
}));
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
    this.value = decodeField(info, value);
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
export const fileToReadable = file => file.file;
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