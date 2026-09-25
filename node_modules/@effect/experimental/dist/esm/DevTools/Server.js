/**
 * @since 1.0.0
 */
import * as Ndjson from "@effect/platform/Ndjson";
import * as Socket from "@effect/platform/Socket";
import * as SocketServer from "@effect/platform/SocketServer";
import * as Effect from "effect/Effect";
import * as Mailbox from "effect/Mailbox";
import * as Stream from "effect/Stream";
import * as Domain from "./Domain.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export const run = /*#__PURE__*/Effect.fnUntraced(function* (handle) {
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