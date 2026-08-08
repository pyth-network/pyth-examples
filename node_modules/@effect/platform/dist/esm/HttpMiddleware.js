import * as internal from "./internal/httpMiddleware.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make;
/**
 * @since 1.0.0
 * @category constructors
 */
export const logger = internal.logger;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const loggerDisabled = internal.loggerDisabled;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withLoggerDisabled = internal.withLoggerDisabled;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentTracerDisabledWhen = internal.currentTracerDisabledWhen;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withTracerDisabledWhen = internal.withTracerDisabledWhen;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withTracerDisabledWhenEffect = internal.withTracerDisabledWhenEffect;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withTracerDisabledForUrls = internal.withTracerDisabledForUrls;
/**
 * @since 1.0.0
 * @category constructors
 */
export const xForwardedHeaders = internal.xForwardedHeaders;
/**
 * @since 1.0.0
 * @category constructors
 */
export const searchParamsParser = internal.searchParamsParser;
/**
 * @since 1.0.0
 * @category constructors
 */
export const cors = internal.cors;
/**
 * @since 1.0.0
 * @category Tracing
 */
export const SpanNameGenerator = internal.SpanNameGenerator;
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
export const withSpanNameGenerator = internal.withSpanNameGenerator;
//# sourceMappingURL=HttpMiddleware.js.map