/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as FiberRef from "effect/FiberRef";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { MalformedMessage } from "./ClusterError.js";
import * as Envelope from "./Envelope.js";
/**
 * @since 1.0.0
 * @category incoming
 */
export const incomingLocalFromOutgoing = self => {
  if (self._tag === "OutgoingEnvelope") {
    return new IncomingEnvelope({
      envelope: self.envelope
    });
  }
  return new IncomingRequestLocal({
    envelope: self.envelope,
    respond: self.respond,
    lastSentReply: Option.none()
  });
};
/**
 * @since 1.0.0
 * @category incoming
 */
export class IncomingRequest extends /*#__PURE__*/Data.TaggedClass("IncomingRequest") {}
/**
 * @since 1.0.0
 * @category outgoing
 */
export class IncomingRequestLocal extends /*#__PURE__*/Data.TaggedClass("IncomingRequestLocal") {}
/**
 * @since 1.0.0
 * @category incoming
 */
export class IncomingEnvelope extends /*#__PURE__*/Data.TaggedClass("IncomingEnvelope") {}
/**
 * @since 1.0.0
 * @category outgoing
 */
export class OutgoingRequest extends /*#__PURE__*/Data.TaggedClass("OutgoingRequest") {
  /**
   * @since 1.0.0
   */
  encodedCache;
}
/**
 * @since 1.0.0
 * @category outgoing
 */
export class OutgoingEnvelope extends /*#__PURE__*/Data.TaggedClass("OutgoingEnvelope") {
  /**
   * @since 1.0.0
   */
  static interrupt(options) {
    return new OutgoingEnvelope({
      envelope: new Envelope.Interrupt(options),
      rpc: neverRpc
    });
  }
}
const neverRpc = /*#__PURE__*/Rpc.make("Never", {
  success: Schema.Never,
  error: Schema.Never,
  payload: {}
});
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const serialize = message => {
  if (message._tag !== "OutgoingRequest") {
    return Effect.succeed(message.envelope);
  }
  return Effect.suspend(() => message.encodedCache ? Effect.succeed(message.encodedCache) : serializeRequest(message));
};
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const serializeEnvelope = message => Effect.flatMap(serialize(message), envelope => MalformedMessage.refail(Schema.encode(Envelope.PartialEncoded)(envelope)));
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const serializeRequest = self => {
  const rpc = self.rpc;
  return Schema.encode(rpc.payloadSchema)(self.envelope.payload).pipe(Effect.locally(FiberRef.currentContext, self.context), MalformedMessage.refail, Effect.map(payload => ({
    ...self.envelope,
    payload
  })));
};
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const deserializeLocal = (self, encoded) => {
  if (encoded._tag !== "Request") {
    return Effect.succeed(new IncomingEnvelope({
      envelope: encoded
    }));
  } else if (self._tag !== "OutgoingRequest") {
    return Effect.fail(new MalformedMessage({
      cause: new Error("Can only deserialize a Request with an OutgoingRequest message")
    }));
  }
  const rpc = self.rpc;
  return Schema.decode(rpc.payloadSchema)(encoded.payload).pipe(Effect.locally(FiberRef.currentContext, self.context), MalformedMessage.refail, Effect.map(payload => new IncomingRequestLocal({
    envelope: Envelope.makeRequest({
      ...encoded,
      payload
    }),
    lastSentReply: Option.none(),
    respond: self.respond
  })));
};
//# sourceMappingURL=Message.js.map