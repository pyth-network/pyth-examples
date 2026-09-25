/**
 * @since 1.0.0
 */
import type * as Client from "@effect/platform/HttpClient";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import type * as Http from "node:http";
import type * as Https from "node:https";
import type * as Undici from "./Undici.js";
/**
 * @since 1.0.0
 * @category agent
 */
export declare const HttpAgentTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category agent
 */
export type HttpAgentTypeId = typeof HttpAgentTypeId;
/**
 * @since 1.0.0
 * @category agent
 */
export interface HttpAgent {
    readonly [HttpAgentTypeId]: typeof HttpAgentTypeId;
    readonly http: Http.Agent;
    readonly https: Https.Agent;
}
/**
 * @since 1.0.0
 * @category agent
 */
export declare const HttpAgent: Context.Tag<HttpAgent, HttpAgent>;
/**
 * @since 1.0.0
 * @category agent
 */
export declare const makeAgent: (options?: Https.AgentOptions) => Effect.Effect<HttpAgent, never, Scope.Scope>;
/**
 * @since 1.0.0
 * @category agent
 */
export declare const agentLayer: Layer.Layer<HttpAgent>;
/**
 * @since 1.0.0
 * @category agent
 */
export declare const makeAgentLayer: (options?: Https.AgentOptions) => Layer.Layer<HttpAgent>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: Effect.Effect<Client.HttpClient, never, HttpAgent>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: Layer.Layer<Client.HttpClient>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerWithoutAgent: Layer.Layer<Client.HttpClient, never, HttpAgent>;
/**
 * @since 1.0.0
 * @category undici
 */
export interface Dispatcher {
    readonly _: unique symbol;
}
/**
 * @since 1.0.0
 * @category undici
 */
export declare const Dispatcher: Context.Tag<Dispatcher, Undici.Dispatcher>;
/**
 * @since 1.0.0
 * @category undici
 */
export declare const makeDispatcher: Effect.Effect<Undici.Dispatcher, never, Scope.Scope>;
/**
 * @since 1.0.0
 * @category undici
 */
export declare const dispatcherLayer: Layer.Layer<Dispatcher>;
/**
 * @since 1.0.0
 * @category undici
 */
export declare const dispatcherLayerGlobal: Layer.Layer<Dispatcher>;
declare const UndiciRequestOptions_base: Context.TagClass<UndiciRequestOptions, "@effect/platform-node/NodeHttpClient/undiciOptions", Undici.Dispatcher.RequestOptions<null>>;
/**
 * @since 1.0.0
 * @category undici
 */
export declare class UndiciRequestOptions extends UndiciRequestOptions_base {
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeUndici: (dispatcher: Undici.Dispatcher) => Client.HttpClient;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerUndici: Layer.Layer<Client.HttpClient>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerUndiciWithoutDispatcher: Layer.Layer<Client.HttpClient, never, Dispatcher>;
export {};
//# sourceMappingURL=NodeHttpClient.d.ts.map