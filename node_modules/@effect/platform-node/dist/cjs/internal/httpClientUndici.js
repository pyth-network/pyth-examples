"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.undiciOptionsTagKey = exports.makeDispatcher = exports.make = exports.layerWithoutDispatcher = exports.layer = exports.dispatcherLayerGlobal = exports.dispatcherLayer = exports.Dispatcher = void 0;
var Cookies = _interopRequireWildcard(require("@effect/platform/Cookies"));
var Headers = _interopRequireWildcard(require("@effect/platform/Headers"));
var Client = _interopRequireWildcard(require("@effect/platform/HttpClient"));
var Error = _interopRequireWildcard(require("@effect/platform/HttpClientError"));
var ClientResponse = _interopRequireWildcard(require("@effect/platform/HttpClientResponse"));
var IncomingMessage = _interopRequireWildcard(require("@effect/platform/HttpIncomingMessage"));
var UrlParams = _interopRequireWildcard(require("@effect/platform/UrlParams"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var NodeStream = _interopRequireWildcard(require("../NodeStream.js"));
var Undici = _interopRequireWildcard(require("../Undici.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const Dispatcher = exports.Dispatcher = /*#__PURE__*/Context.GenericTag("@effect/platform-node/NodeHttpClient/Dispatcher");
/** @internal */
const makeDispatcher = exports.makeDispatcher = /*#__PURE__*/Effect.acquireRelease(/*#__PURE__*/Effect.sync(() => new Undici.Agent()), dispatcher => Effect.promise(() => dispatcher.destroy()));
/** @internal */
const dispatcherLayer = exports.dispatcherLayer = /*#__PURE__*/Layer.scoped(Dispatcher, makeDispatcher);
/** @internal */
const dispatcherLayerGlobal = exports.dispatcherLayerGlobal = /*#__PURE__*/Layer.sync(Dispatcher, () => Undici.getGlobalDispatcher());
/** @internal */
const undiciOptionsTagKey = exports.undiciOptionsTagKey = "@effect/platform-node/NodeHttpClient/undiciOptions";
/** @internal */
const make = dispatcher => Client.make((request, url, signal, fiber) => {
  const context = fiber.getFiberRef(FiberRef.currentContext);
  const options = context.unsafeMap.get(undiciOptionsTagKey) ?? {};
  return convertBody(request.body).pipe(Effect.flatMap(body => Effect.tryPromise({
    try: () => dispatcher.request({
      ...options,
      signal,
      method: request.method,
      headers: request.headers,
      origin: url.origin,
      path: url.pathname + url.search + url.hash,
      body,
      // leave timeouts to Effect.timeout etc
      headersTimeout: 60 * 60 * 1000,
      bodyTimeout: 0
    }),
    catch: cause => new Error.RequestError({
      request,
      reason: "Transport",
      cause
    })
  })), Effect.map(response => new ClientResponseImpl(request, response)));
});
exports.make = make;
function convertBody(body) {
  switch (body._tag) {
    case "Empty":
      {
        return Effect.succeed(null);
      }
    case "Uint8Array":
    case "Raw":
      {
        return Effect.succeed(body.body);
      }
    case "FormData":
      {
        return Effect.succeed(body.formData);
      }
    case "Stream":
      {
        return NodeStream.toReadable(body.stream);
      }
  }
}
function noopErrorHandler(_) {}
class ClientResponseImpl extends Inspectable.Class {
  request;
  source;
  [IncomingMessage.TypeId];
  [ClientResponse.TypeId];
  constructor(request, source) {
    super();
    this.request = request;
    this.source = source;
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId;
    this[ClientResponse.TypeId] = ClientResponse.TypeId;
    source.body.on("error", noopErrorHandler);
  }
  get status() {
    return this.source.statusCode;
  }
  get statusText() {
    return undefined;
  }
  cachedCookies;
  get cookies() {
    if (this.cachedCookies !== undefined) {
      return this.cachedCookies;
    }
    const header = this.source.headers["set-cookie"];
    if (header !== undefined) {
      return this.cachedCookies = Cookies.fromSetCookie(Array.isArray(header) ? header : [header]);
    }
    return this.cachedCookies = Cookies.empty;
  }
  get headers() {
    return Headers.fromInput(this.source.headers);
  }
  get remoteAddress() {
    return Option.none();
  }
  get stream() {
    return NodeStream.fromReadable(() => this.source.body, cause => new Error.ResponseError({
      request: this.request,
      response: this,
      reason: "Decode",
      cause
    }));
  }
  get json() {
    return Effect.tryMap(this.text, {
      try: text => text === "" ? null : JSON.parse(text),
      catch: cause => new Error.ResponseError({
        request: this.request,
        response: this,
        reason: "Decode",
        cause
      })
    });
  }
  textBody;
  get text() {
    return this.textBody ??= Effect.tryPromise({
      try: () => this.source.body.text(),
      catch: cause => new Error.ResponseError({
        request: this.request,
        response: this,
        reason: "Decode",
        cause
      })
    }).pipe(Effect.cached, Effect.runSync);
  }
  get urlParamsBody() {
    return Effect.flatMap(this.text, _ => Effect.try({
      try: () => UrlParams.fromInput(new URLSearchParams(_)),
      catch: cause => new Error.ResponseError({
        request: this.request,
        response: this,
        reason: "Decode",
        cause
      })
    }));
  }
  formDataBody;
  get formData() {
    return this.formDataBody ??= Effect.tryPromise({
      try: () => this.source.body.formData(),
      catch: cause => new Error.ResponseError({
        request: this.request,
        response: this,
        reason: "Decode",
        cause
      })
    }).pipe(Effect.cached, Effect.runSync);
  }
  arrayBufferBody;
  get arrayBuffer() {
    return this.arrayBufferBody ??= Effect.tryPromise({
      try: () => this.source.body.arrayBuffer(),
      catch: cause => new Error.ResponseError({
        request: this.request,
        response: this,
        reason: "Decode",
        cause
      })
    }).pipe(Effect.cached, Effect.runSync);
  }
  toJSON() {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/HttpClientResponse",
      request: this.request.toJSON(),
      status: this.status
    });
  }
}
/** @internal */
const layerWithoutDispatcher = exports.layerWithoutDispatcher = /*#__PURE__*/Client.layerMergedContext(/*#__PURE__*/Effect.map(Dispatcher, make));
/** @internal */
const layer = exports.layer = /*#__PURE__*/Layer.provide(layerWithoutDispatcher, dispatcherLayer);
//# sourceMappingURL=httpClientUndici.js.map