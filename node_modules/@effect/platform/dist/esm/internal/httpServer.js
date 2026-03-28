import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { dual } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Client from "../HttpClient.js";
import * as ClientRequest from "../HttpClientRequest.js";
import * as internalEtag from "./etag.js";
import * as internalFileSystem from "./fileSystem.js";
import * as internalPlatform from "./httpPlatform.js";
import * as internalPath from "./path.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpServer");
/** @internal */
export const serverTag = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpServer");
const serverProto = {
  [TypeId]: TypeId
};
/** @internal */
export const isServer = u => typeof u === "object" && u !== null && TypeId in u;
/** @internal */
export const make = options => Object.assign(Object.create(serverProto), options);
/** @internal */
export const serve = /*#__PURE__*/dual(args => Effect.isEffect(args[0]), (httpApp, middleware) => Layer.scopedDiscard(Effect.flatMap(serverTag, server => server.serve(httpApp, middleware))));
/** @internal */
export const serveEffect = /*#__PURE__*/dual(args => Effect.isEffect(args[0]), (httpApp, middleware) => Effect.flatMap(serverTag, server => server.serve(httpApp, middleware)));
/** @internal */
export const formatAddress = address => {
  switch (address._tag) {
    case "UnixAddress":
      return `unix://${address.path}`;
    case "TcpAddress":
      return `http://${address.hostname}:${address.port}`;
  }
};
/** @internal */
export const addressWith = effect => Effect.flatMap(serverTag, server => effect(server.address));
/** @internal */
export const addressFormattedWith = effect => Effect.flatMap(serverTag, server => effect(formatAddress(server.address)));
/** @internal */
export const logAddress = /*#__PURE__*/addressFormattedWith(_ => Effect.log(`Listening on ${_}`));
/** @internal */
export const withLogAddress = layer => Layer.effectDiscard(logAddress).pipe(Layer.provideMerge(layer));
/** @internal */
export const makeTestClient = /*#__PURE__*/addressWith(address => Effect.flatMap(Client.HttpClient, client => {
  if (address._tag === "UnixAddress") {
    return Effect.die(new Error("HttpServer.layerTestClient: UnixAddress not supported"));
  }
  const host = address.hostname === "0.0.0.0" ? "127.0.0.1" : address.hostname;
  const url = `http://${host}:${address.port}`;
  return Effect.succeed(Client.mapRequest(client, ClientRequest.prependUrl(url)));
}));
/** @internal */
export const layerTestClient = /*#__PURE__*/Layer.effect(Client.HttpClient, makeTestClient);
/** @internal */
export const layerContext = /*#__PURE__*/Layer.mergeAll(internalPlatform.layer, internalPath.layer, internalEtag.layerWeak).pipe(/*#__PURE__*/Layer.provideMerge(/*#__PURE__*/internalFileSystem.layerNoop({})));
//# sourceMappingURL=httpServer.js.map