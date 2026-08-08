"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withLogAddress = exports.serverTag = exports.serveEffect = exports.serve = exports.makeTestClient = exports.make = exports.logAddress = exports.layerTestClient = exports.layerContext = exports.isServer = exports.formatAddress = exports.addressWith = exports.addressFormattedWith = exports.TypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Client = _interopRequireWildcard(require("../HttpClient.js"));
var ClientRequest = _interopRequireWildcard(require("../HttpClientRequest.js"));
var internalEtag = _interopRequireWildcard(require("./etag.js"));
var internalFileSystem = _interopRequireWildcard(require("./fileSystem.js"));
var internalPlatform = _interopRequireWildcard(require("./httpPlatform.js"));
var internalPath = _interopRequireWildcard(require("./path.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpServer");
/** @internal */
const serverTag = exports.serverTag = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpServer");
const serverProto = {
  [TypeId]: TypeId
};
/** @internal */
const isServer = u => typeof u === "object" && u !== null && TypeId in u;
/** @internal */
exports.isServer = isServer;
const make = options => Object.assign(Object.create(serverProto), options);
/** @internal */
exports.make = make;
const serve = exports.serve = /*#__PURE__*/(0, _Function.dual)(args => Effect.isEffect(args[0]), (httpApp, middleware) => Layer.scopedDiscard(Effect.flatMap(serverTag, server => server.serve(httpApp, middleware))));
/** @internal */
const serveEffect = exports.serveEffect = /*#__PURE__*/(0, _Function.dual)(args => Effect.isEffect(args[0]), (httpApp, middleware) => Effect.flatMap(serverTag, server => server.serve(httpApp, middleware)));
/** @internal */
const formatAddress = address => {
  switch (address._tag) {
    case "UnixAddress":
      return `unix://${address.path}`;
    case "TcpAddress":
      return `http://${address.hostname}:${address.port}`;
  }
};
/** @internal */
exports.formatAddress = formatAddress;
const addressWith = effect => Effect.flatMap(serverTag, server => effect(server.address));
/** @internal */
exports.addressWith = addressWith;
const addressFormattedWith = effect => Effect.flatMap(serverTag, server => effect(formatAddress(server.address)));
/** @internal */
exports.addressFormattedWith = addressFormattedWith;
const logAddress = exports.logAddress = /*#__PURE__*/addressFormattedWith(_ => Effect.log(`Listening on ${_}`));
/** @internal */
const withLogAddress = layer => Layer.effectDiscard(logAddress).pipe(Layer.provideMerge(layer));
/** @internal */
exports.withLogAddress = withLogAddress;
const makeTestClient = exports.makeTestClient = /*#__PURE__*/addressWith(address => Effect.flatMap(Client.HttpClient, client => {
  if (address._tag === "UnixAddress") {
    return Effect.die(new Error("HttpServer.layerTestClient: UnixAddress not supported"));
  }
  const host = address.hostname === "0.0.0.0" ? "127.0.0.1" : address.hostname;
  const url = `http://${host}:${address.port}`;
  return Effect.succeed(Client.mapRequest(client, ClientRequest.prependUrl(url)));
}));
/** @internal */
const layerTestClient = exports.layerTestClient = /*#__PURE__*/Layer.effect(Client.HttpClient, makeTestClient);
/** @internal */
const layerContext = exports.layerContext = /*#__PURE__*/Layer.mergeAll(internalPlatform.layer, internalPath.layer, internalEtag.layerWeak).pipe(/*#__PURE__*/Layer.provideMerge(/*#__PURE__*/internalFileSystem.layerNoop({})));
//# sourceMappingURL=httpServer.js.map