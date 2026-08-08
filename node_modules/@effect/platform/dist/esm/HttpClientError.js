/**
 * @since 1.0.0
 */
import { hasProperty } from "effect/Predicate";
import * as Error from "./Error.js";
import * as internal from "./internal/httpClientError.js";
/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category guards
 */
export const isHttpClientError = u => hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category error
 */
export class RequestError extends /*#__PURE__*/Error.TypeIdError(TypeId, "RequestError") {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    return this.description ? `${this.reason}: ${this.description} (${this.methodAndUrl})` : `${this.reason} error (${this.methodAndUrl})`;
  }
}
/**
 * @since 1.0.0
 * @category error
 */
export class ResponseError extends /*#__PURE__*/Error.TypeIdError(TypeId, "ResponseError") {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`;
    return this.description ? `${this.reason}: ${this.description} (${info})` : `${this.reason} error (${info})`;
  }
}
//# sourceMappingURL=HttpClientError.js.map