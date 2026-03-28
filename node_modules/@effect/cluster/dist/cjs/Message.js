"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.serializeRequest = exports.serializeEnvelope = exports.serialize = exports.incomingLocalFromOutgoing = exports.deserializeLocal = exports.OutgoingRequest = exports.OutgoingEnvelope = exports.IncomingRequestLocal = exports.IncomingRequest = exports.IncomingEnvelope = void 0;
var Rpc = _interopRequireWildcard(require("@effect/rpc/Rpc"));
var Data = _interopRequireWildcard(require("effect/Data"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var _ClusterError = require("./ClusterError.js");
var Envelope = _interopRequireWildcard(require("./Envelope.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category incoming
 */
const incomingLocalFromOutgoing = self => {
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
exports.incomingLocalFromOutgoing = incomingLocalFromOutgoing;
class IncomingRequest extends /*#__PURE__*/Data.TaggedClass("IncomingRequest") {}
/**
 * @since 1.0.0
 * @category outgoing
 */
exports.IncomingRequest = IncomingRequest;
class IncomingRequestLocal extends /*#__PURE__*/Data.TaggedClass("IncomingRequestLocal") {}
/**
 * @since 1.0.0
 * @category incoming
 */
exports.IncomingRequestLocal = IncomingRequestLocal;
class IncomingEnvelope extends /*#__PURE__*/Data.TaggedClass("IncomingEnvelope") {}
/**
 * @since 1.0.0
 * @category outgoing
 */
exports.IncomingEnvelope = IncomingEnvelope;
class OutgoingRequest extends /*#__PURE__*/Data.TaggedClass("OutgoingRequest") {
  /**
   * @since 1.0.0
   */
  encodedCache;
}
/**
 * @since 1.0.0
 * @category outgoing
 */
exports.OutgoingRequest = OutgoingRequest;
class OutgoingEnvelope extends /*#__PURE__*/Data.TaggedClass("OutgoingEnvelope") {
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
exports.OutgoingEnvelope = OutgoingEnvelope;
const neverRpc = /*#__PURE__*/Rpc.make("Never", {
  success: Schema.Never,
  error: Schema.Never,
  payload: {}
});
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
const serialize = message => {
  if (message._tag !== "OutgoingRequest") {
    return Effect.succeed(message.envelope);
  }
  return Effect.suspend(() => message.encodedCache ? Effect.succeed(message.encodedCache) : serializeRequest(message));
};
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
exports.serialize = serialize;
const serializeEnvelope = message => Effect.flatMap(serialize(message), envelope => _ClusterError.MalformedMessage.refail(Schema.encode(Envelope.PartialEncoded)(envelope)));
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
exports.serializeEnvelope = serializeEnvelope;
const serializeRequest = self => {
  const rpc = self.rpc;
  return Schema.encode(rpc.payloadSchema)(self.envelope.payload).pipe(Effect.locally(FiberRef.currentContext, self.context), _ClusterError.MalformedMessage.refail, Effect.map(payload => ({
    ...self.envelope,
    payload
  })));
};
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
exports.serializeRequest = serializeRequest;
const deserializeLocal = (self, encoded) => {
  if (encoded._tag !== "Request") {
    return Effect.succeed(new IncomingEnvelope({
      envelope: encoded
    }));
  } else if (self._tag !== "OutgoingRequest") {
    return Effect.fail(new _ClusterError.MalformedMessage({
      cause: new Error("Can only deserialize a Request with an OutgoingRequest message")
    }));
  }
  const rpc = self.rpc;
  return Schema.decode(rpc.payloadSchema)(encoded.payload).pipe(Effect.locally(FiberRef.currentContext, self.context), _ClusterError.MalformedMessage.refail, Effect.map(payload => new IncomingRequestLocal({
    envelope: Envelope.makeRequest({
      ...encoded,
      payload
    }),
    lastSentReply: Option.none(),
    respond: self.respond
  })));
};
exports.deserializeLocal = deserializeLocal;
//# sourceMappingURL=Message.js.map