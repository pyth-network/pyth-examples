import * as Effect from "effect/Effect";
import * as ParseResult from "effect/ParseResult";
import type { Simplify } from "effect/Types";
import * as HttpApi from "./HttpApi.js";
import type { HttpApiEndpoint } from "./HttpApiEndpoint.js";
import type { HttpApiGroup } from "./HttpApiGroup.js";
import type * as HttpApiMiddleware from "./HttpApiMiddleware.js";
import * as HttpClient from "./HttpClient.js";
import * as HttpClientError from "./HttpClientError.js";
import * as HttpClientResponse from "./HttpClientResponse.js";
/**
 * @since 1.0.0
 * @category models
 */
export type Client<Groups extends HttpApiGroup.Any, E, R> = Simplify<{
    readonly [Group in Extract<Groups, {
        readonly topLevel: false;
    }> as HttpApiGroup.Name<Group>]: Client.Group<Group, Group["identifier"], E, R>;
} & {
    readonly [Method in Client.TopLevelMethods<Groups, E, R> as Method[0]]: Method[1];
}>;
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Client {
    /**
     * @since 1.0.0
     * @category models
     */
    type Group<Groups extends HttpApiGroup.Any, GroupName extends Groups["identifier"], E, R> = [
        HttpApiGroup.WithName<Groups, GroupName>
    ] extends [
        HttpApiGroup<infer _GroupName, infer _Endpoints, infer _GroupError, infer _GroupErrorR>
    ] ? {
        readonly [Endpoint in _Endpoints as HttpApiEndpoint.Name<Endpoint>]: Method<Endpoint, E, _GroupError, R>;
    } : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Method<Endpoint, E, GroupError, R> = [Endpoint] extends [
        HttpApiEndpoint<infer _Name, infer _Method, infer _Path, infer _UrlParams, infer _Payload, infer _Headers, infer _Success, infer _Error, infer _R, infer _RE>
    ] ? <WithResponse extends boolean = false>(request: Simplify<HttpApiEndpoint.ClientRequest<_Path, _UrlParams, _Payload, _Headers, WithResponse>>) => Effect.Effect<WithResponse extends true ? [_Success, HttpClientResponse.HttpClientResponse] : _Success, _Error | GroupError | E | HttpClientError.HttpClientError | ParseResult.ParseError, R> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type TopLevelMethods<Groups extends HttpApiGroup.Any, E, R> = Extract<Groups, {
        readonly topLevel: true;
    }> extends HttpApiGroup<infer _Id, infer _Endpoints, infer _Error, infer _ErrorR, infer _TopLevel> ? _Endpoints extends infer Endpoint ? [HttpApiEndpoint.Name<Endpoint>, Method<Endpoint, E, _Error, R>] : never : never;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <ApiId extends string, Groups extends HttpApiGroup.Any, ApiError, ApiR>(api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>, options?: {
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined;
    readonly transformResponse?: ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>) | undefined;
    readonly baseUrl?: URL | string | undefined;
}) => Effect.Effect<Simplify<Client<Groups, ApiError, never>>, never, HttpApiMiddleware.HttpApiMiddleware.Without<ApiR | HttpApiGroup.ClientContext<Groups>> | HttpClient.HttpClient>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeWith: <ApiId extends string, Groups extends HttpApiGroup.Any, ApiError, ApiR, E, R>(api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>, options: {
    readonly httpClient: HttpClient.HttpClient.With<E, R>;
    readonly transformResponse?: ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>) | undefined;
    readonly baseUrl?: URL | string | undefined;
}) => Effect.Effect<Simplify<Client<Groups, ApiError | E, R>>, never, HttpApiMiddleware.HttpApiMiddleware.Without<ApiR | HttpApiGroup.ClientContext<Groups>>>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const group: <ApiId extends string, Groups extends HttpApiGroup.Any, ApiError, ApiR, const GroupName extends HttpApiGroup.Name<Groups>, E, R>(api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>, options: {
    readonly group: GroupName;
    readonly httpClient: HttpClient.HttpClient.With<E, R>;
    readonly transformResponse?: ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>) | undefined;
    readonly baseUrl?: URL | string | undefined;
}) => Effect.Effect<Client.Group<Groups, GroupName, ApiError | E, R>, never, HttpApiMiddleware.HttpApiMiddleware.Without<ApiR | HttpApiGroup.ClientContext<HttpApiGroup.WithName<Groups, GroupName>>>>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const endpoint: <ApiId extends string, Groups extends HttpApiGroup.Any, ApiError, ApiR, const GroupName extends HttpApiGroup.Name<Groups>, const EndpointName extends HttpApiEndpoint.Name<HttpApiGroup.EndpointsWithName<Groups, GroupName>>, E, R>(api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>, options: {
    readonly group: GroupName;
    readonly endpoint: EndpointName;
    readonly httpClient: HttpClient.HttpClient.With<E, R>;
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined;
    readonly transformResponse?: ((effect: Effect.Effect<unknown, unknown>) => Effect.Effect<unknown, unknown>) | undefined;
    readonly baseUrl?: URL | string | undefined;
}) => Effect.Effect<Client.Method<HttpApiEndpoint.WithName<HttpApiGroup.Endpoints<HttpApiGroup.WithName<Groups, GroupName>>, EndpointName>, HttpApiGroup.Error<HttpApiGroup.WithName<Groups, GroupName>>, ApiError | E, R>, never, HttpApiMiddleware.HttpApiMiddleware.Without<ApiR | HttpApiGroup.Context<HttpApiGroup.WithName<Groups, GroupName>> | HttpApiEndpoint.ContextWithName<HttpApiGroup.EndpointsWithName<Groups, GroupName>, EndpointName> | HttpApiEndpoint.ErrorContextWithName<HttpApiGroup.EndpointsWithName<Groups, GroupName>, EndpointName>>>;
//# sourceMappingURL=HttpApiClient.d.ts.map