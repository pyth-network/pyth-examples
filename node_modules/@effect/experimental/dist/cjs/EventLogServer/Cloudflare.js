"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventLogDurableObject = void 0;
var _cloudflareWorkers = require("cloudflare:workers");
var Cause = _interopRequireWildcard(require("effect/Cause"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var ManagedRuntime = _interopRequireWildcard(require("effect/ManagedRuntime"));
var _EventJournal = require("../EventJournal.js");
var EventLogRemote = _interopRequireWildcard(require("../EventLogRemote.js"));
var EventLogServer = _interopRequireWildcard(require("../EventLogServer.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */
/// <reference types="@cloudflare/workers-types" />

/**
 * @since 1.0.0
 * @category DurableObject
 */
class EventLogDurableObject extends _cloudflareWorkers.DurableObject {
  /**
   * @since 1.0.0
   */
  runtime;
  constructor(options) {
    super(options.ctx, options.env);
    this.ctx.setHibernatableWebSocketEventTimeout(5000);
    this.runtime = ManagedRuntime.make(options.storageLayer);
  }
  /**
   * @since 1.0.0
   */
  webSocketMessage(ws, message) {
    return this.handleRequest(ws, EventLogRemote.decodeRequest(message instanceof ArrayBuffer ? new Uint8Array(message) : new TextEncoder().encode(message)));
  }
  chunks = /*#__PURE__*/new Map();
  /**
   * @since 1.0.0
   */
  async handleRequest(ws, request) {
    switch (request._tag) {
      case "WriteEntries":
        {
          return Effect.gen(this, function* () {
            const storage = yield* EventLogServer.Storage;
            const entries = request.encryptedEntries.map(({
              encryptedEntry,
              entryId
            }) => new EventLogServer.PersistedEntry({
              entryId,
              iv: request.iv,
              encryptedEntry
            }));
            const encryptedEntries = yield* storage.write(request.publicKey, entries);
            ws.send(EventLogRemote.encodeResponse(new EventLogRemote.Ack({
              id: request.id,
              sequenceNumbers: encryptedEntries.map(_ => _.sequence)
            })));
            const changes = this.encodeChanges(request.publicKey, encryptedEntries);
            for (const peer of this.ctx.getWebSockets()) {
              if (peer === ws) continue;
              for (const change of changes) {
                peer.send(change);
              }
            }
          }).pipe(this.runtime.runPromise);
        }
      case "ChunkedMessage":
        {
          const data = EventLogRemote.ChunkedMessage.join(this.chunks, request);
          if (!data) return;
          return this.handleRequest(ws, EventLogRemote.decodeRequest(data));
        }
      case "RequestChanges":
        {
          return Effect.gen(this, function* () {
            const storage = yield* EventLogServer.Storage;
            const entries = yield* storage.entries(request.publicKey, request.startSequence);
            if (entries.length === 0) return;
            const changes = this.encodeChanges(request.publicKey, entries);
            for (const change of changes) {
              ws.send(change);
            }
          }).pipe(this.runtime.runPromise);
        }
    }
  }
  /**
   * @since 1.0.0
   */
  encodeChanges(publicKey, entries) {
    let changes = [EventLogRemote.encodeResponse(new EventLogRemote.Changes({
      publicKey,
      entries
    }))];
    if (changes[0].byteLength > 512_000) {
      changes = EventLogRemote.ChunkedMessage.split(Math.floor(Math.random() * 1_000_000_000), changes[0]).map(_ => EventLogRemote.encodeResponse(_));
    }
    return changes;
  }
  /**
   * @since 1.0.0
   */
  webSocketError(_ws, error) {
    this.runtime.runFork(Effect.logWarning(Cause.fail(error)));
  }
  /**
   * @since 1.0.0
   */
  webSocketClose(_ws, code, reason) {
    this.runtime.runFork(Effect.logWarning("WebSocket closed", {
      code,
      reason
    }));
  }
  /**
   * @since 1.0.0
   */
  async fetch() {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    this.ctx.acceptWebSocket(server);
    EventLogServer.Storage.pipe(Effect.flatMap(_ => _.getId), Effect.tap(remoteId => {
      server.send(EventLogRemote.encodeResponse(new EventLogRemote.Hello({
        remoteId: _EventJournal.RemoteId.make(remoteId)
      })));
    }), this.runtime.runFork);
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
}
exports.EventLogDurableObject = EventLogDurableObject;
//# sourceMappingURL=Cloudflare.js.map