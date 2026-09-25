import * as Effect from "effect/Effect";
import { dual } from "effect/Function";
import * as Inspectable from "effect/Inspectable";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Cookies from "../Cookies.js";
import * as Headers from "../Headers.js";
import * as Error from "../HttpClientError.js";
import * as IncomingMessage from "../HttpIncomingMessage.js";
import * as UrlParams from "../UrlParams.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpClientResponse");
/** @internal */
export const fromWeb = (request, source) => new ClientResponseImpl(request, source);
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
export const schemaJson = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return self => Effect.flatMap(self.json, body => parse({
    status: self.status,
    headers: self.headers,
    body
  }));
};
/** @internal */
export const schemaNoBody = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return self => parse({
    status: self.status,
    headers: self.headers
  });
};
/** @internal */
export const stream = effect => Stream.unwrap(Effect.map(effect, _ => _.stream));
/** @internal */
export const matchStatus = /*#__PURE__*/dual(2, (self, cases) => {
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
export const filterStatus = /*#__PURE__*/dual(2, (self, f) => Effect.suspend(() => f(self.status) ? Effect.succeed(self) : Effect.fail(new Error.ResponseError({
  response: self,
  request: self.request,
  reason: "StatusCode",
  description: "invalid status code"
}))));
/** @internal */
export const filterStatusOk = self => self.status >= 200 && self.status < 300 ? Effect.succeed(self) : Effect.fail(new Error.ResponseError({
  response: self,
  request: self.request,
  reason: "StatusCode",
  description: "non 2xx status code"
}));
//# sourceMappingURL=httpClientResponse.js.map