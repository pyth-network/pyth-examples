"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.xForwardedHeaders = exports.withTracerDisabledWhenEffect = exports.withTracerDisabledWhen = exports.withTracerDisabledForUrls = exports.withSpanNameGenerator = exports.withLoggerDisabled = exports.tracer = exports.searchParamsParser = exports.make = exports.loggerDisabled = exports.logger = exports.currentTracerDisabledWhen = exports.cors = exports.SpanNameGenerator = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var _Function = require("effect/Function");
var _GlobalValue = require("effect/GlobalValue");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Headers = _interopRequireWildcard(require("../Headers.js"));
var ServerError = _interopRequireWildcard(require("../HttpServerError.js"));
var ServerRequest = _interopRequireWildcard(require("../HttpServerRequest.js"));
var ServerResponse = _interopRequireWildcard(require("../HttpServerResponse.js"));
var TraceContext = _interopRequireWildcard(require("../HttpTraceContext.js"));
var internalHttpApp = _interopRequireWildcard(require("./httpApp.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const make = middleware => middleware;
/** @internal */
exports.make = make;
const loggerDisabled = exports.loggerDisabled = /*#__PURE__*/(0, _GlobalValue.globalValue)(/*#__PURE__*/Symbol.for("@effect/platform/HttpMiddleware/loggerDisabled"), () => FiberRef.unsafeMake(false));
/** @internal */
const withLoggerDisabled = self => Effect.zipRight(FiberRef.set(loggerDisabled, true), self);
/** @internal */
exports.withLoggerDisabled = withLoggerDisabled;
const currentTracerDisabledWhen = exports.currentTracerDisabledWhen = /*#__PURE__*/(0, _GlobalValue.globalValue)(/*#__PURE__*/Symbol.for("@effect/platform/HttpMiddleware/tracerDisabledWhen"), () => FiberRef.unsafeMake(_Function.constFalse));
/** @internal */
const withTracerDisabledWhen = exports.withTracerDisabledWhen = /*#__PURE__*/(0, _Function.dual)(2, (self, pred) => Layer.locally(self, currentTracerDisabledWhen, pred));
/** @internal */
const withTracerDisabledWhenEffect = exports.withTracerDisabledWhenEffect = /*#__PURE__*/(0, _Function.dual)(2, (self, pred) => Effect.locally(self, currentTracerDisabledWhen, pred));
/** @internal */
const withTracerDisabledForUrls = exports.withTracerDisabledForUrls = /*#__PURE__*/(0, _Function.dual)(2, (self, urls) => Layer.locally(self, currentTracerDisabledWhen, req => urls.includes(req.url)));
/** @internal */
const SpanNameGenerator = exports.SpanNameGenerator = /*#__PURE__*/Context.Reference()("@effect/platform/HttpMiddleware/SpanNameGenerator", {
  defaultValue: () => request => `http.server ${request.method}`
});
/** @internal */
const withSpanNameGenerator = exports.withSpanNameGenerator = /*#__PURE__*/(0, _Function.dual)(2, (self, f) => Layer.provide(self, Layer.succeed(SpanNameGenerator, f)));
/** @internal */
const logger = exports.logger = /*#__PURE__*/make(httpApp => {
  let counter = 0;
  return Effect.withFiberRuntime(fiber => {
    const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest);
    return Effect.withLogSpan(Effect.flatMap(Effect.exit(httpApp), exit => {
      if (fiber.getFiberRef(loggerDisabled)) {
        return exit;
      } else if (exit._tag === "Failure") {
        const [response, cause] = ServerError.causeResponseStripped(exit.cause);
        return Effect.zipRight(Effect.annotateLogs(Effect.log(cause._tag === "Some" ? cause.value : "Sent HTTP Response"), {
          "http.method": request.method,
          "http.url": request.url,
          "http.status": response.status
        }), exit);
      }
      return Effect.zipRight(Effect.annotateLogs(Effect.log("Sent HTTP response"), {
        "http.method": request.method,
        "http.url": request.url,
        "http.status": exit.value.status
      }), exit);
    }), `http.span.${++counter}`);
  });
});
/** @internal */
const tracer = exports.tracer = /*#__PURE__*/make(httpApp => Effect.withFiberRuntime(fiber => {
  const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest);
  const disabled = fiber.getFiberRef(currentTracerDisabledWhen)(request);
  if (disabled) {
    return httpApp;
  }
  const url = Option.getOrUndefined(ServerRequest.toURL(request));
  if (url !== undefined && (url.username !== "" || url.password !== "")) {
    url.username = "REDACTED";
    url.password = "REDACTED";
  }
  const redactedHeaderNames = fiber.getFiberRef(Headers.currentRedactedNames);
  const redactedHeaders = Headers.redact(request.headers, redactedHeaderNames);
  const nameGenerator = Context.get(fiber.currentContext, SpanNameGenerator);
  return Effect.useSpan(nameGenerator(request), {
    parent: Option.getOrUndefined(TraceContext.fromHeaders(request.headers)),
    kind: "server",
    captureStackTrace: false
  }, span => {
    span.attribute("http.request.method", request.method);
    if (url !== undefined) {
      span.attribute("url.full", url.toString());
      span.attribute("url.path", url.pathname);
      const query = url.search.slice(1);
      if (query !== "") {
        span.attribute("url.query", url.search.slice(1));
      }
      span.attribute("url.scheme", url.protocol.slice(0, -1));
    }
    if (request.headers["user-agent"] !== undefined) {
      span.attribute("user_agent.original", request.headers["user-agent"]);
    }
    for (const name in redactedHeaders) {
      span.attribute(`http.request.header.${name}`, String(redactedHeaders[name]));
    }
    if (request.remoteAddress._tag === "Some") {
      span.attribute("client.address", request.remoteAddress.value);
    }
    return Effect.flatMap(Effect.exit(Effect.withParentSpan(httpApp, span)), exit => {
      const response = ServerError.exitResponse(exit);
      span.attribute("http.response.status_code", response.status);
      const redactedHeaders = Headers.redact(response.headers, redactedHeaderNames);
      for (const name in redactedHeaders) {
        span.attribute(`http.response.header.${name}`, String(redactedHeaders[name]));
      }
      return exit;
    });
  });
}));
/** @internal */
const xForwardedHeaders = exports.xForwardedHeaders = /*#__PURE__*/make(httpApp => Effect.updateService(httpApp, ServerRequest.HttpServerRequest, request => request.headers["x-forwarded-host"] ? request.modify({
  headers: Headers.set(request.headers, "host", request.headers["x-forwarded-host"]),
  remoteAddress: request.headers["x-forwarded-for"]?.split(",")[0].trim()
}) : request));
/** @internal */
const searchParamsParser = httpApp => Effect.withFiberRuntime(fiber => {
  const context = fiber.currentContext;
  const request = Context.unsafeGet(context, ServerRequest.HttpServerRequest);
  const params = ServerRequest.searchParamsFromURL(new URL(request.originalUrl));
  return Effect.locally(httpApp, FiberRef.currentContext, Context.add(context, ServerRequest.ParsedSearchParams, params));
});
/** @internal */
exports.searchParamsParser = searchParamsParser;
const cors = options => {
  const opts = {
    allowedOrigins: ["*"],
    allowedMethods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: [],
    exposedHeaders: [],
    credentials: false,
    ...options
  };
  const isAllowedOrigin = origin => opts.allowedOrigins.includes(origin);
  const allowOrigin = originHeader => {
    if (opts.allowedOrigins.length === 0) {
      return {
        "access-control-allow-origin": "*"
      };
    }
    if (opts.allowedOrigins.length === 1) {
      return {
        "access-control-allow-origin": opts.allowedOrigins[0],
        vary: "Origin"
      };
    }
    if (isAllowedOrigin(originHeader)) {
      return {
        "access-control-allow-origin": originHeader,
        vary: "Origin"
      };
    }
    return undefined;
  };
  const allowMethods = opts.allowedMethods.length > 0 ? {
    "access-control-allow-methods": opts.allowedMethods.join(", ")
  } : undefined;
  const allowCredentials = opts.credentials ? {
    "access-control-allow-credentials": "true"
  } : undefined;
  const allowHeaders = accessControlRequestHeaders => {
    if (opts.allowedHeaders.length === 0 && accessControlRequestHeaders) {
      return {
        vary: "Access-Control-Request-Headers",
        "access-control-allow-headers": accessControlRequestHeaders
      };
    }
    if (opts.allowedHeaders) {
      return {
        "access-control-allow-headers": opts.allowedHeaders.join(",")
      };
    }
    return undefined;
  };
  const exposeHeaders = opts.exposedHeaders.length > 0 ? {
    "access-control-expose-headers": opts.exposedHeaders.join(",")
  } : undefined;
  const maxAge = opts.maxAge ? {
    "access-control-max-age": opts.maxAge.toString()
  } : undefined;
  const headersFromRequest = request => {
    const origin = request.headers["origin"];
    return Headers.unsafeFromRecord({
      ...allowOrigin(origin),
      ...allowCredentials,
      ...exposeHeaders
    });
  };
  const headersFromRequestOptions = request => {
    const origin = request.headers["origin"];
    const accessControlRequestHeaders = request.headers["access-control-request-headers"];
    return Headers.unsafeFromRecord({
      ...allowOrigin(origin),
      ...allowCredentials,
      ...exposeHeaders,
      ...allowMethods,
      ...allowHeaders(accessControlRequestHeaders),
      ...maxAge
    });
  };
  const preResponseHandler = (request, response) => Effect.succeed(ServerResponse.setHeaders(response, headersFromRequest(request)));
  return httpApp => Effect.withFiberRuntime(fiber => {
    const request = Context.unsafeGet(fiber.currentContext, ServerRequest.HttpServerRequest);
    if (request.method === "OPTIONS") {
      return Effect.succeed(ServerResponse.empty({
        status: 204,
        headers: headersFromRequestOptions(request)
      }));
    }
    return Effect.zipRight(internalHttpApp.appendPreResponseHandler(preResponseHandler), httpApp);
  });
};
exports.cors = cors;
//# sourceMappingURL=httpMiddleware.js.map