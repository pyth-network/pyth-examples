import * as Channel from "effect/Channel";
import { dual, pipe } from "effect/Function";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category constructors
 */
export const encode = schema => () => {
  const encode = Schema.encode(Schema.ChunkFromSelf(schema));
  const loop = Channel.readWithCause({
    onInput: input => Channel.zipRight(Channel.flatMap(encode(input), Channel.write), loop),
    onFailure: cause => Channel.failCause(cause),
    onDone: Channel.succeed
  });
  return loop;
};
/**
 * @since 1.0.0
 * @category constructors
 */
export const encodeUnknown = encode;
/**
 * @since 1.0.0
 * @category constructors
 */
export const decode = schema => () => {
  const decode = Schema.decode(Schema.ChunkFromSelf(schema));
  const loop = Channel.readWithCause({
    onInput(chunk) {
      return decode(chunk).pipe(Channel.flatMap(Channel.write), Channel.zipRight(loop));
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
export const decodeUnknown = decode;
/**
 * @since 1.0.0
 * @category combinators
 */
export const duplex = /*#__PURE__*/dual(2, (self, options) => {
  const decode = Schema.decode(Schema.ChunkFromSelf(options.outputSchema));
  return pipe(encode(options.inputSchema)(), Channel.pipeTo(self), Channel.mapOutEffect(decode));
});
/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexUnknown = duplex;
//# sourceMappingURL=ChannelSchema.js.map