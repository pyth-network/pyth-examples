/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Option from "effect/Option";
import { type Pipeable } from "effect/Pipeable";
import * as Predicate from "effect/Predicate";
import * as Record from "effect/Record";
import type * as Schema from "effect/Schema";
import * as AST from "effect/SchemaAST";
import type * as HttpApiEndpoint from "./HttpApiEndpoint.js";
import { HttpApiDecodeError } from "./HttpApiError.js";
import type * as HttpApiGroup from "./HttpApiGroup.js";
import type * as HttpApiMiddleware from "./HttpApiMiddleware.js";
import * as HttpApiSchema from "./HttpApiSchema.js";
import type { HttpMethod } from "./HttpMethod.js";
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
export declare const isHttpApi: (u: unknown) => u is HttpApi.Any;
/**
 * An `HttpApi` is a collection of `HttpApiEndpoint`s. You can use an `HttpApi` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.make` api.
 *
 * @since 1.0.0
 * @category models
 */
export interface HttpApi<out Id extends string, out Groups extends HttpApiGroup.HttpApiGroup.Any = never, in out E = never, out R = never> extends Pipeable {
    new (_: never): {};
    readonly [TypeId]: TypeId;
    readonly identifier: Id;
    readonly groups: Record.ReadonlyRecord<string, Groups>;
    readonly annotations: Context.Context<never>;
    readonly errorSchema: Schema.Schema<E, unknown, R>;
    readonly middlewares: ReadonlySet<HttpApiMiddleware.TagClassAny>;
    /**
     * Add a `HttpApiGroup` to the `HttpApi`.
     */
    add<A extends HttpApiGroup.HttpApiGroup.Any>(group: A): HttpApi<Id, Groups | A, E, R>;
    /**
     * Add another `HttpApi` to the `HttpApi`.
     */
    addHttpApi<Id2 extends string, Groups2 extends HttpApiGroup.HttpApiGroup.Any, E2, R2>(api: HttpApi<Id2, Groups2, E2, R2>): HttpApi<Id, Groups | HttpApiGroup.HttpApiGroup.AddContext<Groups2, R2>, E | E2, R>;
    /**
     * Add an global error to the `HttpApi`.
     */
    addError<A, I, RX>(schema: Schema.Schema<A, I, RX>, annotations?: {
        readonly status?: number | undefined;
    }): HttpApi<Id, Groups, E | A, R | RX>;
    /**
     * Prefix all endpoints in the `HttpApi`.
     */
    prefix(prefix: HttpApiEndpoint.PathSegment): HttpApi<Id, Groups, E, R>;
    /**
     * Add a middleware to a `HttpApi`. It will be applied to all endpoints in the
     * `HttpApi`.
     */
    middleware<I extends HttpApiMiddleware.HttpApiMiddleware.AnyId, S>(middleware: Context.Tag<I, S>): HttpApi<Id, Groups, E | HttpApiMiddleware.HttpApiMiddleware.Error<I>, R | I | HttpApiMiddleware.HttpApiMiddleware.ErrorContext<I>>;
    /**
     * Annotate the `HttpApi`.
     */
    annotate<I, S>(tag: Context.Tag<I, S>, value: S): HttpApi<Id, Groups, E, R>;
    /**
     * Annotate the `HttpApi` with a Context.
     */
    annotateContext<I>(context: Context.Context<I>): HttpApi<Id, Groups, E, R>;
}
declare const Api_base: Context.TagClass<Api, "@effect/platform/HttpApi/Api", {
    readonly api: HttpApi<string, HttpApiGroup.HttpApiGroup.AnyWithProps>;
    readonly context: Context.Context<never>;
}>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class Api extends Api_base {
}
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpApi {
    /**
     * @since 1.0.0
     * @category models
     */
    interface Any {
        readonly [TypeId]: TypeId;
    }
    /**
     * @since 1.0.0
     * @category models
     */
    type AnyWithProps = HttpApi<string, HttpApiGroup.HttpApiGroup.AnyWithProps, any, any>;
}
/**
 * An `HttpApi` is a collection of `HttpApiEndpoint`s. You can use an `HttpApi` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.make` api.
 *
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <const Id extends string>(identifier: Id) => HttpApi<Id, never, HttpApiDecodeError>;
/**
 * Extract metadata from an `HttpApi`, which can be used to generate documentation
 * or other tooling.
 *
 * See the `OpenApi` & `HttpApiClient` modules for examples of how to use this function.
 *
 * @since 1.0.0
 * @category reflection
 */
export declare const reflect: <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, Error, R>(self: HttpApi<Id, Groups, Error, R>, options: {
    readonly predicate?: Predicate.Predicate<{
        readonly endpoint: HttpApiEndpoint.HttpApiEndpoint.AnyWithProps;
        readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps;
    }>;
    readonly onGroup: (options: {
        readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps;
        readonly mergedAnnotations: Context.Context<never>;
    }) => void;
    readonly onEndpoint: (options: {
        readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps;
        readonly endpoint: HttpApiEndpoint.HttpApiEndpoint<string, HttpMethod>;
        readonly mergedAnnotations: Context.Context<never>;
        readonly middleware: ReadonlySet<HttpApiMiddleware.TagClassAny>;
        readonly payloads: ReadonlyMap<string, {
            readonly encoding: HttpApiSchema.Encoding;
            readonly ast: AST.AST;
        }>;
        readonly successes: ReadonlyMap<number, {
            readonly ast: Option.Option<AST.AST>;
            readonly description: Option.Option<string>;
        }>;
        readonly errors: ReadonlyMap<number, {
            readonly ast: Option.Option<AST.AST>;
            readonly description: Option.Option<string>;
        }>;
    }) => void;
}) => void;
declare const AdditionalSchemas_base: Context.TagClass<AdditionalSchemas, "@effect/platform/HttpApi/AdditionalSchemas", readonly Schema.Schema.All[]>;
/**
 * Adds additional schemas to components/schemas.
 * The provided schemas must have a `identifier` annotation.
 *
 * @since 1.0.0
 * @category tags
 */
export declare class AdditionalSchemas extends AdditionalSchemas_base {
}
export {};
//# sourceMappingURL=HttpApi.d.ts.map