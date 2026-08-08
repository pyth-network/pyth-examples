/**
 * @since 1.0.0
 */
export const hasBody = method => method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
/**
 * @since 1.0.0
 */
export const all = /*#__PURE__*/new Set(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]);
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
export const isHttpMethod = u => all.has(u);
//# sourceMappingURL=HttpMethod.js.map