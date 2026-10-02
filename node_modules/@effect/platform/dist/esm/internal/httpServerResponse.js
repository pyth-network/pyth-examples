import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Effectable from "effect/Effectable";
import { dual } from "effect/Function";
import * as Inspectable from "effect/Inspectable";
import * as Runtime from "effect/Runtime";
import * as Stream from "effect/Stream";
import * as Cookies from "../Cookies.js";
import * as Headers from "../Headers.js";
import * as Template from "../Template.js";
import * as UrlParams from "../UrlParams.js";
import * as internalBody from "./httpBody.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpServerResponse");
const respondableSymbol = /*#__PURE__*/Symbol.for("@effect/platform/HttpServerRespondable");
class ServerResponseImpl extends Effectable.StructuralClass {
  status;
  statusText;
  cookies;
  body;
  [TypeId];
  headers;
  constructor(status, statusText, headers, cookies, body) {
    super();
    this.status = status;
    this.statusText = statusText;
    this.cookies = cookies;
    this.body = body;
    this[TypeId] = TypeId;
    if (body.contentType || body.contentLength) {
      const newHeaders = {
        ...headers
      };
      if (body.contentType) {
        newHeaders["content-type"] = body.contentType;
      }
      if (body.contentLength) {
        newHeaders["content-length"] = body.contentLength.toString();
      }
      this.headers = newHeaders;
    } else {
      this.headers = headers;
    }
  }
  commit() {
    return Effect.succeed(this);
  }
  [respondableSymbol]() {
    return Effect.succeed(this);
  }
  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON();
  }
  toString() {
    return Inspectable.format(this);
  }
  toJSON() {
    return {
      _id: "@effect/platform/HttpServerResponse",
      status: this.status,
      statusText: this.statusText,
      headers: Inspectable.redact(this.headers),
      cookies: this.cookies.toJSON(),
      body: this.body.toJSON()
    };
  }
}
/** @internal */
export const isServerResponse = u => typeof u === "object" && u !== null && TypeId in u;
/** @internal */
export const empty = options => new ServerResponseImpl(options?.status ?? 204, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.empty);
/** @internal */
export const redirect = (location, options) => {
  const headers = Headers.unsafeFromRecord({
    location: location.toString()
  });
  return new ServerResponseImpl(options?.status ?? 302, options?.statusText, options?.headers ? Headers.merge(headers, Headers.fromInput(options.headers)) : headers, options?.cookies ?? Cookies.empty, internalBody.empty);
};
/** @internal */
export const uint8Array = (body, options) => {
  const headers = options?.headers ? Headers.fromInput(options.headers) : Headers.empty;
  return new ServerResponseImpl(options?.status ?? 200, options?.statusText, headers, options?.cookies ?? Cookies.empty, internalBody.uint8Array(body, getContentType(options, headers)));
};
/** @internal */
export const text = (body, options) => {
  const headers = options?.headers ? Headers.fromInput(options.headers) : Headers.empty;
  return new ServerResponseImpl(options?.status ?? 200, options?.statusText, headers, options?.cookies ?? Cookies.empty, internalBody.text(body, getContentType(options, headers)));
};
/** @internal */
export const html = (strings, ...args) => {
  if (typeof strings === "string") {
    return text(strings, {
      contentType: "text/html"
    });
  }
  return Effect.map(Template.make(strings, ...args), _ => text(_, {
    contentType: "text/html"
  }));
};
/** @internal */
export const htmlStream = (strings, ...args) => Effect.map(Effect.context(), context => stream(Stream.provideContext(Stream.encodeText(Template.stream(strings, ...args)), context), {
  contentType: "text/html"
}));
/** @internal */
export const json = (body, options) => Effect.map(internalBody.json(body), body => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, body));
/** @internal */
export const unsafeJson = (body, options) => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.unsafeJson(body));
/** @internal */
export const schemaJson = (schema, options) => {
  const encode = internalBody.jsonSchema(schema, options);
  return (body, options) => Effect.map(encode(body), body => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, body));
};
const httpPlatform = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpPlatform");
/** @internal */
export const file = (path, options) => Effect.flatMap(httpPlatform, platform => platform.fileResponse(path, options));
/** @internal */
export const fileWeb = (file, options) => Effect.flatMap(httpPlatform, platform => platform.fileWebResponse(file, options));
/** @internal */
export const urlParams = (body, options) => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.text(UrlParams.toString(UrlParams.fromInput(body)), "application/x-www-form-urlencoded"));
/** @internal */
export const raw = (body, options) => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.raw(body, {
  contentType: options?.contentType,
  contentLength: options?.contentLength
}));
/** @internal */
export const formData = (body, options) => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.formData(body));
/** @internal */
export const stream = (body, options) => {
  const headers = options?.headers ? Headers.fromInput(options.headers) : Headers.empty;
  return new ServerResponseImpl(options?.status ?? 200, options?.statusText, headers, options?.cookies ?? Cookies.empty, internalBody.stream(body, getContentType(options, headers), options?.contentLength));
};
/** @internal */
export const getContentType = (options, headers) => {
  if (options?.contentType) {
    return options.contentType;
  } else if (options?.headers) {
    return headers["content-type"];
  } else {
    return;
  }
};
/** @internal */
export const setHeader = /*#__PURE__*/dual(3, (self, key, value) => new ServerResponseImpl(self.status, self.statusText, Headers.set(self.headers, key, value), self.cookies, self.body));
/** @internal */
export const replaceCookies = /*#__PURE__*/dual(2, (self, cookies) => new ServerResponseImpl(self.status, self.statusText, self.headers, cookies, self.body));
/** @internal */
export const setCookie = /*#__PURE__*/dual(args => isServerResponse(args[0]), (self, name, value, options) => Effect.map(Cookies.set(self.cookies, name, value, options), cookies => new ServerResponseImpl(self.status, self.statusText, self.headers, cookies, self.body)));
/** @internal */
export const unsafeSetCookie = /*#__PURE__*/dual(args => isServerResponse(args[0]), (self, name, value, options) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.unsafeSet(self.cookies, name, value, options), self.body));
/** @internal */
export const updateCookies = /*#__PURE__*/dual(2, (self, f) => new ServerResponseImpl(self.status, self.statusText, self.headers, f(self.cookies), self.body));
/** @internal */
export const setCookies = /*#__PURE__*/dual(2, (self, cookies) => Effect.map(Cookies.setAll(self.cookies, cookies), cookies => new ServerResponseImpl(self.status, self.statusText, self.headers, cookies, self.body)));
/** @internal */
export const mergeCookies = /*#__PURE__*/dual(2, (self, cookies) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.merge(self.cookies, cookies), self.body));
/** @internal */
export const unsafeSetCookies = /*#__PURE__*/dual(2, (self, cookies) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.unsafeSetAll(self.cookies, cookies), self.body));
/** @internal */
export const removeCookie = /*#__PURE__*/dual(2, (self, name) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.remove(self.cookies, name), self.body));
/** @internal */
export const expireCookie = /*#__PURE__*/dual(3, (self, name, options) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.unsafeSet(self.cookies, name, "", {
  ...(options ?? {}),
  maxAge: 0
}), self.body));
/** @internal */
export const setHeaders = /*#__PURE__*/dual(2, (self, input) => new ServerResponseImpl(self.status, self.statusText, Headers.setAll(self.headers, input), self.cookies, self.body));
/** @internal */
export const setStatus = /*#__PURE__*/dual(args => isServerResponse(args[0]), (self, status, statusText) => new ServerResponseImpl(status, statusText, self.headers, self.cookies, self.body));
/** @internal */
export const setBody = /*#__PURE__*/dual(2, (self, body) => {
  let headers = self.headers;
  if (body._tag === "Empty") {
    headers = Headers.remove(Headers.remove(headers, "Content-Type"), "Content-length");
  }
  return new ServerResponseImpl(self.status, self.statusText, headers, self.cookies, body);
});
/** @internal */
export const toWeb = (response, options) => {
  const headers = new globalThis.Headers(response.headers);
  if (!Cookies.isEmpty(response.cookies)) {
    const toAdd = Cookies.toSetCookieHeaders(response.cookies);
    for (const header of toAdd) {
      headers.append("set-cookie", header);
    }
  }
  if (options?.withoutBody) {
    return new Response(undefined, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  const body = response.body;
  switch (body._tag) {
    case "Empty":
      {
        return new Response(undefined, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }
    case "Uint8Array":
    case "Raw":
      {
        if (body.body instanceof Response) {
          for (const [key, value] of headers) {
            body.body.headers.set(key, value);
          }
          return body.body;
        }
        return new Response(body.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }
    case "FormData":
      {
        return new Response(body.formData, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }
    case "Stream":
      {
        return new Response(Stream.toReadableStreamRuntime(body.stream, options?.runtime ?? Runtime.defaultRuntime), {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }
  }
};
//# sourceMappingURL=httpServerResponse.js.map