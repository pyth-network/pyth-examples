import { TypeIdError } from "./Error.js";
import * as Respondable from "./HttpServerRespondable.js";
import * as ServerResponse from "./HttpServerResponse.js";
import * as internal from "./internal/httpServerError.js";
/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category error
 */
export class RequestError extends /*#__PURE__*/TypeIdError(TypeId, "RequestError") {
  /**
   * @since 1.0.0
   */
  [Respondable.symbol]() {
    return ServerResponse.empty({
      status: 400
    });
  }
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    return this.description ? `${this.reason}: ${this.description} (${this.methodAndUrl})` : `${this.reason} error (${this.methodAndUrl})`;
  }
}
/**
 * @since 1.0.0
 * @category predicates
 */
export const isServerError = internal.isServerError;
/**
 * @since 1.0.0
 * @category error
 */
export class RouteNotFound extends /*#__PURE__*/TypeIdError(TypeId, "RouteNotFound") {
  constructor(options) {
    super(options);
    this.stack = `${this.name}: ${this.message}`;
  }
  /**
   * @since 1.0.0
   */
  [Respondable.symbol]() {
    return ServerResponse.empty({
      status: 404
    });
  }
  get message() {
    return `${this.request.method} ${this.request.url} not found`;
  }
}
/**
 * @since 1.0.0
 * @category error
 */
export class ResponseError extends /*#__PURE__*/TypeIdError(TypeId, "ResponseError") {
  /**
   * @since 1.0.0
   */
  [Respondable.symbol]() {
    return ServerResponse.empty({
      status: 500
    });
  }
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`;
  }
  get message() {
    const info = `${this.response.status} ${this.methodAndUrl}`;
    return this.description ? `${this.description} (${info})` : `${this.reason} error (${info})`;
  }
}
/**
 * @since 1.0.0
 * @category error
 */
export class ServeError extends /*#__PURE__*/TypeIdError(TypeId, "ServeError") {}
/**
 * @since 1.0.0
 */
export const clientAbortFiberId = internal.clientAbortFiberId;
/**
 * @since 1.0.0
 */
export const causeResponse = internal.causeResponse;
/**
 * @since 1.0.0
 */
export const causeResponseStripped = internal.causeResponseStripped;
/**
 * @since 1.0.0
 */
export const exitResponse = internal.exitResponse;
//# sourceMappingURL=HttpServerError.js.map