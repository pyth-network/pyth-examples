/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import type * as Layer from "effect/Layer";
import type { HttpClient } from "./HttpClient.js";
declare const Fetch_base: Context.TagClass<Fetch, "@effect/platform/FetchHttpClient/Fetch", typeof fetch>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class Fetch extends Fetch_base {
}
declare const RequestInit_base: Context.TagClass<RequestInit, "@effect/platform/FetchHttpClient/FetchOptions", globalThis.RequestInit>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class RequestInit extends RequestInit_base {
}
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: Layer.Layer<HttpClient>;
export {};
//# sourceMappingURL=FetchHttpClient.d.ts.map