import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpApi = (api, name, entity) => HttpApiBuilder.group(api, name, Effect.fnUntraced(function* (handlers_) {
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
export const layerRpcHandlers = entity => Layer.effectContext(Effect.gen(function* () {
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
//# sourceMappingURL=EntityProxyServer.js.map