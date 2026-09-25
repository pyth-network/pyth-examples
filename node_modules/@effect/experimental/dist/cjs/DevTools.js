"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerWebSocket = exports.layerSocket = exports.layer = void 0;
var Socket = _interopRequireWildcard(require("@effect/platform/Socket"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Client = _interopRequireWildcard(require("./DevTools/Client.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category layers
 */
const layerSocket = exports.layerSocket = Client.layerTracer;
/**
 * @since 1.0.0
 * @category layers
 */
const layerWebSocket = (url = "ws://localhost:34437") => Client.layerTracer.pipe(Layer.provide(Socket.layerWebSocket(url)));
/**
 * @since 1.0.0
 * @category layers
 */
exports.layerWebSocket = layerWebSocket;
const layer = (url = "ws://localhost:34437") => layerWebSocket(url).pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal));
exports.layer = layer;
//# sourceMappingURL=DevTools.js.map