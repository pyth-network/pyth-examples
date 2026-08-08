"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeClient = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var RpcClient = _interopRequireWildcard(require("./RpcClient.js"));
var RpcServer = _interopRequireWildcard(require("./RpcServer.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category constructors
 */
const makeClient = exports.makeClient = /*#__PURE__*/Effect.fnUntraced(function* (group, options) {
  // eslint-disable-next-line prefer-const
  let client;
  const server = yield* RpcServer.makeNoSerialization(group, {
    onFromServer(response) {
      return client.write(response);
    }
  });
  client = yield* RpcClient.makeNoSerialization(group, {
    supportsAck: true,
    flatten: options?.flatten,
    onFromClient({
      message
    }) {
      return server.write(0, message);
    }
  });
  return client.client;
});
//# sourceMappingURL=RpcTest.js.map