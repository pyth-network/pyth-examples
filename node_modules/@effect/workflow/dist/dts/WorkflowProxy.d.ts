/**
 * @since 1.0.0
 */
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import type { NonEmptyReadonlyArray } from "effect/Array";
import * as Schema from "effect/Schema";
import type * as Workflow from "./Workflow.js";
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
export declare const toRpcGroup: <const Workflows extends NonEmptyReadonlyArray<Workflow.Any>, const Prefix extends string = "">(workflows: Workflows, options?: {
    readonly prefix?: Prefix | undefined;
}) => RpcGroup.RpcGroup<ConvertRpcs<Workflows[number], Prefix>>;
/**
 * @since 1.0.0
 */
export type ConvertRpcs<Workflows extends Workflow.Any, Prefix extends string> = Workflows extends Workflow.Workflow<infer _Name, infer _Payload, infer _Success, infer _Error> ? Rpc.Rpc<`${Prefix}${_Name}`, _Payload, _Success, _Error> | Rpc.Rpc<`${Prefix}${_Name}Discard`, _Payload> | Rpc.Rpc<`${Prefix}${_Name}Resume`, typeof ResumePayload> : never;
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
export declare const toHttpApiGroup: <const Name extends string, const Workflows extends NonEmptyReadonlyArray<Workflow.Any>>(name: Name, workflows: Workflows) => HttpApiGroup.HttpApiGroup<Name, ConvertHttpApi<Workflows[number]>>;
/**
 * @since 1.0.0
 */
export type ConvertHttpApi<Workflows extends Workflow.Any> = Workflows extends Workflow.Workflow<infer _Name, infer _Payload, infer _Success, infer _Error> ? HttpApiEndpoint.HttpApiEndpoint<_Name, "POST", never, never, _Payload["Type"], never, _Success["Type"], _Error["Type"], _Payload["Context"] | _Success["Context"], _Error["Context"]> | HttpApiEndpoint.HttpApiEndpoint<`${_Name}Discard`, "POST", never, never, _Payload["Type"], never, void, never, _Payload["Context"]> | HttpApiEndpoint.HttpApiEndpoint<`${_Name}Resume`, "POST", never, never, typeof ResumePayload.Type, never, void, never, typeof ResumePayload.Context> : never;
declare const ResumePayload: Schema.Struct<{
    executionId: typeof Schema.String;
}>;
export {};
//# sourceMappingURL=WorkflowProxy.d.ts.map