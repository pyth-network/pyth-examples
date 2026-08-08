import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpApi = (api, name, workflows) => HttpApiBuilder.group(api, name, Effect.fnUntraced(function* (handlers_) {
  let handlers = handlers_;
  for (const workflow_ of workflows) {
    const workflow = workflow_;
    handlers = handlers.handle(workflow.name, ({
      payload
    }) => workflow.execute(payload).pipe(Effect.tapDefect(Effect.logError), Effect.annotateLogs({
      module: "WorkflowProxyServer",
      method: workflow.name
    }))).handle(workflow.name + "Discard", ({
      payload
    }) => workflow.execute(payload, {
      discard: true
    }).pipe(Effect.tapDefect(Effect.logError), Effect.annotateLogs({
      module: "WorkflowProxyServer",
      method: workflow.name + "Discard"
    }))).handle(workflow.name + "Resume", ({
      payload
    }) => workflow.resume(payload.executionId).pipe(Effect.tapDefect(Effect.logError), Effect.annotateLogs({
      module: "WorkflowProxyServer",
      method: workflow.name + "Resume"
    })));
  }
  return handlers;
}));
/**
 * @since 1.0.0
 * @category Layers
 */
export const layerRpcHandlers = (workflows, options) => Layer.effectContext(Effect.gen(function* () {
  const context = yield* Effect.context();
  const prefix = options?.prefix ?? "";
  const handlers = new Map();
  for (const workflow_ of workflows) {
    const workflow = workflow_;
    const tag = `${prefix}${workflow.name}`;
    const tagDiscard = `${tag}Discard`;
    const tagResume = `${tag}Resume`;
    const key = `@effect/rpc/Rpc/${tag}`;
    const keyDiscard = `${key}Discard`;
    const keyResume = `${key}Resume`;
    handlers.set(key, {
      context,
      tag,
      handler: payload => workflow.execute(payload)
    });
    handlers.set(keyDiscard, {
      context,
      tag: tagDiscard,
      handler: payload => workflow.execute(payload, {
        discard: true
      })
    });
    handlers.set(keyResume, {
      context,
      tag: tagResume,
      handler: payload => workflow.resume(payload.executionId)
    });
  }
  return Context.unsafeMake(handlers);
}));
//# sourceMappingURL=WorkflowProxyServer.js.map