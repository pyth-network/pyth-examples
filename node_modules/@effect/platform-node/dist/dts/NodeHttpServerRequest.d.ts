/**
 * @since 1.0.0
 */
import type * as ServerRequest from "@effect/platform/HttpServerRequest";
import type * as Http from "node:http";
/**
 * @category conversions
 * @since 1.0.0
 */
export declare const toIncomingMessage: (self: ServerRequest.HttpServerRequest) => Http.IncomingMessage;
/**
 * @category conversions
 * @since 1.0.0
 */
export declare const toServerResponse: (self: ServerRequest.HttpServerRequest) => Http.ServerResponse;
//# sourceMappingURL=NodeHttpServerRequest.d.ts.map