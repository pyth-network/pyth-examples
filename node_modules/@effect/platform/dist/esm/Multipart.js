import * as Channel from "effect/Channel";
import * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { constant, dual } from "effect/Function";
import * as Inspectable from "effect/Inspectable";
import * as Mailbox from "effect/Mailbox";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as MP from "multipasta";
import * as FileSystem from "./FileSystem.js";
import * as IncomingMessage from "./HttpIncomingMessage.js";
import * as Path from "./Path.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/Multipart");
/**
 * @since 1.0.0
 * @category Guards
 */
export const isPart = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category Guards
 */
export const isField = u => isPart(u) && u._tag === "Field";
/**
 * @since 1.0.0
 * @category Guards
 */
export const isFile = u => isPart(u) && u._tag === "File";
/**
 * @since 1.0.0
 * @category Guards
 */
export const isPersistedFile = u => Predicate.hasProperty(u, TypeId) && Predicate.isTagged(u, "PersistedFile");
/**
 * @since 1.0.0
 * @category Errors
 */
export const ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Multipart/MultipartError");
/**
 * @since 1.0.0
 * @category Errors
 */
export class MultipartError extends /*#__PURE__*/Schema.TaggedError()("MultipartError", {
  reason: /*#__PURE__*/Schema.Literal("FileTooLarge", "FieldTooLarge", "BodyTooLarge", "TooManyParts", "InternalError", "Parse"),
  cause: Schema.Defect
}) {
  /**
   * @since 1.0.0
   */
  [ErrorTypeId] = ErrorTypeId;
  /**
   * @since 1.0.0
   */
  get message() {
    return this.reason;
  }
}
/**
 * @since 1.0.0
 * @category Schemas
 */
export const FileSchema = /*#__PURE__*/Schema.declare(isPersistedFile, {
  identifier: "PersistedFile",
  jsonSchema: {
    type: "string",
    format: "binary"
  }
});
/**
 * @since 1.0.0
 * @category Schemas
 */
export const FilesSchema = /*#__PURE__*/Schema.Array(FileSchema);
/**
 * @since 1.0.0
 * @category Schemas
 */
export const SingleFileSchema = /*#__PURE__*/Schema.transform(/*#__PURE__*/FilesSchema.pipe(/*#__PURE__*/Schema.itemsCount(1)), FileSchema, {
  strict: true,
  decode: ([file]) => file,
  encode: file => [file]
});
/**
 * @since 1.0.0
 * @category Schemas
 */
export const schemaPersisted = (schema, options) => Schema.decodeUnknown(schema, options);
/**
 * @since 1.0.0
 * @category Schemas
 */
export const schemaJson = (schema, options) => {
  const fromJson = Schema.parseJson(schema);
  return dual(2, (persisted, field) => Effect.map(Schema.decodeUnknown(Schema.Struct({
    [field]: fromJson
  }), options)(persisted), _ => _[field]));
};
/**
 * @since 1.0.0
 * @category Config
 */
export const makeConfig = headers => Effect.withFiberRuntime(fiber => {
  const mimeTypes = Context.get(fiber.currentContext, FieldMimeTypes);
  return Effect.succeed({
    headers,
    maxParts: Option.getOrUndefined(Context.get(fiber.currentContext, MaxParts)),
    maxFieldSize: Number(Context.get(fiber.currentContext, MaxFieldSize)),
    maxPartSize: Context.get(fiber.currentContext, MaxFileSize).pipe(Option.map(Number), Option.getOrUndefined),
    maxTotalSize: Context.get(fiber.currentContext, IncomingMessage.MaxBodySize).pipe(Option.map(Number), Option.getOrUndefined),
    isFile: mimeTypes.length === 0 ? undefined : info => !Chunk.some(mimeTypes, _ => info.contentType.includes(_)) && MP.defaultIsFile(info)
  });
});
/**
 * @since 1.0.0
 * @category Parsers
 */
