"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  layerWebSocket: true,
  layerWebSocketConstructor: true
};
exports.layerWebSocketConstructor = exports.layerWebSocket = void 0;
var Socket = _interopRequireWildcard(require("@effect/platform/Socket"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var WS = _interopRequireWildcard(require("ws"));
var _NodeSocket = require("@effect/platform-node-shared/NodeSocket");
Object.keys(_NodeSocket).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _NodeSocket[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _NodeSocket[key];
    }
  });
});
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category layers
 */
const layerWebSocket = (url, options) => Layer.scoped(Socket.Socket, Socket.makeWebSocket(url, options)).pipe(Layer.provide(layerWebSocketConstructor));
/**
 * @since 1.0.0
 * @category layers
 */
exports.layerWebSocket = layerWebSocket;
const layerWebSocketConstructor = exports.layerWebSocketConstructor = /*#__PURE__*/Layer.sync(Socket.WebSocketConstructor, () => {
  if ("WebSocket" in globalThis) {
    return (url, protocols) => new globalThis.WebSocket(url, protocols);
  }
  return (url, protocols) => new WS.WebSocket(url, protocols);
});
//# sourceMappingURL=NodeSocket.js.map