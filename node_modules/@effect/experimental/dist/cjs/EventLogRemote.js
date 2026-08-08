"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerWebSocketBrowser = exports.layerWebSocket = exports.fromWebSocket = exports.fromSocket = exports.encodeResponse = exports.encodeRequest = exports.decodeResponse = exports.decodeRequest = exports.WriteEntries = exports.StopChanges = exports.RequestChanges = exports.RemoteAdditions = exports.ProtocolResponseMsgPack = exports.ProtocolResponse = exports.ProtocolRequestMsgPack = exports.ProtocolRequest = exports.Pong = exports.Ping = exports.Hello = exports.ChunkedMessage = exports.Changes = exports.Ack = void 0;
var MsgPack = _interopRequireWildcard(require("@effect/platform/MsgPack"));
var Socket = _interopRequireWildcard(require("@effect/platform/Socket"));
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Exit = _interopRequireWildcard(require("effect/Exit"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Mailbox = _interopRequireWildcard(require("effect/Mailbox"));
var RcMap = _interopRequireWildcard(require("effect/RcMap"));
var Schedule = _interopRequireWildcard(require("effect/Schedule"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Scope = _interopRequireWildcard(require("effect/Scope"));
var _EventJournal = require("./EventJournal.js");
var _EventLog = require("./EventLog.js");
var _EventLogEncryption = require("./EventLogEncryption.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category protocol
 */
class Hello extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/Hello")("Hello", {
  remoteId: _EventJournal.RemoteId
}) {}
/**
 * @since 1.0.0
 * @category protocol
 */
exports.Hello = Hello;
class ChunkedMessage extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/ChunkedMessage")("ChunkedMessage", {
  id: Schema.Number,
  part: /*#__PURE__*/Schema.Tuple(Schema.Number, Schema.Number),
  data: Schema.Uint8ArrayFromSelf
}) {
  /**
   * @since 1.0.0
   */
  static split(id, data) {
    const parts = Math.ceil(data.byteLength / constChunkSize);
    const result = new Array(parts);
    for (let i = 0; i < parts; i++) {
      const start = i * constChunkSize;
      const end = Math.min((i + 1) * constChunkSize, data.byteLength);
      result[i] = new ChunkedMessage({
        id,
        part: [i, parts],
        data: data.subarray(start, end)
      });
    }
    return result;
  }
  /**
   * @since 1.0.0
   */
  static join(map, part) {
    const [index, total] = part.part;
    let entry = map.get(part.id);
    if (!entry) {
      entry = {
        parts: new Array(total),
        count: 0,
        bytes: 0
      };
      map.set(part.id, entry);
    }
    entry.parts[index] = part.data;
    entry.count++;
    entry.bytes += part.data.byteLength;
    if (entry.count !== total) {
      return;
    }
    const data = new Uint8Array(entry.bytes);
    let offset = 0;
    for (const part of entry.parts) {
      data.set(part, offset);
      offset += part.byteLength;
    }
    map.delete(part.id);
    return data;
  }
}
/**
 * @since 1.0.0
 * @category protocol
 */
exports.ChunkedMessage = ChunkedMessage;
class WriteEntries extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/WriteEntries")("WriteEntries", {
  publicKey: Schema.String,
  id: Schema.Number,
  iv: Schema.Uint8ArrayFromSelf,
  encryptedEntries: /*#__PURE__*/Schema.Array(_EventLogEncryption.EncryptedEntry)
}) {}
/**
 * @since 1.0.0
 * @category protocol
 */
exports.WriteEntries = WriteEntries;
class Ack extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/Ack")("Ack", {
  id: Schema.Number,
  sequenceNumbers: /*#__PURE__*/Schema.Array(Schema.Number)
}) {}
/**
 * @since 1.0.0
 * @category protocol
 */
exports.Ack = Ack;
class RequestChanges extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/RequestChanges")("RequestChanges", {
  publicKey: Schema.String,
  startSequence: Schema.Number
}) {}
/**
 * @since 1.0.0
 * @category protocol
 */
exports.RequestChanges = RequestChanges;
class Changes extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/Changes")("Changes", {
  publicKey: Schema.String,
  entries: /*#__PURE__*/Schema.Array(_EventLogEncryption.EncryptedRemoteEntry)
}) {}
/**
 * @since 1.0.0
 * @category protocol
 */
