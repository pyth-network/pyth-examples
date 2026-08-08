import * as Cookies from "@effect/platform/Cookies";
import * as Headers from "@effect/platform/Headers";
import * as Client from "@effect/platform/HttpClient";
import * as Error from "@effect/platform/HttpClientError";
import * as ClientResponse from "@effect/platform/HttpClientResponse";
import * as IncomingMessage from "@effect/platform/HttpIncomingMessage";
import * as UrlParams from "@effect/platform/UrlParams";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FiberRef from "effect/FiberRef";
import * as Inspectable from "effect/Inspectable";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as NodeStream from "../NodeStream.js";
import * as Undici from "../Undici.js";
/** @internal */
export const Dispatcher = /*#__PURE__*/Context.GenericTag("@effect/platform-node/NodeHttpClient/Dispatcher");
/** @internal */
export const makeDispatcher = /*#__PURE__*/Effect.acquireRelease(/*#__PURE__*/Effect.sync(() => new Undici.Agent()), dispatcher => Effect.promise(() => dispatcher.destroy()));
/** @internal */
export const dispatcherLayer = /*#__PURE__*/Layer.scoped(Dispatcher, makeDispatcher);
/** @internal */
export const dispatcherLayerGlobal = /*#__PURE__*/Layer.sync(Dispatcher, () => Undici.getGlobalDispatcher());
/** @internal */
export const undiciOptionsTagKey = "@effect/platform-node/NodeHttpClient/undiciOptions";
/** @internal */
export const make = dispatcher => Client.make((request, url, signal, fiber) => {
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
export const layerWithoutDispatcher = /*#__PURE__*/Client.layerMergedContext(/*#__PURE__*/Effect.map(Dispatcher, make));
/** @internal */
export const layer = /*#__PURE__*/Layer.provide(layerWithoutDispatcher, dispatcherLayer);
//# sourceMappingURL=httpClientUndici.js.map