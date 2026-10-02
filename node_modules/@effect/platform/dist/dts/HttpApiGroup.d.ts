/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import { type Pipeable } from "effect/Pipeable";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import type * as HttpApiEndpoint from "./HttpApiEndpoint.js";
import type { HttpApiDecodeError } from "./HttpApiError.js";
import type * as HttpApiMiddleware from "./HttpApiMiddleware.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const TypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId;
/**
 * @since 1.0.0
 * @category guards
 */
export declare const isHttpApiGroup: (u: unknown) => u is HttpApiGroup.Any;
/**
 * An `HttpApiGroup` is a collection of `HttpApiEndpoint`s. You can use an `HttpApiGroup` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.group` api.
 *
 * @since 1.0.0
 * @category models
 */
export interface HttpApiGroup<out Id extends string, out Endpoints extends HttpApiEndpoint.HttpApiEndpoint.Any = never, in out Error = HttpApiDecodeError, out R = never, out TopLevel extends (true | false) = false> extends Pipeable {
    new (_: never): {};
    readonly [TypeId]: TypeId;
    readonly identifier: Id;
    readonly topLevel: TopLevel;
    readonly endpoints: Record.ReadonlyRecord<string, Endpoints>;
    readonly errorSchema: Schema.Schema<Error, unknown, R>;
    readonly annotations: Context.Context<never>;
    readonly middlewares: ReadonlySet<HttpApiMiddleware.TagClassAny>;
    /**
     * Add an `HttpApiEndpoint` to an `HttpApiGroup`.
     */
    add<A extends HttpApiEndpoint.HttpApiEndpoint.Any>(endpoint: A): HttpApiGroup<Id, Endpoints | A, Error, R, TopLevel>;
    /**
     * Add an error schema to an `HttpApiGroup`, which is shared by all endpoints in the
     * group.
     */
    addError<A, I, RX>(schema: Schema.Schema<A, I, RX>, annotations?: {
        readonly status?: number | undefined;
    }): HttpApiGroup<Id, Endpoints, Error | A, R | RX, TopLevel>;
    /**
     * Add a path prefix to all endpoints in an `HttpApiGroup`. Note that this will only
     * add the prefix to the endpoints before this api is called.
     */
    prefix(prefix: HttpApiEndpoint.PathSegment): HttpApiGroup<Id, Endpoints, Error, R, TopLevel>;
    /**
     * Add an `HttpApiMiddleware` to the `HttpApiGroup`.
     *
     * It will be applied to all endpoints in the group.
     */
    middleware<I extends HttpApiMiddleware.HttpApiMiddleware.AnyId, S>(middleware: Context.Tag<I, S>): HttpApiGroup<Id, Endpoints, Error | HttpApiMiddleware.HttpApiMiddleware.Error<I>, R | I | HttpApiMiddleware.HttpApiMiddleware.ErrorContext<I>, TopLevel>;
    /**
     * Add an `HttpApiMiddleware` to each endpoint in the `HttpApiGroup`.
     *
     * Endpoints added after this api is called will not have the middleware
     * applied.
     */
    middlewareEndpoints<I extends HttpApiMiddleware.HttpApiMiddleware.AnyId, S>(middleware: Context.Tag<I, S>): HttpApiGroup<Id, HttpApiEndpoint.HttpApiEndpoint.AddContext<Endpoints, I>, Error, R, TopLevel>;
    /**
     * Merge the annotations of an `HttpApiGroup` with a new context.
     */
    annotateContext<I>(context: Context.Context<I>): HttpApiGroup<Id, Endpoints, Error, R, TopLevel>;
    /**
     * Add an annotation to an `HttpApiGroup`.
     */
    annotate<I, S>(tag: Context.Tag<I, S>, value: S): HttpApiGroup<Id, Endpoints, Error, R, TopLevel>;
    /**
     * For each endpoint in an `HttpApiGroup`, update the annotations with a new
     * context.
     *
     * Note that this will only update the annotations before this api is called.
     */
    annotateEndpointsContext<I>(context: Context.Context<I>): HttpApiGroup<Id, Endpoints, Error, R, TopLevel>;
    /**
     * For each endpoint in an `HttpApiGroup`, add an annotation.
     *
     * Note that this will only add the annotation to the endpoints before this api
     * is called.
     */
    annotateEndpoints<I, S>(tag: Context.Tag<I, S>, value: S): HttpApiGroup<Id, Endpoints, Error, R, TopLevel>;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface ApiGroup<ApiId extends string, Name extends string> {
    readonly _: unique symbol;
    readonly apiId: ApiId;
    readonly name: Name;
}
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpApiGroup {
    /**
     * @since 1.0.0
     * @category models
     */
    interface Any {
        readonly [TypeId]: TypeId;
        readonly identifier: string;
    }
    /**
     * @since 1.0.0
     * @category models
     */
    type AnyWithProps = HttpApiGroup<string, HttpApiEndpoint.HttpApiEndpoint.AnyWithProps, any, any, boolean>;
    /**
     * @since 1.0.0
     * @category models
     */
    type ToService<ApiId extends string, A> = A extends HttpApiGroup<infer Name, infer _Endpoints, infer _Error, infer _R, infer _TopLevel> ? ApiGroup<ApiId, Name> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type WithName<Group, Name extends string> = Extract<Group, {
        readonly identifier: Name;
    }>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Name<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _R, infer _TopLevel> ? _Name : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Endpoints<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _R, infer _TopLevel> ? _Endpoints : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type EndpointsWithName<Group extends Any, Name extends string> = Endpoints<WithName<Group, Name>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Error<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _R, infer _TopLevel> ? _Error : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type AddContext<Group, R> = [R] extends [never] ? Group : Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _R, infer _TopLevel> ? HttpApiGroup<_Name, _Endpoints, _Error, _R | R, _TopLevel> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Provides<Group extends Any> = HttpApiMiddleware.HttpApiMiddleware.ExtractProvides<Middleware<Group>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type ErrorWithName<Group extends Any, Name extends string> = Error<WithName<Group, Name>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Context<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _R, infer _TopLevel> ? HttpApiMiddleware.HttpApiMiddleware.Without<_R> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Middleware<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _R, infer _TopLevel> ? HttpApiMiddleware.HttpApiMiddleware.Only<_R> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type ClientContext<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _R, infer _TopLevel> ? _R | HttpApiEndpoint.HttpApiEndpoint.Context<_Endpoints> | HttpApiEndpoint.HttpApiEndpoint.ErrorContext<_Endpoints> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type ErrorContext<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _R, infer _TopLevel> ? HttpApiMiddleware.HttpApiMiddleware.Without<_R> | HttpApiEndpoint.HttpApiEndpoint.ErrorContext<_Endpoints> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type ContextWithName<Group extends Any, Name extends string> = Context<WithName<Group, Name>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type MiddlewareWithName<Group extends Any, Name extends string> = Middleware<WithName<Group, Name>>;
}
/**
 * An `HttpApiGroup` is a collection of `HttpApiEndpoint`s. You can use an `HttpApiGroup` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.group` api.
 *
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <const Id extends string, const TopLevel extends (true | false) = false>(identifier: Id, options?: {
    readonly topLevel?: TopLevel | undefined;
}) => HttpApiGroup<Id, never, never, never, TopLevel>;
//# sourceMappingURL=HttpApiGroup.d.ts.map