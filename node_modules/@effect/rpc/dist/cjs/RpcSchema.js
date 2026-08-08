"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isStreamSerializable = exports.isStreamSchema = exports.getStreamSchemas = exports.StreamSchemaId = exports.Stream = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Option = _interopRequireWildcard(require("effect/Option"));
var ParseResult = _interopRequireWildcard(require("effect/ParseResult"));
var _Predicate = require("effect/Predicate");
var Schema = _interopRequireWildcard(require("effect/Schema"));
var AST = _interopRequireWildcard(require("effect/SchemaAST"));
var Stream_ = _interopRequireWildcard(require("effect/Stream"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category Stream
 */
const StreamSchemaId = exports.StreamSchemaId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcSchema/Stream");
/**
 * @since 1.0.0
 * @category Stream
 */
const isStreamSchema = schema => schema.ast.annotations[AST.SchemaIdAnnotationId] === StreamSchemaId;
/**
 * @since 1.0.0
 * @category Stream
 */
exports.isStreamSchema = isStreamSchema;
const isStreamSerializable = schema => isStreamSchema(Schema.successSchema(schema));
/**
 * @since 1.0.0
 * @category Stream
 */
exports.isStreamSerializable = isStreamSerializable;
const getStreamSchemas = ast => ast.annotations[StreamSchemaId] ? Option.some(ast.annotations[StreamSchemaId]) : Option.none();
/**
 * @since 1.0.0
 * @category Stream
 */
exports.getStreamSchemas = getStreamSchemas;
const Stream = ({
  failure,
  success
}) => Object.assign(Schema.declare([success, failure], {
  decode: (success, failure) => parseStream(ParseResult.decodeUnknown(Schema.ChunkFromSelf(success)), ParseResult.decodeUnknown(failure)),
  encode: (success, failure) => parseStream(ParseResult.encodeUnknown(Schema.ChunkFromSelf(success)), ParseResult.encodeUnknown(failure))
}, {
  schemaId: StreamSchemaId,
  [StreamSchemaId]: {
    success,
    failure
  }
}), {
  success,
  failure
});
exports.Stream = Stream;
const isStream = u => (0, _Predicate.hasProperty)(u, Stream_.StreamTypeId);
const parseStream = (decodeSuccess, decodeFailure) => (u, options, ast) => Effect.flatMap(Effect.context(), context => {
  if (!isStream(u)) return Effect.fail(new ParseResult.Type(ast, u));
  return Effect.succeed(u.pipe(Stream_.mapChunksEffect(value => decodeSuccess(value, options)), Stream_.catchAll(error => {
    if (ParseResult.isParseError(error)) return Stream_.die(error);
    return Effect.matchEffect(decodeFailure(error, options), {
      onFailure: Effect.die,
      onSuccess: Effect.fail
    });
  }), Stream_.provideContext(context)));
});
//# sourceMappingURL=RpcSchema.js.map