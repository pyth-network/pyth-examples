import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import { hasProperty } from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as AST from "effect/SchemaAST";
import * as Stream_ from "effect/Stream";
/**
 * @since 1.0.0
 * @category Stream
 */
export const StreamSchemaId = /*#__PURE__*/Symbol.for("@effect/rpc/RpcSchema/Stream");
/**
 * @since 1.0.0
 * @category Stream
 */
export const isStreamSchema = schema => schema.ast.annotations[AST.SchemaIdAnnotationId] === StreamSchemaId;
/**
 * @since 1.0.0
 * @category Stream
 */
export const isStreamSerializable = schema => isStreamSchema(Schema.successSchema(schema));
/**
 * @since 1.0.0
 * @category Stream
 */
export const getStreamSchemas = ast => ast.annotations[StreamSchemaId] ? Option.some(ast.annotations[StreamSchemaId]) : Option.none();
/**
 * @since 1.0.0
 * @category Stream
 */
export const Stream = ({
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
const isStream = u => hasProperty(u, Stream_.StreamTypeId);
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