import * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { type Pipeable } from "effect/Pipeable";
import * as Redacted from "effect/Redacted";
import type { Scope } from "effect/Scope";
import type { Covariant, NoInfer } from "effect/Types";
import type { Cookie } from "./Cookies.js";
import * as HttpApi from "./HttpApi.js";
import type * as HttpApiEndpoint from "./HttpApiEndpoint.js";
import type * as HttpApiGroup from "./HttpApiGroup.js";
import * as HttpApiMiddleware from "./HttpApiMiddleware.js";
import type * as HttpApiSecurity from "./HttpApiSecurity.js";
import * as HttpApp from "./HttpApp.js";
import * as HttpMiddleware from "./HttpMiddleware.js";
import * as HttpRouter from "./HttpRouter.js";
import * as HttpServer from "./HttpServer.js";
import * as HttpServerRequest from "./HttpServerRequest.js";
import * as HttpServerResponse from "./HttpServerResponse.js";
import * as OpenApi from "./OpenApi.js";
declare const Router_base: HttpRouter.HttpRouter.TagClass<Router, "@effect/platform/HttpApiBuilder/Router", unknown, HttpRouter.HttpRouter.DefaultServices>;
/**
 * The router that the API endpoints are attached to.
 *
 * @since 1.0.0
 * @category router
 */
export declare class Router extends Router_base {
}
/**
 * Create a top-level `HttpApi` layer.
 *
 * @since 1.0.0
 * @category constructors
 */
export declare const api: <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(api: HttpApi.HttpApi<Id, Groups, E, R>) => Layer.Layer<HttpApi.Api, never, HttpApiGroup.HttpApiGroup.ToService<Id, Groups> | R | HttpApiGroup.HttpApiGroup.ErrorContext<Groups>>;
/**
 * Build an `HttpApp` from an `HttpApi` instance, and serve it using an
 * `HttpServer`.
 *
 * Optionally, you can provide a middleware function that will be applied to
 * the `HttpApp` before serving.
 *
 * @since 1.0.0
 * @category constructors
 */
export declare const serve: <R = never>(middleware?: (httpApp: HttpApp.Default) => HttpApp.Default<never, R>) => Layer.Layer<never, never, HttpServer.HttpServer | HttpRouter.HttpRouter.DefaultServices | Exclude<R, Scope | HttpServerRequest.HttpServerRequest> | HttpApi.Api>;
/**
 * Construct an `HttpApp` from an `HttpApi` instance.
 *
 * @since 1.0.0
 * @category constructors
 */
export declare const httpApp: Effect.Effect<HttpApp.Default<never, HttpRouter.HttpRouter.DefaultServices>, never, Router | HttpApi.Api | Middleware>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const buildMiddleware: <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, R>(api: HttpApi.HttpApi<Id, Groups, E, R>) => Effect.Effect<(effect: Effect.Effect<HttpServerResponse.HttpServerResponse, unknown>) => Effect.Effect<HttpServerResponse.HttpServerResponse, unknown, never>>;
/**
 * Construct an http web handler from an `HttpApi` instance.
 *
 * **Example**
 *
 * ```ts
 * import { HttpApi, HttpApiBuilder, HttpServer } from "@effect/platform"
 * import { Layer } from "effect"
 *
 * class MyApi extends HttpApi.make("api") {}
 *
 * const MyApiLive = HttpApiBuilder.api(MyApi)
 *
 * const { dispose, handler } = HttpApiBuilder.toWebHandler(
 *   Layer.mergeAll(
 *     MyApiLive,
 *     // you could also use NodeHttpServer.layerContext, depending on your
 *     // server's platform
 *     HttpServer.layerContext
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export declare const toWebHandler: <LA, LE>(layer: Layer.Layer<LA | HttpApi.Api | HttpRouter.HttpRouter.DefaultServices, LE>, options?: {
    readonly middleware?: (httpApp: HttpApp.Default) => HttpApp.Default<never, HttpApi.Api | Router | HttpRouter.HttpRouter.DefaultServices>;
    readonly memoMap?: Layer.MemoMap;
}) => {
    readonly handler: (request: Request, context?: Context.Context<never> | undefined) => Promise<Response>;
    readonly dispose: () => Promise<void>;
};
/**
 * @since 1.0.0
 * @category handlers
 */
