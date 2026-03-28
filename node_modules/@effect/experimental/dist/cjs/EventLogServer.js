"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeStorageMemory = exports.makeHandlerHttp = exports.makeHandler = exports.layerStorageMemory = exports.Storage = exports.PersistedEntry = void 0;
var HttpServerRequest = _interopRequireWildcard(require("@effect/platform/HttpServerRequest"));
var HttpServerResponse = _interopRequireWildcard(require("@effect/platform/HttpServerResponse"));
var MsgPack = _interopRequireWildcard(require("@effect/platform/MsgPack"));
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var FiberMap = _interopRequireWildcard(require("effect/FiberMap"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Mailbox = _interopRequireWildcard(require("effect/Mailbox"));
var PubSub = _interopRequireWildcard(require("effect/PubSub"));
var RcMap = _interopRequireWildcard(require("effect/RcMap"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Uuid = _interopRequireWildcard(require("uuid"));
var _EventJournal = require("./EventJournal.js");
var _EventLogEncryption = require("./EventLogEncryption.js");
var _EventLogRemote = require("./EventLogRemote.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const constChunkSize = 512_000;
/**
 * @since 1.0.0
 * @category constructors
 */
const makeHandler = exports.makeHandler = /*#__PURE__*/Effect.gen(function* () {
  const storage = yield* Storage;
  const remoteId = yield* storage.getId;
  let chunkId = 0;
  function* handler(socket) {
    const subscriptions = yield* FiberMap.make();
    const writeRaw = yield* socket.writer;
    const chunks = new Map();
    let latestSequence = -1;
    function* writeGen(response) {
      const data = (0, _EventLogRemote.encodeResponse)(response);
      if (response._tag !== "Changes" || data.byteLength <= constChunkSize) {
        return yield* writeRaw(data);
      }
      const id = chunkId++;
      for (const part of _EventLogRemote.ChunkedMessage.split(id, data)) {
        yield* writeRaw((0, _EventLogRemote.encodeResponse)(part));
      }
    }
    const write = response => Effect.gen(() => writeGen(response));
    yield* Effect.fork(write(new _EventLogRemote.Hello({
      remoteId
    })));
    function handleRequest(request) {
      switch (request._tag) {
        case "Ping":
          {
            return write(new _EventLogRemote.Pong({
              id: request.id
            }));
          }
        case "WriteEntries":
          {
            if (request.encryptedEntries.length === 0) {
              return write(new _EventLogRemote.Ack({
                id: request.id,
                sequenceNumbers: []
              }));
            }
            return Effect.gen(function* () {
              const entries = request.encryptedEntries.map(({
                encryptedEntry,
                entryId
              }) => new PersistedEntry({
                entryId,
                iv: request.iv,
                encryptedEntry
              }));
              const encrypted = yield* storage.write(request.publicKey, entries);
              latestSequence = encrypted[encrypted.length - 1].sequence;
              return yield* write(new _EventLogRemote.Ack({
                id: request.id,
                sequenceNumbers: encrypted.map(e => e.sequence)
              }));
            });
          }
        case "RequestChanges":
          {
            return Effect.gen(function* () {
              const changes = yield* storage.changes(request.publicKey, request.startSequence);
              return yield* changes.takeAll.pipe(Effect.flatMap(function ([entries]) {
                const latestEntries = [];
                for (const entry of entries) {
                  if (entry.sequence <= latestSequence) continue;
                  latestEntries.push(entry);
                  latestSequence = entry.sequence;
                }
                if (latestEntries.length === 0) return Effect.void;
                return write(new _EventLogRemote.Changes({
                  publicKey: request.publicKey,
                  entries: Chunk.toReadonlyArray(entries)
                }));
              }), Effect.forever);
            }).pipe(Effect.scoped, FiberMap.run(subscriptions, request.publicKey));
          }
        case "StopChanges":
          {
            return FiberMap.remove(subscriptions, request.publicKey);
          }
        case "ChunkedMessage":
          {
            const data = _EventLogRemote.ChunkedMessage.join(chunks, request);
            if (!data) return;
            return handleRequest((0, _EventLogRemote.decodeRequest)(data));
          }
      }
    }
    yield* socket.run(data => handleRequest((0, _EventLogRemote.decodeRequest)(data))).pipe(Effect.catchAllCause(Effect.logDebug));
  }
  return socket => Effect.gen(() => handler(socket)).pipe(Effect.annotateLogs({
    module: "EventLogServer"
  }));
});
/**
 * @since 1.0.0
 * @category websockets
 */
const makeHandlerHttp = exports.makeHandlerHttp = /*#__PURE__*/Effect.gen(function* () {
  const handler = yield* makeHandler;
  return Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const socket = yield* request.upgrade;
    yield* handler(socket);
    return HttpServerResponse.empty();
  }).pipe(Effect.annotateLogs({
    module: "EventLogServer"
  }));
});
/**
 * @since 1.0.0
 * @category storage
 */
class PersistedEntry extends /*#__PURE__*/Schema.Class("@effect/experimental/EventLogServer/PersistedEntry")({
  entryId: _EventJournal.EntryId,
  iv: Schema.Uint8ArrayFromSelf,
  encryptedEntry: Schema.Uint8ArrayFromSelf
}) {
  /**
   * @since 1.0.0
   */
  static fromMsgPack = /*#__PURE__*/MsgPack.schema(PersistedEntry);
  /**
   * @since 1.0.0
   */
  static encode = /*#__PURE__*/Schema.encodeSync(this.fromMsgPack);
  /**
   * @since 1.0.0
   */
  get entryIdString() {
    return Uuid.stringify(this.entryId);
  }
}
/**
 * @since 1.0.0
 * @category storage
 */
exports.PersistedEntry = PersistedEntry;
class Storage extends /*#__PURE__*/Context.Tag("@effect/experimental/EventLogServer/Storage")() {}
/**
 * @since 1.0.0
 * @category storage
 */
exports.Storage = Storage;
const makeStorageMemory = exports.makeStorageMemory = /*#__PURE__*/Effect.gen(function* () {
  const knownIds = new Map();
  const journals = new Map();
  const remoteId = (0, _EventJournal.makeRemoteId)();
  const ensureJournal = publicKey => {
    let journal = journals.get(publicKey);
    if (journal) return journal;
    journal = [];
    journals.set(publicKey, journal);
    return journal;
  };
  const pubsubs = yield* RcMap.make({
    lookup: _publicKey => Effect.acquireRelease(PubSub.unbounded(), PubSub.shutdown),
    idleTimeToLive: 60000
  });
  return Storage.of({
    getId: Effect.succeed(remoteId),
    write: (publicKey, entries) => Effect.gen(function* () {
      const active = yield* RcMap.keys(pubsubs);
      const pubsub = active.includes(publicKey) ? yield* RcMap.get(pubsubs, publicKey) : undefined;
      const journal = ensureJournal(publicKey);
      const encryptedEntries = [];
      for (const entry of entries) {
        const idString = entry.entryIdString;
        if (knownIds.has(idString)) continue;
        const encrypted = _EventLogEncryption.EncryptedRemoteEntry.make({
          sequence: journal.length,
          entryId: entry.entryId,
          iv: entry.iv,
          encryptedEntry: entry.encryptedEntry
        });
        encryptedEntries.push(encrypted);
        knownIds.set(idString, encrypted.sequence);
        journal.push(encrypted);
        pubsub?.unsafeOffer(encrypted);
      }
      return encryptedEntries;
    }).pipe(Effect.scoped),
    entries: (publicKey, startSequence) => Effect.sync(() => ensureJournal(publicKey).slice(startSequence)),
    changes: (publicKey, startSequence) => Effect.gen(function* () {
      const mailbox = yield* Mailbox.make();
      const pubsub = yield* RcMap.get(pubsubs, publicKey);
      const queue = yield* pubsub.subscribe;
      yield* mailbox.offerAll(ensureJournal(publicKey).slice(startSequence));
      yield* queue.takeBetween(1, Number.MAX_SAFE_INTEGER).pipe(Effect.tap(chunk => mailbox.offerAll(chunk)), Effect.forever, Effect.forkScoped, Effect.interruptible);
      return mailbox;
    })
  });
});
/**
 * @since 1.0.0
 * @category storage
 */
const layerStorageMemory = exports.layerStorageMemory = /*#__PURE__*/Layer.scoped(Storage, makeStorageMemory);
//# sourceMappingURL=EventLogServer.js.map