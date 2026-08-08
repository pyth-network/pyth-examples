"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unpackString = exports.unpackSchemaString = exports.unpackSchema = exports.unpack = exports.packString = exports.packSchemaString = exports.packSchema = exports.pack = exports.duplexString = exports.duplexSchemaString = exports.duplexSchema = exports.duplex = exports.NdjsonError = exports.ErrorTypeId = void 0;
var Channel = _interopRequireWildcard(require("effect/Channel"));
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var ChannelSchema = _interopRequireWildcard(require("./ChannelSchema.js"));
var _Error = require("./Error.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const ErrorTypeId = exports.ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Ndjson/NdjsonError");
const encoder = /*#__PURE__*/new TextEncoder();
/**
 * @since 1.0.0
 * @category errors
 */
class NdjsonError extends /*#__PURE__*/(0, _Error.TypeIdError)(ErrorTypeId, "NdjsonError") {
  get message() {
    return this.reason;
  }
}
/**
 * @since 1.0.0
 * @category constructors
 */
exports.NdjsonError = NdjsonError;
const packString = () => {
  const loop = Channel.readWithCause({
    onInput: input => Channel.zipRight(Channel.flatMap(Effect.try({
      try: () => Chunk.of(Chunk.toReadonlyArray(input).map(_ => JSON.stringify(_)).join("\n") + "\n"),
      catch: cause => new NdjsonError({
        reason: "Pack",
        cause
      })
    }), Channel.write), loop),
    onFailure: Channel.failCause,
    onDone: Channel.succeed
  });
  return loop;
};
/**
 * @since 1.0.0
 * @category constructors
 */
exports.packString = packString;
const pack = () => Channel.mapOut(packString(), Chunk.map(_ => encoder.encode(_)));
/**
 * @since 1.0.0
 * @category constructors
 */
exports.pack = pack;
const packSchema = schema => () => Channel.pipeTo(ChannelSchema.encode(schema)(), pack());
/**
 * @since 1.0.0
 * @category constructors
 */
exports.packSchema = packSchema;
const packSchemaString = schema => () => Channel.pipeTo(ChannelSchema.encode(schema)(), packString());
exports.packSchemaString = packSchemaString;
const filterEmpty = /*#__PURE__*/Chunk.filter(line => line.length > 0);
const filterEmptyChannel = () => {
  const loop = Channel.readWithCause({
    onInput(input) {
      const filtered = filterEmpty(input);
      return Channel.zipRight(Chunk.isEmpty(filtered) ? Channel.void : Channel.write(filtered), loop);
    },
    onFailure(cause) {
      return Channel.failCause(cause);
    },
    onDone(done) {
      return Channel.succeed(done);
    }
  });
  return loop;
};
/**
 * @since 1.0.0
 * @category constructors
 */
const unpackString = options => {
  const lines = Channel.splitLines().pipe(options?.ignoreEmptyLines === true ? Channel.pipeTo(filterEmptyChannel()) : _Function.identity);
  return Channel.mapOutEffect(lines, chunk => Effect.try({
    try: () => Chunk.map(chunk, _ => JSON.parse(_)),
    catch: cause => new NdjsonError({
      reason: "Unpack",
      cause
    })
  }));
};
exports.unpackString = unpackString;
const decodeString = () => {
  const decoder = new TextDecoder();
  const loop = Channel.readWithCause({
    onInput: input => Channel.zipRight(Channel.write(Chunk.map(input, _ => decoder.decode(_))), loop),
    onFailure: Channel.failCause,
    onDone: Channel.succeed
  });
  return loop;
};
/**
 * @since 1.0.0
 * @category constructors
 */
const unpack = options => {
  return Channel.pipeTo(decodeString(), unpackString(options));
};
/**
 * @since 1.0.0
 * @category constructors
 */
exports.unpack = unpack;
const unpackSchema = schema => options => Channel.pipeTo(unpack(options), ChannelSchema.decodeUnknown(schema)());
/**
 * @since 1.0.0
 * @category constructors
 */
exports.unpackSchema = unpackSchema;
const unpackSchemaString = schema => options => Channel.pipeTo(unpackString(options), ChannelSchema.decodeUnknown(schema)());
/**
 * @since 1.0.0
 * @category combinators
 */
exports.unpackSchemaString = unpackSchemaString;
const duplex = exports.duplex = /*#__PURE__*/(0, _Function.dual)(args => Channel.isChannel(args[0]), (self, options) => Channel.pipeTo(Channel.pipeTo(pack(), self), unpack(options)));
/**
 * @since 1.0.0
 * @category combinators
 */
const duplexString = exports.duplexString = /*#__PURE__*/(0, _Function.dual)(args => Channel.isChannel(args[0]), (self, options) => Channel.pipeTo(Channel.pipeTo(packString(), self), unpackString(options)));
/**
 * @since 1.0.0
 * @category combinators
 */
const duplexSchema = exports.duplexSchema = /*#__PURE__*/(0, _Function.dual)(2, (self, options) => ChannelSchema.duplexUnknown(duplex(self, options), options));
/**
 * @since 1.0.0
 * @category combinators
 */
const duplexSchemaString = exports.duplexSchemaString = /*#__PURE__*/(0, _Function.dual)(2, (self, options) => ChannelSchema.duplexUnknown(duplexString(self, options), options));
//# sourceMappingURL=Ndjson.js.map