export declare const HandlersTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category handlers
 */
export type HandlersTypeId = typeof HandlersTypeId;
/**
 * Represents a handled `HttpApi`.
 *
 * @since 1.0.0
 * @category handlers
 */
export interface Handlers<E, Provides, R, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.Any = never> extends Pipeable {
    readonly [HandlersTypeId]: {
        _Endpoints: Covariant<Endpoints>;
    };
    readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps;
    readonly handlers: Chunk.Chunk<Handlers.Item<E, R>>;
    /**
     * Add the implementation for an `HttpApiEndpoint` to a `Handlers` group.
     */
    handle<Name extends HttpApiEndpoint.HttpApiEndpoint.Name<Endpoints>, R1>(name: Name, handler: HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<Endpoints, Name, E, R1>, options?: {
        readonly uninterruptible?: boolean | undefined;
    } | undefined): Handlers<E, Provides, R | Exclude<HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<Endpoints, Name, R1 | HttpApiEndpoint.HttpApiEndpoint.ContextWithName<Endpoints, Name>>, Provides>, HttpApiEndpoint.HttpApiEndpoint.ExcludeName<Endpoints, Name>>;
    /**
     * Add the implementation for an `HttpApiEndpoint` to a `Handlers` group.
     * This version of the api allows you to return the full response object.
     */
    handleRaw<Name extends HttpApiEndpoint.HttpApiEndpoint.Name<Endpoints>, R1>(name: Name, handler: HttpApiEndpoint.HttpApiEndpoint.HandlerRawWithName<Endpoints, Name, E, R1>, options?: {
        readonly uninterruptible?: boolean | undefined;
    } | undefined): Handlers<E, Provides, R | Exclude<HttpApiEndpoint.HttpApiEndpoint.ExcludeProvided<Endpoints, Name, R1 | HttpApiEndpoint.HttpApiEndpoint.ContextWithName<Endpoints, Name>>, Provides>, HttpApiEndpoint.HttpApiEndpoint.ExcludeName<Endpoints, Name>>;
}
/**
 * @since 1.0.0
 * @category handlers
 */
export declare namespace Handlers {
    /**
     * @since 1.0.0
     * @category handlers
     */
    interface Any {
        readonly [HandlersTypeId]: any;
    }
    /**
     * @since 1.0.0
     * @category handlers
     */
    type Middleware<E, R, E1, R1> = (self: HttpRouter.Route.Middleware<E, R>) => HttpApp.Default<E1, R1>;
    /**
     * @since 1.0.0
     * @category handlers
     */
    type Item<E, R> = {
        readonly endpoint: HttpApiEndpoint.HttpApiEndpoint.Any;
        readonly handler: HttpApiEndpoint.HttpApiEndpoint.Handler<any, E, R>;
        readonly withFullRequest: boolean;
        readonly uninterruptible: boolean;
    };
    /**
     * @since 1.0.0
     * @category handlers
     */
    type FromGroup<ApiError, ApiR, Group extends HttpApiGroup.HttpApiGroup.Any> = Handlers<ApiError | HttpApiGroup.HttpApiGroup.Error<Group>, HttpApiMiddleware.HttpApiMiddleware.ExtractProvides<ApiR> | HttpApiGroup.HttpApiGroup.Provides<Group>, never, HttpApiGroup.HttpApiGroup.Endpoints<Group>>;
    /**
     * @since 1.0.0
     * @category handlers
     */
    type ValidateReturn<A> = A extends (Handlers<infer _E, infer _Provides, infer _R, infer _Endpoints> | Effect.Effect<Handlers<infer _E, infer _Provides, infer _R, infer _Endpoints>, infer _EX, infer _RX>) ? [_Endpoints] extends [never] ? A : `Endpoint not handled: ${HttpApiEndpoint.HttpApiEndpoint.Name<_Endpoints>}` : `Must return the implemented handlers`;
    /**
     * @since 1.0.0
     * @category handlers
     */
    type Error<A> = A extends Effect.Effect<Handlers<infer _E, infer _Provides, infer _R, infer _Endpoints>, infer _EX, infer _RX> ? _EX : never;
    /**
     * @since 1.0.0
     * @category handlers
     */
    type Context<A> = A extends Handlers<infer _E, infer _Provides, infer _R, infer _Endpoints> ? _R : A extends Effect.Effect<Handlers<infer _E, infer _Provides, infer _R, infer _Endpoints>, infer _EX, infer _RX> ? _R | _RX : never;
}
/**
 * Create a `Layer` that will implement all the endpoints in an `HttpApi`.
 *
 * An unimplemented `Handlers` instance is passed to the `build` function, which
 * you can use to add handlers to the group.
 *
 * You can implement endpoints using the `handlers.handle` api.
 *
 * @since 1.0.0
 * @category handlers
 */
