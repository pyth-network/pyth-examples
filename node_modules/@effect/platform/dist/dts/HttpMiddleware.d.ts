/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as FiberRef from "effect/FiberRef";
import type * as Layer from "effect/Layer";
import type * as Predicate from "effect/Predicate";
import type * as App from "./HttpApp.js";
import type * as ServerRequest from "./HttpServerRequest.js";
/**
 * @since 1.0.0
 * @category models
 */
export interface HttpMiddleware {
    <E, R>(self: App.Default<E, R>): App.Default<any, any>;
}
/**
 * @since 1.0.0
 */
export declare namespace HttpMiddleware {
    /**
     * @since 1.0.0
     */
    interface Applied<A extends App.Default<any, any>, E, R> {
        (self: App.Default<E, R>): A;
    }
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <M extends HttpMiddleware>(middleware: M) => M;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const logger: <E, R>(httpApp: App.Default<E, R>) => App.Default<E, R>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const loggerDisabled: FiberRef.FiberRef<boolean>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withLoggerDisabled: <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const currentTracerDisabledWhen: FiberRef.FiberRef<Predicate.Predicate<ServerRequest.HttpServerRequest>>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withTracerDisabledWhen: {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    (predicate: Predicate.Predicate<ServerRequest.HttpServerRequest>): <A, E, R>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>;
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    <A, E, R>(layer: Layer.Layer<A, E, R>, predicate: Predicate.Predicate<ServerRequest.HttpServerRequest>): Layer.Layer<A, E, R>;
};
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withTracerDisabledWhenEffect: {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    (predicate: Predicate.Predicate<ServerRequest.HttpServerRequest>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, predicate: Predicate.Predicate<ServerRequest.HttpServerRequest>): Effect.Effect<A, E, R>;
};
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withTracerDisabledForUrls: {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    (urls: ReadonlyArray<string>): <A, E, R>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>;
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    <A, E, R>(layer: Layer.Layer<A, E, R>, urls: ReadonlyArray<string>): Layer.Layer<A, E, R>;
};
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const xForwardedHeaders: <E, R>(httpApp: App.Default<E, R>) => App.Default<E, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const searchParamsParser: <E, R>(httpApp: App.Default<E, R>) => App.Default<E, Exclude<R, ServerRequest.ParsedSearchParams>>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const cors: (options?: {
    readonly allowedOrigins?: ReadonlyArray<string> | undefined;
    readonly allowedMethods?: ReadonlyArray<string> | undefined;
    readonly allowedHeaders?: ReadonlyArray<string> | undefined;
    readonly exposedHeaders?: ReadonlyArray<string> | undefined;
    readonly maxAge?: number | undefined;
    readonly credentials?: boolean | undefined;
} | undefined) => <E, R>(httpApp: App.Default<E, R>) => App.Default<E, R>;
/**
 * @since 1.0.0
 * @category Tracing
 */
export interface SpanNameGenerator {
    readonly _: unique symbol;
}
/**
 * @since 1.0.0
 * @category Tracing
 */
export declare const SpanNameGenerator: Context.Reference<SpanNameGenerator, (request: ServerRequest.HttpServerRequest) => string>;
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
export declare const withSpanNameGenerator: {
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
    (f: (request: ServerRequest.HttpServerRequest) => string): <A, E, R>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>;
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
    <A, E, R>(layer: Layer.Layer<A, E, R>, f: (request: ServerRequest.HttpServerRequest) => string): Layer.Layer<A, E, R>;
};
//# sourceMappingURL=HttpMiddleware.d.ts.map