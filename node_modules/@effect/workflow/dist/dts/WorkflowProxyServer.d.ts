/**
 * @since 1.0.0
 */
import type * as HttpApi from "@effect/platform/HttpApi";
import type { ApiGroup, HttpApiGroup } from "@effect/platform/HttpApiGroup";
import type * as Rpc from "@effect/rpc/Rpc";
import type { NonEmptyReadonlyArray } from "effect/Array";
import * as Layer from "effect/Layer";
import type * as Workflow from "./Workflow.js";
import type { WorkflowEngine } from "./WorkflowEngine.js";
/**
 * @since 1.0.0
 * @category Layers
 */
export declare const layerHttpApi: <ApiId extends string, Groups extends HttpApiGroup.Any, ApiE, ApiR, Name extends HttpApiGroup.Name<Groups>, const Workflows extends NonEmptyReadonlyArray<Workflow.Any>>(api: HttpApi.HttpApi<ApiId, Groups, ApiE, ApiR>, name: Name, workflows: Workflows) => Layer.Layer<ApiGroup<ApiId, Name>, never, WorkflowEngine | Workflow.Requirements<Workflows[number]>>;
/**
 * @since 1.0.0
 * @category Layers
 */
export declare const layerRpcHandlers: <const Workflows extends NonEmptyReadonlyArray<Workflow.Any>, const Prefix extends string = "">(workflows: Workflows, options?: {
    readonly prefix?: Prefix;
}) => Layer.Layer<RpcHandlers<Workflows[number], Prefix>, never, WorkflowEngine | Workflow.Requirements<Workflows[number]>>;
/**
 * @since 1.0.0
 */
export type RpcHandlers<Workflows extends Workflow.Any, Prefix extends string> = Workflows extends Workflow.Workflow<infer _Name, infer _Payload, infer _Success, infer _Error> ? Rpc.Handler<`${Prefix}${_Name}`> | Rpc.Handler<`${Prefix}${_Name}Discard`> | Rpc.Handler<`${Prefix}${_Name}Resume`> : never;
//# sourceMappingURL=WorkflowProxyServer.d.ts.map