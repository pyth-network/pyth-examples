/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { RuntimeFiber } from "effect/Fiber";
import type * as FiberRef from "effect/FiberRef";
import type { Inspectable } from "effect/Inspectable";
import type { Layer } from "effect/Layer";
import type { Pipeable } from "effect/Pipeable";
import type * as Predicate from "effect/Predicate";
import type { Ref } from "effect/Ref";
import type * as Schedule from "effect/Schedule";
import type { Scope } from "effect/Scope";
import type { NoExcessProperties, NoInfer } from "effect/Types";
import type { Cookies } from "./Cookies.js";
import type * as Error from "./HttpClientError.js";
import type * as ClientRequest from "./HttpClientRequest.js";
import type * as ClientResponse from "./HttpClientResponse.js";
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
 * @category models
 */
export interface HttpClient extends HttpClient.With<Error.HttpClientError> {
}
/**
 * @since 1.0.0
 */
export declare namespace HttpClient {
    /**
     * @since 1.0.0
     * @category models
     */
    interface With<E, R = never> extends Pipeable, Inspectable {
        readonly [TypeId]: TypeId;
        readonly execute: (request: ClientRequest.HttpClientRequest) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>;
        readonly get: (url: string | URL, options?: ClientRequest.Options.NoBody) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>;
        readonly head: (url: string | URL, options?: ClientRequest.Options.NoBody) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>;
        readonly post: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>;
        readonly patch: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>;
        readonly put: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>;
        readonly del: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>;
        readonly options: (url: string | URL, options?: ClientRequest.Options.NoUrl) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>;
    }
    /**
     * @since 1.0.0
     * @category models
     */
    type Preprocess<E, R> = (request: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E, R>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Postprocess<E = never, R = never> = (request: Effect.Effect<ClientRequest.HttpClientRequest, E, R>) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const HttpClient: Context.Tag<HttpClient, HttpClient>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const execute: (request: ClientRequest.HttpClientRequest) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const get: (url: string | URL, options?: ClientRequest.Options.NoBody | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const head: (url: string | URL, options?: ClientRequest.Options.NoBody | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const post: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const patch: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const put: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const del: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const options: (url: string | URL, options?: ClientRequest.Options.NoUrl | undefined) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>;
/**
 * @since 1.0.0
 * @category error handling
 */
export declare const catchAll: {
    /**
     * @since 1.0.0
     * @category error handling
     */
    <E, E2, R2>(f: (e: E) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E2, R2 | R>;
    /**
     * @since 1.0.0
     * @category error handling
     */
    <E, R, A2, E2, R2>(self: HttpClient.With<E, R>, f: (e: E) => Effect.Effect<A2, E2, R2>): HttpClient.With<E2, R | R2>;
};
/**
 * @since 1.0.0
 * @category error handling
 */
export declare const catchTag: {
    /**
     * @since 1.0.0
     * @category error handling
     */
    <K extends E extends {
        _tag: string;
    } ? E["_tag"] : never, E, E1, R1>(tag: K, f: (e: Extract<E, {
        _tag: K;
    }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E1 | Exclude<E, {
        _tag: K;
    }>, R1 | R>;
    /**
     * @since 1.0.0
     * @category error handling
     */
    <R, E, K extends E extends {
        _tag: string;
    } ? E["_tag"] : never, R1, E1>(self: HttpClient.With<E, R>, tag: K, f: (e: Extract<E, {
        _tag: K;
    }>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>): HttpClient.With<E1 | Exclude<E, {
        _tag: K;
    }>, R1 | R>;
};
/**
 * @since 1.0.0
 * @category error handling
 */
export declare const catchTags: {
    /**
     * @since 1.0.0
     * @category error handling
     */
    <E, Cases extends {
        [K in Extract<E, {
            _tag: string;
        }>["_tag"]]+?: (error: Extract<E, {
            _tag: K;
        }>) => Effect.Effect<ClientResponse.HttpClientResponse, any, any>;
    } & (unknown extends E ? {} : {
        [K in Exclude<keyof Cases, Extract<E, {
            _tag: string;
        }>["_tag"]>]: never;
    })>(cases: Cases): <R>(self: HttpClient.With<E, R>) => HttpClient.With<Exclude<E, {
        _tag: keyof Cases;
    }> | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never;
    }[keyof Cases], R | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never;
    }[keyof Cases]>;
    /**
     * @since 1.0.0
     * @category error handling
     */
    <E extends {
        _tag: string;
    }, R, Cases extends {
        [K in Extract<E, {
            _tag: string;
        }>["_tag"]]+?: (error: Extract<E, {
            _tag: K;
        }>) => Effect.Effect<ClientResponse.HttpClientResponse, any, any>;
    } & (unknown extends E ? {} : {
        [K in Exclude<keyof Cases, Extract<E, {
            _tag: string;
        }>["_tag"]>]: never;
    })>(self: HttpClient.With<E, R>, cases: Cases): HttpClient.With<Exclude<E, {
        _tag: keyof Cases;
    }> | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never;
    }[keyof Cases], R | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never;
    }[keyof Cases]>;
};
/**
 * Filters the result of a response, or runs an alternative effect if the predicate fails.
 *
 * @since 1.0.0
 * @category filters
 */
export declare const filterOrElse: {
    /**
     * Filters the result of a response, or runs an alternative effect if the predicate fails.
     *
     * @since 1.0.0
     * @category filters
     */
    <E2, R2>(predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>, orElse: (response: ClientResponse.HttpClientResponse) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E2 | E, R2 | R>;
    /**
     * Filters the result of a response, or runs an alternative effect if the predicate fails.
     *
     * @since 1.0.0
     * @category filters
     */
    <E, R, E2, R2>(self: HttpClient.With<E, R>, predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>, orElse: (response: ClientResponse.HttpClientResponse) => Effect.Effect<ClientResponse.HttpClientResponse, E2, R2>): HttpClient.With<E2 | E, R2 | R>;
};
/**
 * Filters the result of a response, or throws an error if the predicate fails.
 *
 * @since 1.0.0
 * @category filters
 */
export declare const filterOrFail: {
    /**
     * Filters the result of a response, or throws an error if the predicate fails.
     *
     * @since 1.0.0
     * @category filters
     */
    <E2>(predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>, orFailWith: (response: ClientResponse.HttpClientResponse) => E2): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E2 | E, R>;
    /**
     * Filters the result of a response, or throws an error if the predicate fails.
     *
     * @since 1.0.0
     * @category filters
     */
    <E, R, E2>(self: HttpClient.With<E, R>, predicate: Predicate.Predicate<ClientResponse.HttpClientResponse>, orFailWith: (response: ClientResponse.HttpClientResponse) => E2): HttpClient.With<E2 | E, R>;
};
/**
 * Filters responses by HTTP status code.
 *
 * @since 1.0.0
 * @category filters
 */
export declare const filterStatus: {
    /**
     * Filters responses by HTTP status code.
     *
     * @since 1.0.0
     * @category filters
     */
    (f: (status: number) => boolean): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | Error.ResponseError, R>;
    /**
     * Filters responses by HTTP status code.
     *
     * @since 1.0.0
     * @category filters
     */
    <E, R>(self: HttpClient.With<E, R>, f: (status: number) => boolean): HttpClient.With<E | Error.ResponseError, R>;
};
/**
 * Filters responses that return a 2xx status code.
 *
 * @since 1.0.0
 * @category filters
 */
export declare const filterStatusOk: <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | Error.ResponseError, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeWith: <E2, R2, E, R>(postprocess: (request: Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>) => Effect.Effect<ClientResponse.HttpClientResponse, E, R>, preprocess: HttpClient.Preprocess<E2, R2>) => HttpClient.With<E, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: (f: (request: ClientRequest.HttpClientRequest, url: URL, signal: AbortSignal, fiber: RuntimeFiber<ClientResponse.HttpClientResponse, Error.HttpClientError>) => Effect.Effect<ClientResponse.HttpClientResponse, Error.HttpClientError>) => HttpClient;
/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export declare const transform: {
    /**
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R, E1, R1>(f: (effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>, request: ClientRequest.HttpClientRequest) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>): (self: HttpClient.With<E, R>) => HttpClient.With<E | E1, R | R1>;
    /**
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R, E1, R1>(self: HttpClient.With<E, R>, f: (effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>, request: ClientRequest.HttpClientRequest) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>): HttpClient.With<E | E1, R | R1>;
};
/**
 * @since 1.0.0
 * @category mapping & sequencing
 */
export declare const transformResponse: {
    /**
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R, E1, R1>(f: (effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>): (self: HttpClient.With<E, R>) => HttpClient.With<E1, R1>;
    /**
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R, E1, R1>(self: HttpClient.With<E, R>, f: (effect: Effect.Effect<ClientResponse.HttpClientResponse, E, R>) => Effect.Effect<ClientResponse.HttpClientResponse, E1, R1>): HttpClient.With<E1, R1>;
};
/**
 * Appends a transformation of the request object before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export declare const mapRequest: {
    /**
     * Appends a transformation of the request object before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    (f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>;
    /**
     * Appends a transformation of the request object before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R>(self: HttpClient.With<E, R>, f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest): HttpClient.With<E, R>;
};
/**
 * Appends an effectful transformation of the request object before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export declare const mapRequestEffect: {
    /**
     * Appends an effectful transformation of the request object before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E2, R2>(f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>;
    /**
     * Appends an effectful transformation of the request object before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R, E2, R2>(self: HttpClient.With<E, R>, f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>): HttpClient.With<E | E2, R | R2>;
};
/**
 * Prepends a transformation of the request object before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export declare const mapRequestInput: {
    /**
     * Prepends a transformation of the request object before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    (f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>;
    /**
     * Prepends a transformation of the request object before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R>(self: HttpClient.With<E, R>, f: (a: ClientRequest.HttpClientRequest) => ClientRequest.HttpClientRequest): HttpClient.With<E, R>;
};
/**
 * Prepends an effectful transformation of the request object before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export declare const mapRequestInputEffect: {
    /**
     * Prepends an effectful transformation of the request object before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E2, R2>(f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>;
    /**
     * Prepends an effectful transformation of the request object before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R, E2, R2>(self: HttpClient.With<E, R>, f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<ClientRequest.HttpClientRequest, E2, R2>): HttpClient.With<E | E2, R | R2>;
};
/**
 * @since 1.0.0
 * @category error handling
 */
export declare namespace Retry {
    /**
     * @since 1.0.0
     * @category error handling
     */
    type Return<R, E, O extends NoExcessProperties<Effect.Retry.Options<E>, O>> = HttpClient.With<(O extends {
        schedule: Schedule.Schedule<infer _O, infer _I, infer _R>;
    } ? E : O extends {
        until: Predicate.Refinement<E, infer E2>;
    } ? E2 : E) | (O extends {
        while: (...args: Array<any>) => Effect.Effect<infer _A, infer E, infer _R>;
    } ? E : never) | (O extends {
        until: (...args: Array<any>) => Effect.Effect<infer _A, infer E, infer _R>;
    } ? E : never), R | (O extends {
        schedule: Schedule.Schedule<infer _O, infer _I, infer R>;
    } ? R : never) | (O extends {
        while: (...args: Array<any>) => Effect.Effect<infer _A, infer _E, infer R>;
    } ? R : never) | (O extends {
        until: (...args: Array<any>) => Effect.Effect<infer _A, infer _E, infer R>;
    } ? R : never)> extends infer Z ? Z : never;
}
/**
 * Retries the request based on a provided schedule or policy.
 *
 * @since 1.0.0
 * @category error handling
 */
export declare const retry: {
    /**
     * Retries the request based on a provided schedule or policy.
     *
     * @since 1.0.0
     * @category error handling
     */
    <E, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(options: O): <R>(self: HttpClient.With<E, R>) => Retry.Return<R, E, O>;
    /**
     * Retries the request based on a provided schedule or policy.
     *
     * @since 1.0.0
     * @category error handling
     */
    <B, E, R1>(policy: Schedule.Schedule<B, NoInfer<E>, R1>): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R1 | R>;
    /**
     * Retries the request based on a provided schedule or policy.
     *
     * @since 1.0.0
     * @category error handling
     */
    <E, R, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(self: HttpClient.With<E, R>, options: O): Retry.Return<R, E, O>;
    /**
     * Retries the request based on a provided schedule or policy.
     *
     * @since 1.0.0
     * @category error handling
     */
    <E, R, B, R1>(self: HttpClient.With<E, R>, policy: Schedule.Schedule<B, E, R1>): HttpClient.With<E, R1 | R>;
};
/**
 * Retries common transient errors, such as rate limiting, timeouts or network issues.
 *
 * Specifying a `while` predicate allows you to consider other errors as
 * transient.
 *
 * @since 1.0.0
 * @category error handling
 */
export declare const retryTransient: {
    /**
     * Retries common transient errors, such as rate limiting, timeouts or network issues.
     *
     * Specifying a `while` predicate allows you to consider other errors as
     * transient.
     *
     * @since 1.0.0
     * @category error handling
     */
    <B, E, R1 = never>(options: {
        readonly while?: Predicate.Predicate<NoInfer<E>>;
        readonly schedule?: Schedule.Schedule<B, NoInfer<E>, R1>;
        readonly times?: number;
    } | Schedule.Schedule<B, NoInfer<E>, R1>): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R1 | R>;
    /**
     * Retries common transient errors, such as rate limiting, timeouts or network issues.
     *
     * Specifying a `while` predicate allows you to consider other errors as
     * transient.
     *
     * @since 1.0.0
     * @category error handling
     */
    <E, R, B, R1 = never>(self: HttpClient.With<E, R>, options: {
        readonly while?: Predicate.Predicate<NoInfer<E>>;
        readonly schedule?: Schedule.Schedule<B, NoInfer<E>, R1>;
        readonly times?: number;
    } | Schedule.Schedule<B, NoInfer<E>, R1>): HttpClient.With<E, R1 | R>;
};
/**
 * Performs an additional effect after a successful request.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export declare const tap: {
    /**
     * Performs an additional effect after a successful request.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <_, E2, R2>(f: (response: ClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>;
    /**
     * Performs an additional effect after a successful request.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R, _, E2, R2>(self: HttpClient.With<E, R>, f: (response: ClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>): HttpClient.With<E | E2, R | R2>;
};
/**
 * Performs an additional effect after an unsuccessful request.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export declare const tapError: {
    /**
     * Performs an additional effect after an unsuccessful request.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <_, E, E2, R2>(f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>;
    /**
     * Performs an additional effect after an unsuccessful request.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R, _, E2, R2>(self: HttpClient.With<E, R>, f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>): HttpClient.With<E | E2, R | R2>;
};
/**
 * Performs an additional effect on the request before sending it.
 *
 * @since 1.0.0
 * @category mapping & sequencing
 */
export declare const tapRequest: {
    /**
     * Performs an additional effect on the request before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <_, E2, R2>(f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2>;
    /**
     * Performs an additional effect on the request before sending it.
     *
     * @since 1.0.0
     * @category mapping & sequencing
     */
    <E, R, _, E2, R2>(self: HttpClient.With<E, R>, f: (a: ClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>): HttpClient.With<E | E2, R | R2>;
};
/**
 * Associates a `Ref` of cookies with the client for handling cookies across requests.
 *
 * @since 1.0.0
 * @category cookies
 */
export declare const withCookiesRef: {
    /**
     * Associates a `Ref` of cookies with the client for handling cookies across requests.
     *
     * @since 1.0.0
     * @category cookies
     */
    (ref: Ref<Cookies>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>;
    /**
     * Associates a `Ref` of cookies with the client for handling cookies across requests.
     *
     * @since 1.0.0
     * @category cookies
     */
    <E, R>(self: HttpClient.With<E, R>, ref: Ref<Cookies>): HttpClient.With<E, R>;
};
/**
 * Follows HTTP redirects up to a specified number of times.
 *
 * @since 1.0.0
 * @category redirects
 */
export declare const followRedirects: {
    /**
     * Follows HTTP redirects up to a specified number of times.
     *
     * @since 1.0.0
     * @category redirects
     */
    (maxRedirects?: number | undefined): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>;
    /**
     * Follows HTTP redirects up to a specified number of times.
     *
     * @since 1.0.0
     * @category redirects
     */
    <E, R>(self: HttpClient.With<E, R>, maxRedirects?: number | undefined): HttpClient.With<E, R>;
};
/**
 * @since 1.0.0
 * @category Tracing
 */
export declare const currentTracerDisabledWhen: FiberRef.FiberRef<Predicate.Predicate<ClientRequest.HttpClientRequest>>;
/**
 * Disables tracing for specific requests based on a provided predicate.
 *
 * @since 1.0.0
 * @category Tracing
 */
export declare const withTracerDisabledWhen: {
    /**
     * Disables tracing for specific requests based on a provided predicate.
     *
     * @since 1.0.0
     * @category Tracing
     */
    (predicate: Predicate.Predicate<ClientRequest.HttpClientRequest>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>;
    /**
     * Disables tracing for specific requests based on a provided predicate.
     *
     * @since 1.0.0
     * @category Tracing
     */
    <E, R>(self: HttpClient.With<E, R>, predicate: Predicate.Predicate<ClientRequest.HttpClientRequest>): HttpClient.With<E, R>;
};
/**
 * @since 1.0.0
 * @category Tracing
 */
export declare const currentTracerPropagation: FiberRef.FiberRef<boolean>;
/**
 * Enables or disables tracing propagation for the request.
 *
 * @since 1.0.0
 * @category Tracing
 */
export declare const withTracerPropagation: {
    /**
     * Enables or disables tracing propagation for the request.
     *
     * @since 1.0.0
     * @category Tracing
     */
    (enabled: boolean): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>;
    /**
     * Enables or disables tracing propagation for the request.
     *
     * @since 1.0.0
     * @category Tracing
     */
    <E, R>(self: HttpClient.With<E, R>, enabled: boolean): HttpClient.With<E, R>;
};
/**
 * @since 1.0.0
 */
export declare const layerMergedContext: <E, R>(effect: Effect.Effect<HttpClient, E, R>) => Layer<HttpClient, E, R>;
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
export declare const SpanNameGenerator: Context.Reference<SpanNameGenerator, (request: ClientRequest.HttpClientRequest) => string>;
/**
 * Customizes the span names for tracing.
 *
 * ```ts
 * import { FetchHttpClient, HttpClient } from "@effect/platform"
 * import { NodeRuntime } from "@effect/platform-node"
 * import { Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const client = (yield* HttpClient.HttpClient).pipe(
 *     // Customize the span names for this HttpClient
 *     HttpClient.withSpanNameGenerator(
 *       (request) => `http.client ${request.method} ${request.url}`
 *     )
 *   )
 *
 *   yield* client.get("https://jsonplaceholder.typicode.com/posts/1")
 * }).pipe(Effect.provide(FetchHttpClient.layer), NodeRuntime.runMain)
 * ```
 *
 * @since 1.0.0
 * @category Tracing
 */
export declare const withSpanNameGenerator: {
    /**
     * Customizes the span names for tracing.
     *
     * ```ts
     * import { FetchHttpClient, HttpClient } from "@effect/platform"
     * import { NodeRuntime } from "@effect/platform-node"
     * import { Effect } from "effect"
     *
     * Effect.gen(function* () {
     *   const client = (yield* HttpClient.HttpClient).pipe(
     *     // Customize the span names for this HttpClient
     *     HttpClient.withSpanNameGenerator(
     *       (request) => `http.client ${request.method} ${request.url}`
     *     )
     *   )
     *
     *   yield* client.get("https://jsonplaceholder.typicode.com/posts/1")
     * }).pipe(Effect.provide(FetchHttpClient.layer), NodeRuntime.runMain)
     * ```
     *
     * @since 1.0.0
     * @category Tracing
     */
    (f: (request: ClientRequest.HttpClientRequest) => string): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R>;
    /**
     * Customizes the span names for tracing.
     *
     * ```ts
     * import { FetchHttpClient, HttpClient } from "@effect/platform"
     * import { NodeRuntime } from "@effect/platform-node"
     * import { Effect } from "effect"
     *
     * Effect.gen(function* () {
     *   const client = (yield* HttpClient.HttpClient).pipe(
     *     // Customize the span names for this HttpClient
     *     HttpClient.withSpanNameGenerator(
     *       (request) => `http.client ${request.method} ${request.url}`
     *     )
     *   )
     *
     *   yield* client.get("https://jsonplaceholder.typicode.com/posts/1")
     * }).pipe(Effect.provide(FetchHttpClient.layer), NodeRuntime.runMain)
     * ```
     *
     * @since 1.0.0
     * @category Tracing
     */
    <E, R>(self: HttpClient.With<E, R>, f: (request: ClientRequest.HttpClientRequest) => string): HttpClient.With<E, R>;
};
/**
 * Ties the lifetime of the `HttpClientRequest` to a `Scope`.
 *
 * @since 1.0.0
 * @category Scope
 */
export declare const withScope: <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R | Scope>;
//# sourceMappingURL=HttpClient.d.ts.map