"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.xForwardedHeaders = exports.withTracerDisabledWhenEffect = exports.withTracerDisabledWhen = exports.withTracerDisabledForUrls = exports.withSpanNameGenerator = exports.withLoggerDisabled = exports.searchParamsParser = exports.make = exports.loggerDisabled = exports.logger = exports.currentTracerDisabledWhen = exports.cors = exports.SpanNameGenerator = void 0;
var internal = _interopRequireWildcard(require("./internal/httpMiddleware.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = internal.make;
/**
 * @since 1.0.0
 * @category constructors
 */
const logger = exports.logger = internal.logger;
/**
 * @since 1.0.0
 * @category fiber refs
 */
const loggerDisabled = exports.loggerDisabled = internal.loggerDisabled;
/**
 * @since 1.0.0
 * @category fiber refs
 */
const withLoggerDisabled = exports.withLoggerDisabled = internal.withLoggerDisabled;
/**
 * @since 1.0.0
 * @category fiber refs
 */
const currentTracerDisabledWhen = exports.currentTracerDisabledWhen = internal.currentTracerDisabledWhen;
/**
 * @since 1.0.0
 * @category fiber refs
 */
const withTracerDisabledWhen = exports.withTracerDisabledWhen = internal.withTracerDisabledWhen;
/**
 * @since 1.0.0
 * @category fiber refs
 */
const withTracerDisabledWhenEffect = exports.withTracerDisabledWhenEffect = internal.withTracerDisabledWhenEffect;
/**
 * @since 1.0.0
 * @category fiber refs
 */
const withTracerDisabledForUrls = exports.withTracerDisabledForUrls = internal.withTracerDisabledForUrls;
/**
 * @since 1.0.0
 * @category constructors
 */
const xForwardedHeaders = exports.xForwardedHeaders = internal.xForwardedHeaders;
/**
 * @since 1.0.0
 * @category constructors
 */
const searchParamsParser = exports.searchParamsParser = internal.searchParamsParser;
/**
 * @since 1.0.0
 * @category constructors
 */
const cors = exports.cors = internal.cors;
/**
 * @since 1.0.0
 * @category Tracing
 */
const SpanNameGenerator = exports.SpanNameGenerator = internal.SpanNameGenerator;
/**
 * Customizes the span name for the http app.
 *
 * ```ts
 * import {
 *   HttpMiddleware,
 *   HttpRouter,
 *   HttpServer,
 *   HttpServerResponse
 * } from "@effect/platform"
 * import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
 * import { Layer } from "effect"
 * import { createServer } from "http"
 *
 * HttpRouter.empty.pipe(
 *   HttpRouter.get("/", HttpServerResponse.empty()),
 *   HttpServer.serve(),
 *   // Customize the span names for this HttpApp
 *   HttpMiddleware.withSpanNameGenerator((request) => `GET ${request.url}`),
 *   Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
 *   Layer.launch,
 *   NodeRuntime.runMain
 * )
 * ```
 *
 * @since 1.0.0
 * @category Tracing
 */
const withSpanNameGenerator = exports.withSpanNameGenerator = internal.withSpanNameGenerator;
//# sourceMappingURL=HttpMiddleware.js.map