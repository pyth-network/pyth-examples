import * as Channel from "effect/Channel";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Inspectable from "effect/Inspectable";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Cookies from "../Cookies.js";
import * as Headers from "../Headers.js";
import * as IncomingMessage from "../HttpIncomingMessage.js";
import * as Error from "../HttpServerError.js";
import * as Multipart from "../Multipart.js";
import * as Socket from "../Socket.js";
import * as UrlParams from "../UrlParams.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpServerRequest");
/** @internal */
export const serverRequestTag = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpServerRequest");
/** @internal */
export const parsedSearchParamsTag = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpServerRequest/ParsedSearchParams");
/** @internal */
export const upgrade = /*#__PURE__*/Effect.flatMap(serverRequestTag, request => request.upgrade);
/** @internal */
export const upgradeChannel = () => Channel.unwrap(Effect.map(upgrade, Socket.toChannelWith()));
/** @internal */
export const multipartPersisted = /*#__PURE__*/Effect.flatMap(serverRequestTag, request => request.multipart);
/** @internal */
export const searchParamsFromURL = url => {
  const out = {};
  for (const [key, value] of url.searchParams.entries()) {
    const entry = out[key];
    if (entry !== undefined) {
      if (Array.isArray(entry)) {
        entry.push(value);
      } else {
        out[key] = [entry, value];
      }
    } else {
      out[key] = value;
    }
  }
  return out;
};
/** @internal */
export const schemaCookies = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return Effect.flatMap(serverRequestTag, req => parse(req.cookies));
};
/** @internal */
export const schemaHeaders = (schema, options) => {
  const parse = IncomingMessage.schemaHeaders(schema, options);
  return Effect.flatMap(serverRequestTag, parse);
};
/** @internal */
export const schemaSearchParams = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return Effect.flatMap(parsedSearchParamsTag, parse);
};
/** @internal */
export const schemaBodyJson = (schema, options) => {
  const parse = IncomingMessage.schemaBodyJson(schema, options);
  return Effect.flatMap(serverRequestTag, parse);
};
const isMultipart = request => request.headers["content-type"]?.toLowerCase().includes("multipart/form-data");
/** @internal */
export const schemaBodyForm = (schema, options) => {
  const parseMultipart = Multipart.schemaPersisted(schema, options);
  const parseUrlParams = IncomingMessage.schemaBodyUrlParams(schema, options);
  return Effect.flatMap(serverRequestTag, request => {
    if (isMultipart(request)) {
      return Effect.flatMap(request.multipart, parseMultipart);
    }
    return parseUrlParams(request);
  });
};
/** @internal */
export const schemaBodyUrlParams = (schema, options) => {
  const parse = IncomingMessage.schemaBodyUrlParams(schema, options);
  return Effect.flatMap(serverRequestTag, parse);
};
/** @internal */
export const schemaBodyMultipart = (schema, options) => {
  const parse = Multipart.schemaPersisted(schema, options);
  return Effect.flatMap(multipartPersisted, parse);
};
/** @internal */
export const schemaBodyFormJson = (schema, options) => {
  const parseMultipart = Multipart.schemaJson(schema, options);
  const parseUrlParams = UrlParams.schemaJson(schema, options);
  return field => Effect.flatMap(serverRequestTag, request => {
    if (isMultipart(request)) {
      return Effect.flatMap(Effect.mapError(request.multipart, cause => new Error.RequestError({
        request,
        reason: "Decode",
        cause
      })), parseMultipart(field));
    }
    return Effect.flatMap(request.urlParamsBody, parseUrlParams(field));
  });
};
/** @internal */
export const fromWeb = request => new ServerRequestImpl(request, removeHost(request.url));
const removeHost = url => {
  if (url[0] === "/") {
    return url;
  }
  const index = url.indexOf("/", url.indexOf("//") + 2);
  return index === -1 ? "/" : url.slice(index);
};
class ServerRequestImpl extends Inspectable.Class {
  source;
  url;
  headersOverride;
  remoteAddressOverride;
  [TypeId];
  [IncomingMessage.TypeId];
  constructor(source, url, headersOverride, remoteAddressOverride) {
    super();
    this.source = source;
    this.url = url;
    this.headersOverride = headersOverride;
    this.remoteAddressOverride = remoteAddressOverride;
    this[TypeId] = TypeId;
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId;
  }
  toJSON() {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/HttpServerRequest",
      method: this.method,
      url: this.originalUrl
    });
  }
  modify(options) {
    return new ServerRequestImpl(this.source, options.url ?? this.url, options.headers ?? this.headersOverride, options.remoteAddress ?? this.remoteAddressOverride);
  }
  get method() {
    return this.source.method.toUpperCase();
  }
  get originalUrl() {
    return this.source.url;
  }
  get remoteAddress() {
    return this.remoteAddressOverride ? Option.some(this.remoteAddressOverride) : Option.none();
  }
  get headers() {
    this.headersOverride ??= Headers.fromInput(this.source.headers);
    return this.headersOverride;
  }
  cachedCookies;
  get cookies() {
    if (this.cachedCookies) {
      return this.cachedCookies;
    }
    return this.cachedCookies = Cookies.parseHeader(this.headers.cookie ?? "");
  }
  get stream() {
    return this.source.body ? Stream.fromReadableStream(() => this.source.body, cause => new Error.RequestError({
      request: this,
      reason: "Decode",
      cause
    })) : Stream.fail(new Error.RequestError({
      request: this,
      reason: "Decode",
      description: "can not create stream from empty body"
    }));
  }
  textEffect;
  get text() {
    if (this.textEffect) {
      return this.textEffect;
    }
    this.textEffect = Effect.runSync(Effect.cached(Effect.tryPromise({
      try: () => this.source.text(),
      catch: cause => new Error.RequestError({
        request: this,
        reason: "Decode",
        cause
      })
    })));
    return this.textEffect;
  }
  get json() {
    return Effect.tryMap(this.text, {
      try: _ => JSON.parse(_),
      catch: cause => new Error.RequestError({
        request: this,
        reason: "Decode",
        cause
      })
    });
  }
  get urlParamsBody() {
    return Effect.flatMap(this.text, _ => Effect.try({
      try: () => UrlParams.fromInput(new URLSearchParams(_)),
      catch: cause => new Error.RequestError({
        request: this,
        reason: "Decode",
        cause
      })
    }));
  }
  multipartEffect;
  get multipart() {
    if (this.multipartEffect) {
      return this.multipartEffect;
    }
    this.multipartEffect = Effect.runSync(Effect.cached(Multipart.toPersisted(this.multipartStream)));
    return this.multipartEffect;
  }
  get multipartStream() {
    return Stream.pipeThroughChannel(Stream.mapError(this.stream, cause => new Multipart.MultipartError({
      reason: "InternalError",
      cause
    })), Multipart.makeChannel(this.headers));
  }
  arrayBufferEffect;
  get arrayBuffer() {
    if (this.arrayBufferEffect) {
      return this.arrayBufferEffect;
    }
    this.arrayBufferEffect = Effect.runSync(Effect.cached(Effect.tryPromise({
      try: () => this.source.arrayBuffer(),
      catch: cause => new Error.RequestError({
        request: this,
        reason: "Decode",
        cause
      })
    })));
    return this.arrayBufferEffect;
  }
  get upgrade() {
    return Effect.fail(new Error.RequestError({
      request: this,
      reason: "Decode",
      description: "Not an upgradeable ServerRequest"
    }));
  }
}
/** @internal */
export const toURL = self => {
  const host = self.headers.host ?? "localhost";
  const protocol = self.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  try {
    return Option.some(new URL(self.url, `${protocol}://${host}`));
  } catch {
    return Option.none();
  }
};
//# sourceMappingURL=httpServerRequest.js.map