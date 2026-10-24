"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unpackSchema = exports.unpack = exports.schema = exports.packSchema = exports.pack = exports.duplexSchema = exports.duplex = exports.Msgpackr = exports.MsgPackError = exports.ErrorTypeId = void 0;
var Channel = _interopRequireWildcard(require("effect/Channel"));
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Data = _interopRequireWildcard(require("effect/Data"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var ParseResult = _interopRequireWildcard(require("effect/ParseResult"));
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var _msgpackr = _interopRequireWildcard(require("msgpackr"));
var Msgpackr = _msgpackr;
exports.Msgpackr = _msgpackr;
var ChannelSchema = _interopRequireWildcard(require("./ChannelSchema.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category errors
 */
const ErrorTypeId = exports.ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/MsgPack/MsgPackError");
/**
 * @since 1.0.0
 * @category errors
 */
class MsgPackError extends /*#__PURE__*/Data.TaggedError("MsgPackError") {
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
 * @category constructors
 */
exports.MsgPackError = MsgPackError;
const pack = () => Channel.suspend(() => {
  const packr = new _msgpackr.Packr();
  const loop = Channel.readWithCause({
    onInput: input => Channel.zipRight(Channel.flatMap(Effect.try({
      try: () => Chunk.of(packr.pack(Chunk.toReadonlyArray(input))),
      catch: cause => new MsgPackError({
        reason: "Pack",
        cause
      })
    }), Channel.write), loop),
    onFailure: cause => Channel.failCause(cause),
    onDone: Channel.succeed
  });
  return loop;
});
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
const unpack = () => Channel.flatMap(Channel.sync(() => new _msgpackr.Unpackr()), packr => {
  let incomplete = undefined;
  const unpack = value => Effect.try({
    try: () => Chunk.flatMap(value, buf => {
      if (incomplete !== undefined) {
        const chunk = new Uint8Array(incomplete.length + buf.length);
        chunk.set(incomplete);
        chunk.set(buf, incomplete.length);
        buf = chunk;
        incomplete = undefined;
      }
      try {
        return Chunk.unsafeFromArray(packr.unpackMultiple(buf).flat());
      } catch (error_) {
        const error = error_;
        if (error.incomplete) {
          incomplete = buf.subarray(error.lastPosition);
          return Chunk.unsafeFromArray(error.values ?? []);
        }
        throw error;
      }
    }),
    catch: cause => new MsgPackError({
      reason: "Unpack",
      cause
    })
  });
  const loop = Channel.readWithCause({
    onInput: input => Channel.zipRight(Channel.flatMap(unpack(input), Channel.write), loop),
    onFailure: cause => Channel.failCause(cause),
    onDone: Channel.succeed
  });
  return loop;
});
/**
 * @since 1.0.0
 * @category constructors
 */
exports.unpack = unpack;
const unpackSchema = schema => () => Channel.pipeTo(unpack(), ChannelSchema.decodeUnknown(schema)());
/**
 * @since 1.0.0
 * @category combinators
 */
exports.unpackSchema = unpackSchema;
const duplex = self => Channel.pipeTo(Channel.pipeTo(pack(), self), unpack());
/**
 * @since 1.0.0
 * @category combinators
 */
exports.duplex = duplex;
const duplexSchema = exports.duplexSchema = /*#__PURE__*/(0, _Function.dual)(2, (self, options) => ChannelSchema.duplexUnknown(duplex(self), options));
/**
 * @since 1.0.0
 * @category schemas
 */
const schema = schema => Schema.transformOrFail(Schema.Uint8ArrayFromSelf, schema, {
  decode(fromA, _, ast) {
    return ParseResult.try({
      try: () => Msgpackr.decode(fromA),
      catch: cause => new ParseResult.Type(ast, fromA, Predicate.hasProperty(cause, "message") ? String(cause.message) : String(cause))
    });
  },
  encode(toI, _, ast) {
    return ParseResult.try({
      try: () => Msgpackr.encode(toI),
      catch: cause => new ParseResult.Type(ast, toI, Predicate.hasProperty(cause, "message") ? String(cause.message) : String(cause))
    });
  }
});
exports.schema = schema;
//# sourceMappingURL=MsgPack.js.map