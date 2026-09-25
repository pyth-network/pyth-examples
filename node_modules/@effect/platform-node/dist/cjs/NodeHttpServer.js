"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeHandler = exports.make = exports.layerTest = exports.layerServer = exports.layerContext = exports.layerConfig = exports.layer = void 0;
var internal = _interopRequireWildcard(require("./internal/httpServer.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = internal.make;
/**
 * @since 1.0.0
 * @category constructors
 */
const makeHandler = exports.makeHandler = internal.makeHandler;
/**
 * @since 1.0.0
 * @category layers
 */
const layerServer = exports.layerServer = internal.layerServer;
/**
 * @since 1.0.0
 * @category layers
 */
const layer = exports.layer = internal.layer;
/**
 * @since 1.0.0
 * @category layers
 */
const layerConfig = exports.layerConfig = internal.layerConfig;
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
const layerTest = exports.layerTest = internal.layerTest;
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
//# sourceMappingURL=NodeHttpServer.js.map