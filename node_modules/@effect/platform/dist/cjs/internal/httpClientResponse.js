"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stream = exports.schemaNoBody = exports.schemaJson = exports.matchStatus = exports.fromWeb = exports.filterStatusOk = exports.filterStatus = exports.TypeId = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var Cookies = _interopRequireWildcard(require("../Cookies.js"));
var Headers = _interopRequireWildcard(require("../Headers.js"));
var Error = _interopRequireWildcard(require("../HttpClientError.js"));
var IncomingMessage = _interopRequireWildcard(require("../HttpIncomingMessage.js"));
var UrlParams = _interopRequireWildcard(require("../UrlParams.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpClientResponse");
/** @internal */
const fromWeb = (request, source) => new ClientResponseImpl(request, source);
exports.fromWeb = fromWeb;
class ClientResponseImpl extends Inspectable.Class {
  request;
  source;
  [IncomingMessage.TypeId];
  [TypeId];
  constructor(request, source) {
    super();
    this.request = request;
    this.source = source;
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId;
    this[TypeId] = TypeId;
  }
  toJSON() {
    return IncomingMessage.inspect(this, {
      _id: "@effect/platform/HttpClientResponse",
      request: this.request.toJSON(),
      status: this.status
    });
  }
  get status() {
    return this.source.status;
  }
  get headers() {
    return Headers.fromInput(this.source.headers);
  }
  cachedCookies;
  get cookies() {
    if (this.cachedCookies) {
      return this.cachedCookies;
    }
    return this.cachedCookies = Cookies.fromSetCookie(this.source.headers.getSetCookie());
  }
  get remoteAddress() {
    return Option.none();
  }
  get stream() {
    return this.source.body ? Stream.fromReadableStream(() => this.source.body, cause => new Error.ResponseError({
      request: this.request,
      response: this,
      reason: "Decode",
      cause
    })) : Stream.fail(new Error.ResponseError({
      request: this.request,
      response: this,
      reason: "EmptyBody",
      description: "can not create stream from empty body"
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
      try: () => this.source.text(),
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
      try: () => this.source.formData(),
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
      try: () => this.source.arrayBuffer(),
      catch: cause => new Error.ResponseError({
        request: this.request,
        response: this,
        reason: "Decode",
        cause
      })
    }).pipe(Effect.cached, Effect.runSync);
  }
}
/** @internal */
const schemaJson = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return self => Effect.flatMap(self.json, body => parse({
    status: self.status,
    headers: self.headers,
    body
  }));
};
/** @internal */
exports.schemaJson = schemaJson;
const schemaNoBody = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return self => parse({
    status: self.status,
    headers: self.headers
  });
};
/** @internal */
exports.schemaNoBody = schemaNoBody;
const stream = effect => Stream.unwrap(Effect.map(effect, _ => _.stream));
/** @internal */
exports.stream = stream;
const matchStatus = exports.matchStatus = /*#__PURE__*/(0, _Function.dual)(2, (self, cases) => {
  const status = self.status;
  if (cases[status]) {
    return cases[status](self);
  } else if (status >= 200 && status < 300 && cases["2xx"]) {
    return cases["2xx"](self);
  } else if (status >= 300 && status < 400 && cases["3xx"]) {
    return cases["3xx"](self);
  } else if (status >= 400 && status < 500 && cases["4xx"]) {
    return cases["4xx"](self);
  } else if (status >= 500 && status < 600 && cases["5xx"]) {
    return cases["5xx"](self);
  }
  return cases.orElse(self);
});
/** @internal */
const filterStatus = exports.filterStatus = /*#__PURE__*/(0, _Function.dual)(2, (self, f) => Effect.suspend(() => f(self.status) ? Effect.succeed(self) : Effect.fail(new Error.ResponseError({
  response: self,
  request: self.request,
  reason: "StatusCode",
  description: "invalid status code"
}))));
/** @internal */
const filterStatusOk = self => self.status >= 200 && self.status < 300 ? Effect.succeed(self) : Effect.fail(new Error.ResponseError({
  response: self,
  request: self.request,
  reason: "StatusCode",
  description: "non 2xx status code"
}));
exports.filterStatusOk = filterStatusOk;
//# sourceMappingURL=httpClientResponse.js.map