exports.Changes = Changes;
class StopChanges extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/StopChanges")("StopChanges", {
  publicKey: Schema.String
}) {}
/**
 * @since 1.0.0
 * @category protocol
 */
exports.StopChanges = StopChanges;
class Ping extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/Ping")("Ping", {
  id: Schema.Number
}) {}
/**
 * @since 1.0.0
 * @category protocol
 */
exports.Ping = Ping;
class Pong extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/Pong")("Pong", {
  id: Schema.Number
}) {}
/**
 * @since 1.0.0
 * @category protocol
 */
exports.Pong = Pong;
const ProtocolRequest = exports.ProtocolRequest = /*#__PURE__*/Schema.Union(WriteEntries, RequestChanges, StopChanges, ChunkedMessage, Ping);
/**
 * @since 1.0.0
 * @category protocol
 */
const ProtocolRequestMsgPack = exports.ProtocolRequestMsgPack = /*#__PURE__*/MsgPack.schema(ProtocolRequest);
/**
 * @since 1.0.0
 * @category protocol
 */
const decodeRequest = exports.decodeRequest = /*#__PURE__*/Schema.decodeSync(ProtocolRequestMsgPack);
/**
 * @since 1.0.0
 * @category protocol
 */
const encodeRequest = exports.encodeRequest = /*#__PURE__*/Schema.encodeSync(ProtocolRequestMsgPack);
/**
 * @since 1.0.0
 * @category protocol
 */
const ProtocolResponse = exports.ProtocolResponse = /*#__PURE__*/Schema.Union(Hello, Ack, Changes, ChunkedMessage, Pong);
/**
 * @since 1.0.0
 * @category protocol
 */
const ProtocolResponseMsgPack = exports.ProtocolResponseMsgPack = /*#__PURE__*/MsgPack.schema(ProtocolResponse);
/**
 * @since 1.0.0
 * @category protocol
 */
const decodeResponse = exports.decodeResponse = /*#__PURE__*/Schema.decodeSync(ProtocolResponseMsgPack);
/**
 * @since 1.0.0
 * @category protocol
 */
const encodeResponse = exports.encodeResponse = /*#__PURE__*/Schema.encodeSync(ProtocolResponseMsgPack);
/**
 * @since 1.0.0
 * @category change
 */
class RemoteAdditions extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventLogRemote/RemoveAdditions")("RemoveAdditions", {
  entries: /*#__PURE__*/Schema.Array(_EventJournal.RemoteEntry)
}) {}
exports.RemoteAdditions = RemoteAdditions;
const constChunkSize = 512_000;
/**
 * @since 1.0.0
 * @category construtors
 */
