import * as Channel from "effect/Channel";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import { dual, identity } from "effect/Function";
import * as ChannelSchema from "./ChannelSchema.js";
import { TypeIdError } from "./Error.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Ndjson/NdjsonError");
const encoder = /*#__PURE__*/new TextEncoder();
/**
 * @since 1.0.0
 * @category errors
 */
export class NdjsonError extends /*#__PURE__*/TypeIdError(ErrorTypeId, "NdjsonError") {
  get message() {
    return this.reason;
  }
}
/**
 * @since 1.0.0
 * @category constructors
 */
export const packString = () => {
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
export const pack = () => Channel.mapOut(packString(), Chunk.map(_ => encoder.encode(_)));
/**
 * @since 1.0.0
 * @category constructors
 */
export const packSchema = schema => () => Channel.pipeTo(ChannelSchema.encode(schema)(), pack());
/**
 * @since 1.0.0
 * @category constructors
 */
export const packSchemaString = schema => () => Channel.pipeTo(ChannelSchema.encode(schema)(), packString());
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
export const unpackString = options => {
  const lines = Channel.splitLines().pipe(options?.ignoreEmptyLines === true ? Channel.pipeTo(filterEmptyChannel()) : identity);
  return Channel.mapOutEffect(lines, chunk => Effect.try({
    try: () => Chunk.map(chunk, _ => JSON.parse(_)),
    catch: cause => new NdjsonError({
      reason: "Unpack",
      cause
    })
  }));
};
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
export const unpack = options => {
  return Channel.pipeTo(decodeString(), unpackString(options));
};
/**
 * @since 1.0.0
 * @category constructors
 */
export const unpackSchema = schema => options => Channel.pipeTo(unpack(options), ChannelSchema.decodeUnknown(schema)());
/**
 * @since 1.0.0
 * @category constructors
 */
export const unpackSchemaString = schema => options => Channel.pipeTo(unpackString(options), ChannelSchema.decodeUnknown(schema)());
/**
 * @since 1.0.0
 * @category combinators
 */
export const duplex = /*#__PURE__*/dual(args => Channel.isChannel(args[0]), (self, options) => Channel.pipeTo(Channel.pipeTo(pack(), self), unpack(options)));
/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexString = /*#__PURE__*/dual(args => Channel.isChannel(args[0]), (self, options) => Channel.pipeTo(Channel.pipeTo(packString(), self), unpackString(options)));
/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexSchema = /*#__PURE__*/dual(2, (self, options) => ChannelSchema.duplexUnknown(duplex(self, options), options));
/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexSchemaString = /*#__PURE__*/dual(2, (self, options) => ChannelSchema.duplexUnknown(duplexString(self, options), options));
//# sourceMappingURL=Ndjson.js.map