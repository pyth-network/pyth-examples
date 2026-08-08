"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withMaxParts = exports.withMaxFileSize = exports.withMaxFieldSize = exports.withLimitsStream = exports.withLimits = exports.withFieldMimeTypes = exports.toPersisted = exports.schemaPersisted = exports.schemaJson = exports.makeConfig = exports.makeChannel = exports.isPersistedFile = exports.isPart = exports.isFile = exports.isField = exports.collectUint8Array = exports.TypeId = exports.SingleFileSchema = exports.MultipartError = exports.MaxParts = exports.MaxFileSize = exports.MaxFieldSize = exports.FilesSchema = exports.FileSchema = exports.FieldMimeTypes = exports.ErrorTypeId = void 0;
var Channel = _interopRequireWildcard(require("effect/Channel"));
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Exit = _interopRequireWildcard(require("effect/Exit"));
var _Function = require("effect/Function");
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Mailbox = _interopRequireWildcard(require("effect/Mailbox"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var MP = _interopRequireWildcard(require("multipasta"));
var FileSystem = _interopRequireWildcard(require("./FileSystem.js"));
var IncomingMessage = _interopRequireWildcard(require("./HttpIncomingMessage.js"));
var Path = _interopRequireWildcard(require("./Path.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/Multipart");
/**
 * @since 1.0.0
 * @category Guards
 */
const isPart = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category Guards
 */
exports.isPart = isPart;
const isField = u => isPart(u) && u._tag === "Field";
/**
 * @since 1.0.0
 * @category Guards
 */
exports.isField = isField;
const isFile = u => isPart(u) && u._tag === "File";
/**
 * @since 1.0.0
 * @category Guards
 */
exports.isFile = isFile;
const isPersistedFile = u => Predicate.hasProperty(u, TypeId) && Predicate.isTagged(u, "PersistedFile");
/**
 * @since 1.0.0
 * @category Errors
 */
exports.isPersistedFile = isPersistedFile;
const ErrorTypeId = exports.ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Multipart/MultipartError");
/**
 * @since 1.0.0
 * @category Errors
 */
class MultipartError extends /*#__PURE__*/Schema.TaggedError()("MultipartError", {
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
exports.MultipartError = MultipartError;
const FileSchema = exports.FileSchema = /*#__PURE__*/Schema.declare(isPersistedFile, {
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
const FilesSchema = exports.FilesSchema = /*#__PURE__*/Schema.Array(FileSchema);
/**
 * @since 1.0.0
 * @category Schemas
 */
const SingleFileSchema = exports.SingleFileSchema = /*#__PURE__*/Schema.transform(/*#__PURE__*/FilesSchema.pipe(/*#__PURE__*/Schema.itemsCount(1)), FileSchema, {
  strict: true,
  decode: ([file]) => file,
  encode: file => [file]
});
/**
 * @since 1.0.0
 * @category Schemas
 */
const schemaPersisted = (schema, options) => Schema.decodeUnknown(schema, options);
/**
 * @since 1.0.0
 * @category Schemas
 */
exports.schemaPersisted = schemaPersisted;
const schemaJson = (schema, options) => {
  const fromJson = Schema.parseJson(schema);
  return (0, _Function.dual)(2, (persisted, field) => Effect.map(Schema.decodeUnknown(Schema.Struct({
    [field]: fromJson
  }), options)(persisted), _ => _[field]));
};
/**
 * @since 1.0.0
 * @category Config
 */
exports.schemaJson = schemaJson;
const makeConfig = headers => Effect.withFiberRuntime(fiber => {
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
exports.makeConfig = makeConfig;
const makeChannel = (headers, bufferSize = 16) => Channel.acquireUseRelease(Effect.all([makeConfig(headers), Mailbox.make(bufferSize)]), ([config, mailbox]) => {
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
exports.makeChannel = makeChannel;
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
const collectUint8Array = exports.collectUint8Array = /*#__PURE__*/Channel.suspend(() => {
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
const toPersisted = (stream, writeFile = defaultWriteFile) => Effect.gen(function* () {
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
exports.toPersisted = toPersisted;
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
const withLimits = exports.withLimits = /*#__PURE__*/(0, _Function.dual)(2, (effect, options) => Effect.provide(effect, withLimitsContext(options)));
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
const withLimitsStream = exports.withLimitsStream = /*#__PURE__*/(0, _Function.dual)(2, (stream, options) => Stream.provideSomeContext(stream, withLimitsContext(options)));
/**
 * @since 1.0.0
 * @category fiber refs
 */
class MaxParts extends /*#__PURE__*/Context.Reference()("@effect/platform/Multipart/MaxParts", {
  defaultValue: Option.none
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
exports.MaxParts = MaxParts;
const withMaxParts = exports.withMaxParts = /*#__PURE__*/(0, _Function.dual)(2, (effect, count) => Effect.provideService(effect, MaxParts, count));
/**
 * @since 1.0.0
 * @category fiber refs
 */
class MaxFieldSize extends /*#__PURE__*/Context.Reference()("@effect/platform/Multipart/MaxFieldSize", {
  defaultValue: /*#__PURE__*/(0, _Function.constant)(/*#__PURE__*/FileSystem.Size(10 * 1024 * 1024))
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
exports.MaxFieldSize = MaxFieldSize;
const withMaxFieldSize = exports.withMaxFieldSize = /*#__PURE__*/(0, _Function.dual)(2, (effect, size) => Effect.provideService(effect, MaxFieldSize, FileSystem.Size(size)));
/**
 * @since 1.0.0
 * @category fiber refs
 */
class MaxFileSize extends /*#__PURE__*/Context.Reference()("@effect/platform/Multipart/MaxFileSize", {
  defaultValue: Option.none
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
exports.MaxFileSize = MaxFileSize;
const withMaxFileSize = exports.withMaxFileSize = /*#__PURE__*/(0, _Function.dual)(2, (effect, size) => Effect.provideService(effect, MaxFileSize, Option.map(size, FileSystem.Size)));
/**
 * @since 1.0.0
 * @category fiber refs
 */
class FieldMimeTypes extends /*#__PURE__*/Context.Reference()("@effect/platform/Multipart/FieldMimeTypes", {
  defaultValue: /*#__PURE__*/(0, _Function.constant)(/*#__PURE__*/Chunk.make("application/json"))
}) {}
/**
 * @since 1.0.0
 * @category fiber refs
 */
exports.FieldMimeTypes = FieldMimeTypes;
const withFieldMimeTypes = exports.withFieldMimeTypes = /*#__PURE__*/(0, _Function.dual)(2, (effect, mimeTypes) => Effect.provideService(effect, FieldMimeTypes, Chunk.fromIterable(mimeTypes)));
//# sourceMappingURL=Multipart.js.map