export declare const group: <ApiId extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, ApiError, ApiR, const Name extends HttpApiGroup.HttpApiGroup.Name<Groups>, Return>(api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>, groupName: Name, build: (handlers: Handlers.FromGroup<ApiError, ApiR, HttpApiGroup.HttpApiGroup.WithName<Groups, Name>>) => Handlers.ValidateReturn<Return>) => Layer.Layer<HttpApiGroup.ApiGroup<ApiId, Name>, Handlers.Error<Return>, Exclude<Handlers.Context<Return> | HttpApiGroup.HttpApiGroup.MiddlewareWithName<Groups, Name>, Scope>>;
/**
 * Create a `Handler` for a single endpoint.
 *
 * @since 1.0.0
 * @category handlers
 */
export declare const handler: <ApiId extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, ApiError, ApiR, const GroupName extends Groups["identifier"], const Name extends HttpApiGroup.HttpApiGroup.EndpointsWithName<Groups, GroupName>["name"], R>(_api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>, _groupName: GroupName, _name: Name, f: HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<HttpApiGroup.HttpApiGroup.EndpointsWithName<Groups, GroupName>, Name, ApiError | HttpApiGroup.HttpApiGroup.ErrorWithName<Groups, GroupName>, R>) => HttpApiEndpoint.HttpApiEndpoint.HandlerWithName<HttpApiGroup.HttpApiGroup.EndpointsWithName<Groups, GroupName>, Name, ApiError | HttpApiGroup.HttpApiGroup.ErrorWithName<Groups, GroupName>, R>;
declare const Middleware_base: Context.TagClass<Middleware, "@effect/platform/HttpApiBuilder/Middleware", {
    readonly add: (middleware: HttpMiddleware.HttpMiddleware) => Effect.Effect<void>;
    readonly retrieve: Effect.Effect<HttpMiddleware.HttpMiddleware>;
}>;
/**
 * @since 1.0.0
 * @category middleware
 */
export declare class Middleware extends Middleware_base {
    /**
     * @since 1.0.0
     */
    static readonly layer: Layer.Layer<Middleware, never, never>;
}
/**
 * @since 1.0.0
 * @category global
 */
export type MiddlewareFn<Error, R = HttpRouter.HttpRouter.Provided> = (httpApp: HttpApp.Default) => HttpApp.Default<Error, R>;
/**
 * Create an `HttpApi` level middleware `Layer`.
 *
 * @since 1.0.0
 * @category middleware
 */
