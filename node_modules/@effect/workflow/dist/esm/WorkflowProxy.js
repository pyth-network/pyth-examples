/**
 * @since 1.0.0
 */
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";
/**
 * Derives an `RpcGroup` from a list of workflows.
 *
 * ```ts
 * import { RpcServer } from "@effect/rpc"
 * import { Workflow, WorkflowProxy, WorkflowProxyServer } from "@effect/workflow"
 * import { Layer, Schema } from "effect"
 *
 * const EmailWorkflow = Workflow.make({
 *   name: "EmailWorkflow",
 *   payload: {
 *     id: Schema.String,
 *     to: Schema.String
 *   },
 *   idempotencyKey: ({ id }) => id
 * })
 *
 * const myWorkflows = [EmailWorkflow] as const
 *
 * // Use WorkflowProxy.toRpcGroup to create a `RpcGroup` from the
 * // workflows
 * class MyRpcs extends WorkflowProxy.toRpcGroup(myWorkflows) {}
 *
 * // Use WorkflowProxyServer.layerRpcHandlers to create a layer that implements
 * // the rpc handlers
 * const ApiLayer = RpcServer.layer(MyRpcs).pipe(
 *   Layer.provide(WorkflowProxyServer.layerRpcHandlers(myWorkflows))
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toRpcGroup = (workflows, options) => {
  const prefix = options?.prefix ?? "";
  const rpcs = [];
  for (const workflow of workflows) {
    rpcs.push(Rpc.make(`${prefix}${workflow.name}`, {
      payload: workflow.payloadSchema,
      error: workflow.errorSchema,
      success: workflow.successSchema
    }).annotateContext(workflow.annotations), Rpc.make(`${prefix}${workflow.name}Discard`, {
      payload: workflow.payloadSchema
    }).annotateContext(workflow.annotations), Rpc.make(`${prefix}${workflow.name}Resume`, {
      payload: ResumePayload
    }).annotateContext(workflow.annotations));
  }
  return RpcGroup.make(...rpcs);
};
/**
 * Derives an `HttpApiGroup` from a list of workflows.
 *
 * ```ts
 * import { HttpApi, HttpApiBuilder } from "@effect/platform"
 * import { Workflow, WorkflowProxy, WorkflowProxyServer } from "@effect/workflow"
 * import { Layer, Schema } from "effect"
 *
 * const EmailWorkflow = Workflow.make({
 *   name: "EmailWorkflow",
 *   payload: {
 *     id: Schema.String,
 *     to: Schema.String
 *   },
 *   idempotencyKey: ({ id }) => id
 * })
 *
 * const myWorkflows = [EmailWorkflow] as const
 *
 * // Use WorkflowProxy.toHttpApiGroup to create a `HttpApiGroup` from the
 * // workflows
 * class MyApi extends HttpApi.make("api")
 *   .add(WorkflowProxy.toHttpApiGroup("workflows", myWorkflows))
 * {}
 *
 * // Use WorkflowProxyServer.layerHttpApi to create a layer that implements the
 * // workflows HttpApiGroup
 * const ApiLayer = HttpApiBuilder.api(MyApi).pipe(
 *   Layer.provide(WorkflowProxyServer.layerHttpApi(MyApi, "workflows", myWorkflows))
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toHttpApiGroup = (name, workflows) => {
  let group = HttpApiGroup.make(name);
  for (const workflow of workflows) {
    const path = `/${tagToPath(workflow.name)}`;
    group = group.add(HttpApiEndpoint.post(workflow.name, path).setPayload(workflow.payloadSchema).addSuccess(workflow.successSchema).addError(workflow.errorSchema).annotateContext(workflow.annotations)).add(HttpApiEndpoint.post(workflow.name + "Discard", `${path}/discard`).setPayload(workflow.payloadSchema).annotateContext(workflow.annotations)).add(HttpApiEndpoint.post(workflow.name + "Resume", `${path}/resume`).setPayload(ResumePayload).annotateContext(workflow.annotations));
  }
  return group;
};
const tagToPath = tag => tag.replace(/[^a-zA-Z0-9]+/g, "-") // Replace non-alphanumeric characters with hyphen
.replace(/([a-z])([A-Z])/g, "$1-$2") // Insert hyphen before uppercase letters
.toLowerCase();
const ResumePayload = /*#__PURE__*/Schema.Struct({
  executionId: Schema.String
});
//# sourceMappingURL=WorkflowProxy.js.map