export const makeChannel = (headers, bufferSize = 16) => Channel.acquireUseRelease(Effect.all([makeConfig(headers), Mailbox.make(bufferSize)]), ([config, mailbox]) => {
  let partsBuffer = [];
  let exit = Option.none();
  const input = {
    awaitRead: () => Effect.void,
    emit(element) {
      return mailbox.offer(element);
    },
    error(cause) {
      exit = Option.some(Exit.failCause(cause));
      return mailbox.end;
    },
    done(_value) {
      return mailbox.end;
    }
  };
  const parser = MP.make({
    ...config,
    onField(info, value) {
      partsBuffer.push(new FieldImpl(info.name, info.contentType, MP.decodeField(info, value)));
    },
    onFile(info) {
      let chunks = [];
      let finished = false;
      const take = Channel.suspend(() => {
        if (chunks.length === 0) {
          return finished ? Channel.void : Channel.zipRight(pump, take);
        }
        const chunk = Chunk.unsafeFromArray(chunks);
        chunks = [];
        return finished ? Channel.write(chunk) : Channel.zipRight(Channel.write(chunk), Channel.zipRight(pump, take));
      });
      partsBuffer.push(new FileImpl(info, take));
      return function (chunk) {
        if (chunk === null) {
          finished = true;
        } else {
          chunks.push(chunk);
        }
      };
    },
    onError(error_) {
      exit = Option.some(Exit.fail(convertError(error_)));
    },
    onDone() {
      exit = Option.some(Exit.void);
    }
  });
  const pump = Channel.flatMap(mailbox.takeAll, ([chunks, done]) => Channel.sync(() => {
    Chunk.forEach(chunks, Chunk.forEach(parser.write));
    if (done) {
      parser.end();
    }
  }));
  const partsChannel = Channel.flatMap(pump, () => {
    if (partsBuffer.length === 0) {
      return exit._tag === "None" ? partsChannel : writeExit(exit.value);
    }
    const chunk = Chunk.unsafeFromArray(partsBuffer);
    partsBuffer = [];
    return Channel.zipRight(Channel.write(chunk), exit._tag === "None" ? partsChannel : writeExit(exit.value));
  });
  return Channel.embedInput(partsChannel, input);
}, ([, mailbox]) => mailbox.shutdown);
const writeExit = self => self._tag === "Success" ? Channel.void : Channel.failCause(self.cause);
function convertError(cause) {
  switch (cause._tag) {
    case "ReachedLimit":
      {
        switch (cause.limit) {
          case "MaxParts":
            {
              return new MultipartError({
                reason: "TooManyParts",
                cause
              });
            }
          case "MaxFieldSize":
            {
              return new MultipartError({
                reason: "FieldTooLarge",
                cause
              });
            }
          case "MaxPartSize":
            {
              return new MultipartError({
                reason: "FileTooLarge",
                cause
              });
            }
          case "MaxTotalSize":
            {
              return new MultipartError({
                reason: "BodyTooLarge",
                cause
              });
            }
        }
      }
    default:
      {
        return new MultipartError({
          reason: "Parse",
          cause
        });
      }
  }
}
class PartBase extends Inspectable.Class {
  [TypeId];
  constructor() {
    super();
    this[TypeId] = TypeId;
  }
}
class FieldImpl extends PartBase {
  key;
  contentType;
  value;
  _tag = "Field";
  constructor(key, contentType, value) {
    super();
    this.key = key;
    this.contentType = contentType;
    this.value = value;
  }
  toJSON() {
    return {
      _id: "@effect/platform/Multipart/Part",
      _tag: "Field",
      key: this.key,
      contentType: this.contentType,
      value: this.value
    };
  }
}
class FileImpl extends PartBase {
  _tag = "File";
  key;
  name;
  contentType;
  content;
  contentEffect;
  constructor(info, channel) {
    super();
    this.key = info.name;
    this.name = info.filename ?? info.name;
    this.contentType = info.contentType;
    this.content = Stream.fromChannel(channel);
    this.contentEffect = channel.pipe(Channel.pipeTo(collectUint8Array), Channel.run, Effect.mapError(cause => new MultipartError({
      reason: "InternalError",
      cause
    })));
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
const defaultWriteFile = (path, file) => Effect.flatMap(FileSystem.FileSystem, fs => Effect.mapError(Stream.run(file.content, fs.sink(path)), cause => new MultipartError({
  reason: "InternalError",
  cause
})));
/**
 * @since 1.0.0
 */
export const collectUint8Array = /*#__PURE__*/Channel.suspend(() => {
  let accumulator = new Uint8Array(0);
  const loop = Channel.readWithCause({
    onInput(chunk) {
      for (const element of chunk) {
        const newAccumulator = new Uint8Array(accumulator.length + element.length);
        newAccumulator.set(accumulator, 0);
        newAccumulator.set(element, accumulator.length);
        accumulator = newAccumulator;
      }
      return loop;
    },
    onFailure: cause => Channel.failCause(cause),
    onDone: () => Channel.succeed(accumulator)
  });
  return loop;
});
/**
 * @since 1.0.0
 * @category Conversions
 */
export const toPersisted = (stream, writeFile = defaultWriteFile) => Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path_ = yield* Path.Path;
  const dir = yield* fs.makeTempDirectoryScoped();
  const persisted = Object.create(null);
  yield* Stream.runForEach(stream, part => {
    if (part._tag === "Field") {
      if (!(part.key in persisted)) {
        persisted[part.key] = part.value;
      } else if (typeof persisted[part.key] === "string") {
        persisted[part.key] = [persisted[part.key], part.value];
      } else {
        ;
        persisted[part.key].push(part.value);
      }
      return Effect.void;
    } else if (part.name === "") {
      return Effect.void;
    }
    const file = part;
    const path = path_.join(dir, path_.basename(file.name).slice(-128));
    const filePart = new PersistedFileImpl(file.key, file.name, file.contentType, path);
    if (Array.isArray(persisted[part.key])) {
      ;
      persisted[part.key].push(filePart);
    } else {
      persisted[part.key] = [filePart];
    }
    return writeFile(path, file);
  });
  return persisted;
}).pipe(Effect.catchTags({
  SystemError: cause => Effect.fail(new MultipartError({
    reason: "InternalError",
    cause
  })),
  BadArgument: cause => Effect.fail(new MultipartError({
    reason: "InternalError",
    cause
  }))
}));
class PersistedFileImpl extends PartBase {
  key;
  name;
  contentType;
  path;
  _tag = "PersistedFile";
  constructor(key, name, contentType, path) {
    super();
    this.key = key;
    this.name = name;
    this.contentType = contentType;
    this.path = path;
  }
  toJSON() {
    return {
      _id: "@effect/platform/Multipart/Part",
      _tag: "PersistedFile",
      key: this.key,
      name: this.name,
      contentType: this.contentType,
      path: this.path
    };
  }
}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withLimits = /*#__PURE__*/dual(2, (effect, options) => Effect.provide(effect, withLimitsContext(options)));
const withLimitsContext = options => {
  const contextMap = new Map();
  if (options.maxParts !== undefined) {
    contextMap.set(MaxParts.key, options.maxParts);
  }
  if (options.maxFieldSize !== undefined) {
    contextMap.set(MaxFieldSize.key, FileSystem.Size(options.maxFieldSize));
  }
  if (options.maxFileSize !== undefined) {
    contextMap.set(MaxFileSize.key, Option.map(options.maxFileSize, FileSystem.Size));
  }
  if (options.maxTotalSize !== undefined) {
    contextMap.set(IncomingMessage.MaxBodySize.key, Option.map(options.maxTotalSize, FileSystem.Size));
  }
  if (options.fieldMimeTypes !== undefined) {
    contextMap.set(FieldMimeTypes.key, Chunk.fromIterable(options.fieldMimeTypes));
  }
  return Context.unsafeMake(contextMap);
};
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withLimitsStream = /*#__PURE__*/dual(2, (stream, options) => Stream.provideSomeContext(stream, withLimitsContext(options)));
/**
 * @since 1.0.0
 * @category fiber refs
 */
