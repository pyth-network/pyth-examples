"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.run = void 0;
var Ndjson = _interopRequireWildcard(require("@effect/platform/Ndjson"));
var Socket = _interopRequireWildcard(require("@effect/platform/Socket"));
var SocketServer = _interopRequireWildcard(require("@effect/platform/SocketServer"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Mailbox = _interopRequireWildcard(require("effect/Mailbox"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var Domain = _interopRequireWildcard(require("./Domain.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category constructors
 */
const run = exports.run = /*#__PURE__*/Effect.fnUntraced(function* (handle) {
  const server = yield* SocketServer.SocketServer;
  return yield* server.run(socket => Effect.gen(function* () {
    const responses = yield* Mailbox.make();
    const requests = yield* Mailbox.make();
    const client = {
      queue: requests,
      request: res => responses.offer(res)
    };
    yield* Mailbox.toStream(responses).pipe(Stream.pipeThroughChannel(Ndjson.duplexSchemaString(Socket.toChannelString(socket), {
      inputSchema: Domain.Response,
      outputSchema: Domain.Request
    })), Stream.runForEach(req => req._tag === "Ping" ? responses.offer({
      _tag: "Pong"
    }) : requests.offer(req)), Effect.ensuring(Effect.zipRight(responses.shutdown, requests.shutdown)), Effect.fork);
    yield* handle(client);
  }));
});
//# sourceMappingURL=Server.js.map