"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.urlParams = exports.updateCookies = exports.unsafeSetCookies = exports.unsafeSetCookie = exports.unsafeJson = exports.uint8Array = exports.toWeb = exports.text = exports.stream = exports.setStatus = exports.setHeaders = exports.setHeader = exports.setCookies = exports.setCookie = exports.setBody = exports.schemaJson = exports.replaceCookies = exports.removeCookie = exports.redirect = exports.raw = exports.mergeCookies = exports.json = exports.isServerResponse = exports.htmlStream = exports.html = exports.getContentType = exports.formData = exports.fileWeb = exports.file = exports.expireCookie = exports.empty = exports.TypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Effectable = _interopRequireWildcard(require("effect/Effectable"));
var _Function = require("effect/Function");
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Runtime = _interopRequireWildcard(require("effect/Runtime"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var Cookies = _interopRequireWildcard(require("../Cookies.js"));
var Headers = _interopRequireWildcard(require("../Headers.js"));
var Template = _interopRequireWildcard(require("../Template.js"));
var UrlParams = _interopRequireWildcard(require("../UrlParams.js"));
var internalBody = _interopRequireWildcard(require("./httpBody.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpServerResponse");
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
const isServerResponse = u => typeof u === "object" && u !== null && TypeId in u;
/** @internal */
exports.isServerResponse = isServerResponse;
const empty = options => new ServerResponseImpl(options?.status ?? 204, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.empty);
/** @internal */
exports.empty = empty;
const redirect = (location, options) => {
  const headers = Headers.unsafeFromRecord({
    location: location.toString()
  });
  return new ServerResponseImpl(options?.status ?? 302, options?.statusText, options?.headers ? Headers.merge(headers, Headers.fromInput(options.headers)) : headers, options?.cookies ?? Cookies.empty, internalBody.empty);
};
/** @internal */
exports.redirect = redirect;
const uint8Array = (body, options) => {
  const headers = options?.headers ? Headers.fromInput(options.headers) : Headers.empty;
  return new ServerResponseImpl(options?.status ?? 200, options?.statusText, headers, options?.cookies ?? Cookies.empty, internalBody.uint8Array(body, getContentType(options, headers)));
};
/** @internal */
exports.uint8Array = uint8Array;
const text = (body, options) => {
  const headers = options?.headers ? Headers.fromInput(options.headers) : Headers.empty;
  return new ServerResponseImpl(options?.status ?? 200, options?.statusText, headers, options?.cookies ?? Cookies.empty, internalBody.text(body, getContentType(options, headers)));
};
/** @internal */
exports.text = text;
const html = (strings, ...args) => {
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
exports.html = html;
const htmlStream = (strings, ...args) => Effect.map(Effect.context(), context => stream(Stream.provideContext(Stream.encodeText(Template.stream(strings, ...args)), context), {
  contentType: "text/html"
}));
/** @internal */
exports.htmlStream = htmlStream;
const json = (body, options) => Effect.map(internalBody.json(body), body => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, body));
/** @internal */
exports.json = json;
const unsafeJson = (body, options) => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.unsafeJson(body));
/** @internal */
exports.unsafeJson = unsafeJson;
const schemaJson = (schema, options) => {
  const encode = internalBody.jsonSchema(schema, options);
  return (body, options) => Effect.map(encode(body), body => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, body));
};
exports.schemaJson = schemaJson;
const httpPlatform = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpPlatform");
/** @internal */
const file = (path, options) => Effect.flatMap(httpPlatform, platform => platform.fileResponse(path, options));
/** @internal */
exports.file = file;
const fileWeb = (file, options) => Effect.flatMap(httpPlatform, platform => platform.fileWebResponse(file, options));
/** @internal */
exports.fileWeb = fileWeb;
const urlParams = (body, options) => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.text(UrlParams.toString(UrlParams.fromInput(body)), "application/x-www-form-urlencoded"));
/** @internal */
exports.urlParams = urlParams;
const raw = (body, options) => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.raw(body, {
  contentType: options?.contentType,
  contentLength: options?.contentLength
}));
/** @internal */
exports.raw = raw;
const formData = (body, options) => new ServerResponseImpl(options?.status ?? 200, options?.statusText, options?.headers ? Headers.fromInput(options.headers) : Headers.empty, options?.cookies ?? Cookies.empty, internalBody.formData(body));
/** @internal */
exports.formData = formData;
const stream = (body, options) => {
  const headers = options?.headers ? Headers.fromInput(options.headers) : Headers.empty;
  return new ServerResponseImpl(options?.status ?? 200, options?.statusText, headers, options?.cookies ?? Cookies.empty, internalBody.stream(body, getContentType(options, headers), options?.contentLength));
};
/** @internal */
exports.stream = stream;
const getContentType = (options, headers) => {
  if (options?.contentType) {
    return options.contentType;
  } else if (options?.headers) {
    return headers["content-type"];
  } else {
    return;
  }
};
/** @internal */
exports.getContentType = getContentType;
const setHeader = exports.setHeader = /*#__PURE__*/(0, _Function.dual)(3, (self, key, value) => new ServerResponseImpl(self.status, self.statusText, Headers.set(self.headers, key, value), self.cookies, self.body));
/** @internal */
const replaceCookies = exports.replaceCookies = /*#__PURE__*/(0, _Function.dual)(2, (self, cookies) => new ServerResponseImpl(self.status, self.statusText, self.headers, cookies, self.body));
/** @internal */
const setCookie = exports.setCookie = /*#__PURE__*/(0, _Function.dual)(args => isServerResponse(args[0]), (self, name, value, options) => Effect.map(Cookies.set(self.cookies, name, value, options), cookies => new ServerResponseImpl(self.status, self.statusText, self.headers, cookies, self.body)));
/** @internal */
const unsafeSetCookie = exports.unsafeSetCookie = /*#__PURE__*/(0, _Function.dual)(args => isServerResponse(args[0]), (self, name, value, options) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.unsafeSet(self.cookies, name, value, options), self.body));
/** @internal */
const updateCookies = exports.updateCookies = /*#__PURE__*/(0, _Function.dual)(2, (self, f) => new ServerResponseImpl(self.status, self.statusText, self.headers, f(self.cookies), self.body));
/** @internal */
const setCookies = exports.setCookies = /*#__PURE__*/(0, _Function.dual)(2, (self, cookies) => Effect.map(Cookies.setAll(self.cookies, cookies), cookies => new ServerResponseImpl(self.status, self.statusText, self.headers, cookies, self.body)));
/** @internal */
const mergeCookies = exports.mergeCookies = /*#__PURE__*/(0, _Function.dual)(2, (self, cookies) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.merge(self.cookies, cookies), self.body));
/** @internal */
const unsafeSetCookies = exports.unsafeSetCookies = /*#__PURE__*/(0, _Function.dual)(2, (self, cookies) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.unsafeSetAll(self.cookies, cookies), self.body));
/** @internal */
const removeCookie = exports.removeCookie = /*#__PURE__*/(0, _Function.dual)(2, (self, name) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.remove(self.cookies, name), self.body));
/** @internal */
const expireCookie = exports.expireCookie = /*#__PURE__*/(0, _Function.dual)(3, (self, name, options) => new ServerResponseImpl(self.status, self.statusText, self.headers, Cookies.unsafeSet(self.cookies, name, "", {
  ...(options ?? {}),
  maxAge: 0
}), self.body));
/** @internal */
const setHeaders = exports.setHeaders = /*#__PURE__*/(0, _Function.dual)(2, (self, input) => new ServerResponseImpl(self.status, self.statusText, Headers.setAll(self.headers, input), self.cookies, self.body));
/** @internal */
const setStatus = exports.setStatus = /*#__PURE__*/(0, _Function.dual)(args => isServerResponse(args[0]), (self, status, statusText) => new ServerResponseImpl(status, statusText, self.headers, self.cookies, self.body));
/** @internal */
const setBody = exports.setBody = /*#__PURE__*/(0, _Function.dual)(2, (self, body) => {
  let headers = self.headers;
  if (body._tag === "Empty") {
    headers = Headers.remove(Headers.remove(headers, "Content-Type"), "Content-length");
  }
  return new ServerResponseImpl(self.status, self.statusText, headers, self.cookies, body);
});
/** @internal */
const toWeb = (response, options) => {
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
exports.toWeb = toWeb;
//# sourceMappingURL=httpServerResponse.js.map