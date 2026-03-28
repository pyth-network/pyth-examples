"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withLogAddress = exports.serveEffect = exports.serve = exports.make = exports.logAddress = exports.layerTestClient = exports.layerContext = exports.formatAddress = exports.addressWith = exports.addressFormattedWith = exports.TypeId = exports.HttpServer = void 0;
var internal = _interopRequireWildcard(require("./internal/httpServer.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category constructors
 */
const HttpServer = exports.HttpServer = internal.serverTag;
/**
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = internal.make;
/**
 * @since 1.0.0
 * @category accessors
 */
const serve = exports.serve = internal.serve;
/**
 * @since 1.0.0
 * @category accessors
 */
const serveEffect = exports.serveEffect = internal.serveEffect;
/**
 * @since 1.0.0
 * @category address
 */
const formatAddress = exports.formatAddress = internal.formatAddress;
/**
 * @since 1.0.0
 * @category address
 */
const addressWith = exports.addressWith = internal.addressWith;
/**
 * @since 1.0.0
 * @category address
 */
const addressFormattedWith = exports.addressFormattedWith = internal.addressFormattedWith;
/**
 * @since 1.0.0
 * @category address
 */
const logAddress = exports.logAddress = internal.logAddress;
/**
 * @since 1.0.0
 * @category address
 */
const withLogAddress = exports.withLogAddress = internal.withLogAddress;
/**
 * Layer producing an `HttpClient` with prepended url of the running http server.
 *
 * @since 1.0.0
 * @category layers
 */
const layerTestClient = exports.layerTestClient = internal.layerTestClient;
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
const layerContext = exports.layerContext = internal.layerContext;
//# sourceMappingURL=HttpServer.js.map