const fromSocket = options => Effect.gen(function* () {
  const log = yield* _EventLog.EventLog;
  const socket = yield* Socket.Socket;
  const encryption = yield* _EventLogEncryption.EventLogEncryption;
  const scope = yield* Effect.scope;
  const writeRaw = yield* socket.writer;
  function* writeGen(request) {
    const data = encodeRequest(request);
    if (request._tag !== "WriteEntries" || data.byteLength <= constChunkSize) {
      return yield* writeRaw(data);
    }
    const id = request.id;
    for (const part of ChunkedMessage.split(id, data)) {
      yield* writeRaw(encodeRequest(part));
    }
  }
  const write = request => Effect.gen(() => writeGen(request));
  yield* Effect.gen(function* () {
    let pendingCounter = 0;
    const pending = new Map();
    const chunks = new Map();
    const subscriptions = yield* RcMap.make({
      lookup: publicKey => Effect.acquireRelease(Mailbox.make(), mailbox => Effect.zipRight(mailbox.shutdown, Effect.ignoreLogged(write(new StopChanges({
        publicKey
      })))))
    });
    const identities = new WeakMap();
    const badPing = yield* Deferred.make();
    let latestPing = 0;
    let latestPong = 0;
    if (options?.disablePing !== true) {
      yield* Effect.suspend(() => {
        if (latestPing !== latestPong) {
          return Deferred.fail(badPing, new Error("Ping timeout"));
        }
        return write(new Ping({
          id: ++latestPing
        }));
      }).pipe(Effect.delay(10000), Effect.forever, Effect.fork, Effect.interruptible);
    }
    function handleMessage(res) {
      switch (res._tag) {
        case "Hello":
          {
            return log.registerRemote({
              id: res.remoteId,
              write: (identity, entries) => Effect.gen(function* () {
                const encrypted = yield* encryption.encrypt(identity, entries);
                const deferred = yield* Deferred.make();
                const id = pendingCounter++;
                pending.set(id, {
                  entries,
                  deferred,
                  publicKey: identity.publicKey
                });
                yield* Effect.orDie(write(new WriteEntries({
                  publicKey: identity.publicKey,
                  id,
                  iv: encrypted.iv,
                  encryptedEntries: encrypted.encryptedEntries.map((encryptedEntry, i) => ({
                    entryId: entries[i].id,
                    encryptedEntry
                  }))
                })));
                yield* Deferred.await(deferred);
              }),
              changes: (identity, startSequence) => Effect.gen(function* () {
                const mailbox = yield* RcMap.get(subscriptions, identity.publicKey);
                identities.set(mailbox, identity);
                yield* Effect.orDie(write(new RequestChanges({
                  publicKey: identity.publicKey,
                  startSequence
                })));
                return mailbox;
              })
            }).pipe(Scope.extend(scope));
          }
        case "Ack":
          {
            return Effect.gen(function* () {
              const entry = pending.get(res.id);
              if (!entry) return;
              pending.delete(res.id);
              const {
                deferred,
                entries,
                publicKey
              } = entry;
              const remoteEntries = res.sequenceNumbers.map((sequenceNumber, i) => {
                const entry = entries[i];
                return new _EventJournal.RemoteEntry({
                  remoteSequence: sequenceNumber,
                  entry
                });
              });
              const mailbox = yield* RcMap.get(subscriptions, publicKey);
              yield* mailbox.offerAll(remoteEntries);
              yield* Deferred.done(deferred, Exit.void);
            });
          }
        case "Pong":
          {
            latestPong = res.id;
            if (res.id === latestPing) {
              return;
            }
            return Effect.fail(new Error("Pong id mismatch"));
          }
        case "Changes":
          {
            return Effect.gen(function* () {
              const mailbox = yield* RcMap.get(subscriptions, res.publicKey);
              const identity = identities.get(mailbox);
              const entries = yield* encryption.decrypt(identity, res.entries);
              yield* mailbox.offerAll(entries);
            }).pipe(Effect.scoped);
          }
        case "ChunkedMessage":
          {
            const data = ChunkedMessage.join(chunks, res);
            if (!data) return;
            return handleMessage(decodeResponse(data));
          }
      }
    }
    return yield* socket.run(data => handleMessage(decodeResponse(data))).pipe(Effect.raceFirst(Deferred.await(badPing)));
  }).pipe(Effect.scoped, Effect.tapErrorCause(Effect.logDebug), Effect.retry({
    schedule: Schedule.exponential(100).pipe(Schedule.union(Schedule.spaced(5000)))
  }), Effect.annotateLogs({
    service: "EventLogRemote",
    method: "fromSocket"
  }), Effect.forkScoped, Effect.interruptible);
});
/**
 * @since 1.0.0
 * @category construtors
 */
exports.fromSocket = fromSocket;
const fromWebSocket = (url, options) => Effect.gen(function* () {
  const socket = yield* Socket.makeWebSocket(url);
  return yield* fromSocket(options).pipe(Effect.provideService(Socket.Socket, socket));
});
/**
 * @since 1.0.0
 * @category layers
 */
exports.fromWebSocket = fromWebSocket;
const layerWebSocket = (url, options) => Layer.scopedDiscard(fromWebSocket(url, options));
/**
 * @since 1.0.0
 * @category layers
 */
exports.layerWebSocket = layerWebSocket;
const layerWebSocketBrowser = (url, options) => layerWebSocket(url, options).pipe(Layer.provide([_EventLogEncryption.layerSubtle, Socket.layerWebSocketConstructorGlobal]));
exports.layerWebSocketBrowser = layerWebSocketBrowser;
//# sourceMappingURL=EventLogRemote.js.map