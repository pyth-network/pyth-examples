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
const layerHttpApi = (api, name, workflows) => HttpApiBuilder.group(api, name, Effect.fnUntraced(function* (handlers_) {
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
exports.layerHttpApi = layerHttpApi;
const layerRpcHandlers = (workflows, options) => Layer.effectContext(Effect.gen(function* () {
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
exports.layerRpcHandlers = layerRpcHandlers;
//# sourceMappingURL=WorkflowProxyServer.js.map