export declare const middleware: {
    /**
     * Create an `HttpApi` level middleware `Layer`.
     *
     * @since 1.0.0
     * @category middleware
     */
    <EX = never, RX = never>(middleware: MiddlewareFn<never> | Effect.Effect<MiddlewareFn<never>, EX, RX>, options?: {
        readonly withContext?: false | undefined;
    }): Layer.Layer<never, EX, Exclude<RX, Scope>>;
    /**
     * Create an `HttpApi` level middleware `Layer`.
     *
     * @since 1.0.0
     * @category middleware
     */
    <R, EX = never, RX = never>(middleware: MiddlewareFn<never, R> | Effect.Effect<MiddlewareFn<never, R>, EX, RX>, options: {
        readonly withContext: true;
    }): Layer.Layer<never, EX, Exclude<HttpRouter.HttpRouter.ExcludeProvided<R> | RX, Scope>>;
    /**
     * Create an `HttpApi` level middleware `Layer`.
     *
     * @since 1.0.0
     * @category middleware
     */
    <ApiId extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, EX = never, RX = never>(api: HttpApi.HttpApi<ApiId, Groups, Error, ErrorR>, middleware: MiddlewareFn<NoInfer<Error>> | Effect.Effect<MiddlewareFn<NoInfer<Error>>, EX, RX>, options?: {
        readonly withContext?: false | undefined;
    }): Layer.Layer<never, EX, Exclude<RX, Scope>>;
    /**
     * Create an `HttpApi` level middleware `Layer`.
     *
     * @since 1.0.0
     * @category middleware
     */
    <ApiId extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, R, EX = never, RX = never>(api: HttpApi.HttpApi<ApiId, Groups, Error, ErrorR>, middleware: MiddlewareFn<NoInfer<Error>, R> | Effect.Effect<MiddlewareFn<NoInfer<Error>, R>, EX, RX>, options: {
        readonly withContext: true;
    }): Layer.Layer<never, EX, Exclude<HttpRouter.HttpRouter.ExcludeProvided<R> | RX, Scope>>;
};
/**
 * A CORS middleware layer that can be provided to the `HttpApiBuilder.serve` layer.
 *
 * @since 1.0.0
 * @category middleware
 */
export declare const middlewareCors: (options?: {
    readonly allowedOrigins?: ReadonlyArray<string> | undefined;
    readonly allowedMethods?: ReadonlyArray<string> | undefined;
    readonly allowedHeaders?: ReadonlyArray<string> | undefined;
    readonly exposedHeaders?: ReadonlyArray<string> | undefined;
    readonly maxAge?: number | undefined;
    readonly credentials?: boolean | undefined;
} | undefined) => Layer.Layer<never>;
/**
 * A middleware that adds an openapi.json endpoint to the API.
 *
 * @since 1.0.0
 * @category middleware
 */
export declare const middlewareOpenApi: (options?: {
    readonly path?: HttpApiEndpoint.PathSegment | undefined;
    readonly additionalPropertiesStrategy?: OpenApi.AdditionalPropertiesStrategy | undefined;
} | undefined) => Layer.Layer<never, never, HttpApi.Api>;
/**
 * @since 1.0.0
 * @category security
 */
export declare const securityDecode: <Security extends HttpApiSecurity.HttpApiSecurity>(self: Security) => Effect.Effect<HttpApiSecurity.HttpApiSecurity.Type<Security>, never, HttpServerRequest.HttpServerRequest | HttpServerRequest.ParsedSearchParams>;
/**
 * Set a cookie from an `HttpApiSecurity.HttpApiKey` instance.
 *
 * You can use this api before returning a response from an endpoint handler.
 *
 * ```ts skip-type-checking
 * handlers.handle(
 *   "authenticate",
 *   (_) => HttpApiBuilder.securitySetCookie(security, "secret123")
 * )
 * ```
 *
 * @since 1.0.0
 * @category middleware
 */
export declare const securitySetCookie: (self: HttpApiSecurity.ApiKey, value: string | Redacted.Redacted, options?: Cookie["options"]) => Effect.Effect<void>;
export {};
//# sourceMappingURL=HttpApiBuilder.d.ts.map