export class MaxParts extends /*#__PURE__*/Context.Reference()("@effect/platform/Multipart/MaxParts", {
  defaultValue: Option.none
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxParts = /*#__PURE__*/dual(2, (effect, count) => Effect.provideService(effect, MaxParts, count));
/**
 * @since 1.0.0
 * @category fiber refs
 */
export class MaxFieldSize extends /*#__PURE__*/Context.Reference()("@effect/platform/Multipart/MaxFieldSize", {
  defaultValue: /*#__PURE__*/constant(/*#__PURE__*/FileSystem.Size(10 * 1024 * 1024))
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxFieldSize = /*#__PURE__*/dual(2, (effect, size) => Effect.provideService(effect, MaxFieldSize, FileSystem.Size(size)));
/**
 * @since 1.0.0
 * @category fiber refs
 */
export class MaxFileSize extends /*#__PURE__*/Context.Reference()("@effect/platform/Multipart/MaxFileSize", {
  defaultValue: Option.none
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxFileSize = /*#__PURE__*/dual(2, (effect, size) => Effect.provideService(effect, MaxFileSize, Option.map(size, FileSystem.Size)));
/**
 * @since 1.0.0
 * @category fiber refs
 */
export class FieldMimeTypes extends /*#__PURE__*/Context.Reference()("@effect/platform/Multipart/FieldMimeTypes", {
  defaultValue: /*#__PURE__*/constant(/*#__PURE__*/Chunk.make("application/json"))
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withFieldMimeTypes = /*#__PURE__*/dual(2, (effect, mimeTypes) => Effect.provideService(effect, FieldMimeTypes, Chunk.fromIterable(mimeTypes)));
//# sourceMappingURL=Multipart.js.map