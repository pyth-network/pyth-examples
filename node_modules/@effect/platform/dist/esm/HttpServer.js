import * as internal from "./internal/httpServer.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category constructors
 */
export const HttpServer = internal.serverTag;
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make;
/**
 * @since 1.0.0
 * @category accessors
 */
export const serve = internal.serve;
/**
 * @since 1.0.0
 * @category accessors
 */
export const serveEffect = internal.serveEffect;
/**
 * @since 1.0.0
 * @category address
 */
export const formatAddress = internal.formatAddress;
/**
 * @since 1.0.0
 * @category address
 */
export const addressWith = internal.addressWith;
/**
 * @since 1.0.0
 * @category address
 */
export const addressFormattedWith = internal.addressFormattedWith;
/**
 * @since 1.0.0
 * @category address
 */
export const logAddress = internal.logAddress;
/**
 * @since 1.0.0
 * @category address
 */
export const withLogAddress = internal.withLogAddress;
/**
 * Layer producing an `HttpClient` with prepended url of the running http server.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerTestClient = internal.layerTestClient;
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
//# sourceMappingURL=HttpServer.js.map