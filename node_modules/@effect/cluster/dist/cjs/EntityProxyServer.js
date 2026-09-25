"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerRpcHandlers = exports.layerHttpApi = void 0;
var HttpApiBuilder = _interopRequireWildcard(require("@effect/platform/HttpApiBuilder"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category Layers
 */
const layerHttpApi = (api, name, entity) => HttpApiBuilder.group(api, name, Effect.fnUntraced(function* (handlers_) {
  const client = yield* entity.client;
  let handlers = handlers_;
  for (const parentRpc_ of entity.protocol.requests.values()) {
    const parentRpc = parentRpc_;
    handlers = handlers.handle(parentRpc._tag, ({
      path,
      payload
    }) => client(path.entityId)[parentRpc._tag](payload).pipe(Effect.tapDefect(Effect.logError), Effect.annotateLogs({
      module: "EntityProxyServer",
      entity: entity.type,
      entityId: path.entityId,
      method: parentRpc._tag
    }))).handle(`${parentRpc._tag}Discard`, ({
      path,
      payload
    }) => client(path.entityId)[parentRpc._tag](payload, {
      discard: true
    }).pipe(Effect.tapDefect(Effect.logError), Effect.annotateLogs({
      module: "EntityProxyServer",
      entity: entity.type,
      entityId: path.entityId,
      method: `${parentRpc._tag}Discard`
    })));
  }
  return handlers;
}));
/**
 * @since 1.0.0
 * @category Layers
 */
exports.layerHttpApi = layerHttpApi;
const layerRpcHandlers = entity => Layer.effectContext(Effect.gen(function* () {
  const context = yield* Effect.context();
  const client = yield* entity.client;
  const handlers = new Map();
  for (const parentRpc_ of entity.protocol.requests.values()) {
    const parentRpc = parentRpc_;
    const tag = `${entity.type}.${parentRpc._tag}`;
    const key = `@effect/rpc/Rpc/${tag}`;
    handlers.set(key, {
      context,
      tag,
      handler: ({
        entityId,
        payload
      }) => client(entityId)[parentRpc._tag](payload)
    });
    handlers.set(`${key}Discard`, {
      context,
      tag,
      handler: ({
        entityId,
        payload
      }) => client(entityId)[parentRpc._tag](payload, {
        discard: true
      })
    });
  }
  return Context.unsafeMake(handlers);
}));
exports.layerRpcHandlers = layerRpcHandlers;
//# sourceMappingURL=EntityProxyServer.js.map