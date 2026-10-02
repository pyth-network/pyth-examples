/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause";
import type * as Effect from "effect/Effect";
import type * as Exit from "effect/Exit";
import type * as FiberId from "effect/FiberId";
import type * as Option from "effect/Option";
import type * as ServerRequest from "./HttpServerRequest.js";
import * as Respondable from "./HttpServerRespondable.js";
import * as ServerResponse from "./HttpServerResponse.js";
/**
 * @since 1.0.0
 * @category type id
 */
export declare const TypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId;
/**
 * @since 1.0.0
 * @category error
 */
export type HttpServerError = RequestError | ResponseError | RouteNotFound | ServeError;
declare const RequestError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => Cause.YieldableError & Record<typeof TypeId, typeof TypeId> & {
    readonly _tag: "RequestError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category error
 */
export declare class RequestError extends RequestError_base<{
    readonly request: ServerRequest.HttpServerRequest;
    readonly reason: "Transport" | "Decode";
    readonly cause?: unknown;
    readonly description?: string;
}> implements Respondable.Respondable {
    /**
     * @since 1.0.0
     */
    [Respondable.symbol](): ServerResponse.HttpServerResponse;
    get methodAndUrl(): string;
    get message(): string;
}
/**
 * @since 1.0.0
 * @category predicates
 */
export declare const isServerError: (u: unknown) => u is HttpServerError;
declare const RouteNotFound_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => Cause.YieldableError & Record<typeof TypeId, typeof TypeId> & {
    readonly _tag: "RouteNotFound";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category error
 */
export declare class RouteNotFound extends RouteNotFound_base<{
    readonly request: ServerRequest.HttpServerRequest;
}> {
    constructor(options: {
        request: ServerRequest.HttpServerRequest;
    });
    /**
     * @since 1.0.0
     */
    [Respondable.symbol](): ServerResponse.HttpServerResponse;
    get message(): string;
}
declare const ResponseError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => Cause.YieldableError & Record<typeof TypeId, typeof TypeId> & {
    readonly _tag: "ResponseError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category error
 */
export declare class ResponseError extends ResponseError_base<{
    readonly request: ServerRequest.HttpServerRequest;
    readonly response: ServerResponse.HttpServerResponse;
    readonly reason: "Decode";
    readonly cause?: unknown;
    readonly description?: string;
}> {
    /**
     * @since 1.0.0
     */
    [Respondable.symbol](): ServerResponse.HttpServerResponse;
    get methodAndUrl(): string;
    get message(): string;
}
declare const ServeError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => Cause.YieldableError & Record<typeof TypeId, typeof TypeId> & {
    readonly _tag: "ServeError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category error
 */
export declare class ServeError extends ServeError_base<{
    readonly cause: unknown;
}> {
}
/**
 * @since 1.0.0
 */
export declare const clientAbortFiberId: FiberId.FiberId;
/**
 * @since 1.0.0
 */
export declare const causeResponse: <E>(cause: Cause.Cause<E>) => Effect.Effect<readonly [ServerResponse.HttpServerResponse, Cause.Cause<E>]>;
/**
 * @since 1.0.0
 */
export declare const causeResponseStripped: <E>(cause: Cause.Cause<E>) => readonly [response: ServerResponse.HttpServerResponse, cause: Option.Option<Cause.Cause<E>>];
/**
 * @since 1.0.0
 */
export declare const exitResponse: <E>(exit: Exit.Exit<ServerResponse.HttpServerResponse, E>) => ServerResponse.HttpServerResponse;
export {};
//# sourceMappingURL=HttpServerError.d.ts.map