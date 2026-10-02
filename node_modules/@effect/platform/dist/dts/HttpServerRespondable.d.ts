import * as Effect from "effect/Effect";
import type { HttpServerResponse } from "./HttpServerResponse.js";
/**
 * @since 1.0.0
 * @category symbols
 */
export declare const symbol: unique symbol;
/**
 * @since 1.0.0
 * @category models
 */
export interface Respondable {
    readonly [symbol]: () => Effect.Effect<HttpServerResponse, unknown>;
}
/**
 * @since 1.0.0
 * @category guards
 */
export declare const isRespondable: (u: unknown) => u is Respondable;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const toResponse: (self: Respondable) => Effect.Effect<HttpServerResponse>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const toResponseOrElse: (u: unknown, orElse: HttpServerResponse) => Effect.Effect<HttpServerResponse>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const toResponseOrElseDefect: (u: unknown, orElse: HttpServerResponse) => Effect.Effect<HttpServerResponse>;
//# sourceMappingURL=HttpServerRespondable.d.ts.map