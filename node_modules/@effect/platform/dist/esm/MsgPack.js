/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel";
import * as Chunk from "effect/Chunk";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { dual } from "effect/Function";
import * as ParseResult from "effect/ParseResult";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { Packr, Unpackr } from "msgpackr";
import * as Msgpackr from "msgpackr";
import * as ChannelSchema from "./ChannelSchema.js";
export {
/**
 * @since 1.0.0
 * @category re-exports
 */
Msgpackr };
/**
 * @since 1.0.0
 * @category errors
 */
export const ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/MsgPack/MsgPackError");
/**
 * @since 1.0.0
 * @category errors
 */
export class MsgPackError extends /*#__PURE__*/Data.TaggedError("MsgPackError") {
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
export const pack = () => Channel.suspend(() => {
  const packr = new Packr();
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
export const packSchema = schema => () => Channel.pipeTo(ChannelSchema.encode(schema)(), pack());
/**
 * @since 1.0.0
 * @category constructors
 */
export const unpack = () => Channel.flatMap(Channel.sync(() => new Unpackr()), packr => {
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
export const unpackSchema = schema => () => Channel.pipeTo(unpack(), ChannelSchema.decodeUnknown(schema)());
/**
 * @since 1.0.0
 * @category combinators
 */
export const duplex = self => Channel.pipeTo(Channel.pipeTo(pack(), self), unpack());
/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexSchema = /*#__PURE__*/dual(2, (self, options) => ChannelSchema.duplexUnknown(duplex(self), options));
/**
 * @since 1.0.0
 * @category schemas
 */
export const schema = schema => Schema.transformOrFail(Schema.Uint8ArrayFromSelf, schema, {
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
//# sourceMappingURL=MsgPack.js.map