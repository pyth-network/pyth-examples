/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
/**
 * Run a sql query with a request schema and a result schema.
 *
 * @since 1.0.0
 * @category constructor
 */
export const findAll = options => {
  const encodeRequest = Schema.encode(options.Request);
  const decode = Schema.decodeUnknown(Schema.Array(options.Result));
  return request => Effect.flatMap(Effect.flatMap(encodeRequest(request), options.execute), decode);
};
const void_ = options => {
  const encode = Schema.encode(options.Request);
  return request => Effect.asVoid(Effect.flatMap(encode(request), options.execute));
};
export {
/**
 * Run a sql query with a request schema and discard the result.
 *
 * @since 1.0.0
 * @category constructor
 */
void_ as void };
/**
 * Run a sql query with a request schema and a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
export const findOne = options => {
  const encodeRequest = Schema.encode(options.Request);
  const decode = Schema.decodeUnknown(options.Result);
  return request => Effect.flatMap(Effect.flatMap(encodeRequest(request), options.execute), arr => Array.isArray(arr) && arr.length > 0 ? Effect.asSome(decode(arr[0])) : Effect.succeedNone);
};
/**
 * Run a sql query with a request schema and a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
export const single = options => {
  const encodeRequest = Schema.encode(options.Request);
  const decode = Schema.decodeUnknown(options.Result);
  return request => Effect.flatMap(Effect.flatMap(encodeRequest(request), options.execute), arr => Array.isArray(arr) && arr.length > 0 ? decode(arr[0]) : Effect.fail(new Cause.NoSuchElementException()));
};
//# sourceMappingURL=SqlSchema.js.map