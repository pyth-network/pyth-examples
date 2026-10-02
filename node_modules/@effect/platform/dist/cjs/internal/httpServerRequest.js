"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.upgradeChannel = exports.upgrade = exports.toURL = exports.serverRequestTag = exports.searchParamsFromURL = exports.schemaSearchParams = exports.schemaHeaders = exports.schemaCookies = exports.schemaBodyUrlParams = exports.schemaBodyMultipart = exports.schemaBodyJson = exports.schemaBodyFormJson = exports.schemaBodyForm = exports.parsedSearchParamsTag = exports.multipartPersisted = exports.fromWeb = exports.TypeId = void 0;
var Channel = _interopRequireWildcard(require("effect/Channel"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var Cookies = _interopRequireWildcard(require("../Cookies.js"));
var Headers = _interopRequireWildcard(require("../Headers.js"));
var IncomingMessage = _interopRequireWildcard(require("../HttpIncomingMessage.js"));
var Error = _interopRequireWildcard(require("../HttpServerError.js"));
var Multipart = _interopRequireWildcard(require("../Multipart.js"));
var Socket = _interopRequireWildcard(require("../Socket.js"));
var UrlParams = _interopRequireWildcard(require("../UrlParams.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpServerRequest");
/** @internal */
const serverRequestTag = exports.serverRequestTag = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpServerRequest");
/** @internal */
const parsedSearchParamsTag = exports.parsedSearchParamsTag = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpServerRequest/ParsedSearchParams");
/** @internal */
const upgrade = exports.upgrade = /*#__PURE__*/Effect.flatMap(serverRequestTag, request => request.upgrade);
/** @internal */
const upgradeChannel = () => Channel.unwrap(Effect.map(upgrade, Socket.toChannelWith()));
/** @internal */
exports.upgradeChannel = upgradeChannel;
const multipartPersisted = exports.multipartPersisted = /*#__PURE__*/Effect.flatMap(serverRequestTag, request => request.multipart);
/** @internal */
const searchParamsFromURL = url => {
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
exports.searchParamsFromURL = searchParamsFromURL;
const schemaCookies = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return Effect.flatMap(serverRequestTag, req => parse(req.cookies));
};
/** @internal */
exports.schemaCookies = schemaCookies;
const schemaHeaders = (schema, options) => {
  const parse = IncomingMessage.schemaHeaders(schema, options);
  return Effect.flatMap(serverRequestTag, parse);
};
/** @internal */
exports.schemaHeaders = schemaHeaders;
const schemaSearchParams = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return Effect.flatMap(parsedSearchParamsTag, parse);
};
/** @internal */
exports.schemaSearchParams = schemaSearchParams;
const schemaBodyJson = (schema, options) => {
  const parse = IncomingMessage.schemaBodyJson(schema, options);
  return Effect.flatMap(serverRequestTag, parse);
};
exports.schemaBodyJson = schemaBodyJson;
const isMultipart = request => request.headers["content-type"]?.toLowerCase().includes("multipart/form-data");
/** @internal */
const schemaBodyForm = (schema, options) => {
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
exports.schemaBodyForm = schemaBodyForm;
const schemaBodyUrlParams = (schema, options) => {
  const parse = IncomingMessage.schemaBodyUrlParams(schema, options);
  return Effect.flatMap(serverRequestTag, parse);
};
/** @internal */
exports.schemaBodyUrlParams = schemaBodyUrlParams;
const schemaBodyMultipart = (schema, options) => {
  const parse = Multipart.schemaPersisted(schema, options);
  return Effect.flatMap(multipartPersisted, parse);
};
/** @internal */
exports.schemaBodyMultipart = schemaBodyMultipart;
const schemaBodyFormJson = (schema, options) => {
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
exports.schemaBodyFormJson = schemaBodyFormJson;
const fromWeb = request => new ServerRequestImpl(request, removeHost(request.url));
exports.fromWeb = fromWeb;
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
const toURL = self => {
  const host = self.headers.host ?? "localhost";
  const protocol = self.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  try {
    return Option.some(new URL(self.url, `${protocol}://${host}`));
  } catch {
    return Option.none();
  }
};
exports.toURL = toURL;
//# sourceMappingURL=httpServerRequest.js.map