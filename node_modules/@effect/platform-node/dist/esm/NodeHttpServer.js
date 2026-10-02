import * as internal from "./internal/httpServer.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make;
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeHandler = internal.makeHandler;
/**
 * @since 1.0.0
 * @category layers
 */
export const layerServer = internal.layerServer;
/**
 * @since 1.0.0
 * @category layers
 */
export const layer = internal.layer;
/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig = internal.layerConfig;
/**
 * Layer starting a server on a random port and producing an `HttpClient`
 * with prepended url of the running http server.
 *
 * **Example**
 *
 * ```ts
 * import * as assert from "node:assert"
 * import { HttpClient, HttpRouter, HttpServer } from "@effect/platform"
 * import { NodeHttpServer } from "@effect/platform-node"
 * import { Effect } from "effect"
 *
 * Effect.gen(function*() {
 *   yield* HttpServer.serveEffect(HttpRouter.empty)
 *   const response = yield* HttpClient.get("/")
 *   assert.strictEqual(response.status, 404)
 * }).pipe(Effect.provide(NodeHttpServer.layerTest))
 * ```
 *
 * @since 1.0.0
 * @category layers
 */
export const layerTest = internal.layerTest;
/**
 * A Layer providing the `HttpPlatform`, `FileSystem`, `Etag.Generator`, and `Path`
 * services.
 *
 * The `FileSystem` service is a no-op implementation, so this layer is only
 * useful for platforms that have no file system.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerContext = internal.layerContext;
//# sourceMappingURL=NodeHttpServer.js.map