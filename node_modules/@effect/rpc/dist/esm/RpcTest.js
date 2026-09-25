/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as RpcClient from "./RpcClient.js";
import * as RpcServer from "./RpcServer.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeClient = /*#__PURE__*/Effect.fnUntraced(function* (group, options) {
  // eslint-disable-next-line prefer-const
  let client;
  const server = yield* RpcServer.makeNoSerialization(group, {
    onFromServer(response) {
      return client.write(response);
    }
  });
  client = yield* RpcClient.makeNoSerialization(group, {
    supportsAck: true,
    flatten: options?.flatten,
    onFromClient({
      message
    }) {
      return server.write(0, message);
    }
  });
  return client.client;
});
//# sourceMappingURL=RpcTest.js.map