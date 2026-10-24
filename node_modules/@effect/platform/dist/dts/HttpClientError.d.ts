import type * as ClientRequest from "./HttpClientRequest.js";
import type * as ClientResponse from "./HttpClientResponse.js";
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
 * @category guards
 */
export declare const isHttpClientError: (u: unknown) => u is HttpClientError;
/**
 * @since 1.0.0
 * @category error
 */
export type HttpClientError = RequestError | ResponseError;
declare const RequestError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => import("effect/Cause").YieldableError & Record<typeof TypeId, typeof TypeId> & {
    readonly _tag: "RequestError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category error
 */
export declare class RequestError extends RequestError_base<{
    readonly request: ClientRequest.HttpClientRequest;
    readonly reason: "Transport" | "Encode" | "InvalidUrl";
    readonly cause?: unknown;
    readonly description?: string;
}> {
    get methodAndUrl(): string;
    get message(): string;
}
declare const ResponseError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => import("effect/Cause").YieldableError & Record<typeof TypeId, typeof TypeId> & {
    readonly _tag: "ResponseError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category error
 */
export declare class ResponseError extends ResponseError_base<{
    readonly request: ClientRequest.HttpClientRequest;
    readonly response: ClientResponse.HttpClientResponse;
    readonly reason: "StatusCode" | "Decode" | "EmptyBody";
    readonly cause?: unknown;
    readonly description?: string;
}> {
    get methodAndUrl(): string;
    get message(): string;
}
export {};
//# sourceMappingURL=HttpClientError.d.ts.map