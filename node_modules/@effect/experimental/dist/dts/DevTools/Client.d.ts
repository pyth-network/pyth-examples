import * as Socket from "@effect/platform/Socket";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import * as Tracer from "effect/Tracer";
import * as Domain from "./Domain.js";
/**
 * @since 1.0.0
 * @category models
 */
export interface ClientImpl {
    readonly unsafeAddSpan: (_: Domain.Span | Domain.SpanEvent) => void;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Client {
    readonly _: unique symbol;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const Client: Context.Tag<Client, ClientImpl>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: Effect.Effect<ClientImpl, never, Scope.Scope | Socket.Socket>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: Layer.Layer<Client, never, Socket.Socket>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeTracer: Effect.Effect<Tracer.Tracer, never, Client>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerTracer: Layer.Layer<never, never, Socket.Socket>;
//# sourceMappingURL=Client.d.ts.map