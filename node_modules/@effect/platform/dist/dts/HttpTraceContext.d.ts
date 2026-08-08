/**
 * @since 1.0.0
 */
import * as Option from "effect/Option";
import * as Tracer from "effect/Tracer";
import * as Headers from "./Headers.js";
/**
 * @since 1.0.0
 * @category models
 */
export interface FromHeaders {
    (headers: Headers.Headers): Option.Option<Tracer.ExternalSpan>;
}
/**
 * @since 1.0.0
 * @category encoding
 */
export declare const toHeaders: (span: Tracer.Span) => Headers.Headers;
/**
 * @since 1.0.0
 * @category decoding
 */
export declare const fromHeaders: (headers: Headers.Headers) => Option.Option<Tracer.ExternalSpan>;
/**
 * @since 1.0.0
 * @category decoding
 */
export declare const b3: FromHeaders;
/**
 * @since 1.0.0
 * @category decoding
 */
export declare const xb3: FromHeaders;
/**
 * @since 1.0.0
 * @category decoding
 */
export declare const w3c: FromHeaders;
//# sourceMappingURL=HttpTraceContext.d.ts.map