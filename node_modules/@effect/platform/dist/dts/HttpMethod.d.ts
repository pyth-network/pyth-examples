/**
 * @since 1.0.0
 * @category models
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpMethod {
    /**
     * @since 1.0.0
     * @category models
     */
    type NoBody = "GET" | "HEAD" | "OPTIONS";
    /**
     * @since 1.0.0
     * @category models
     */
    type WithBody = Exclude<HttpMethod, NoBody>;
}
/**
 * @since 1.0.0
 */
export declare const hasBody: (method: HttpMethod) => boolean;
/**
 * @since 1.0.0
 */
export declare const all: ReadonlySet<HttpMethod>;
/**
 * Tests if a value is a `HttpMethod`.
 *
 * **Example**
 *
 * ```ts
 * import { HttpMethod } from "@effect/platform"
 *
 * console.log(HttpMethod.isHttpMethod("GET"))
 * // true
 * console.log(HttpMethod.isHttpMethod("get"))
 * // false
 * console.log(HttpMethod.isHttpMethod(1))
 * // false
 * ```
 *
 * @since 1.0.0
 * @category refinements
 */
export declare const isHttpMethod: (u: unknown) => u is HttpMethod;
//# sourceMappingURL=HttpMethod.d.ts.map