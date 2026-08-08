/**
 * @since 1.0.0
 */
import type * as HttpApi from "@effect/platform/HttpApi";
import type { ApiGroup, HttpApiGroup } from "@effect/platform/HttpApiGroup";
import type * as Rpc from "@effect/rpc/Rpc";
import * as Layer from "effect/Layer";
import type * as Entity from "./Entity.js";
import type { Sharding } from "./Sharding.js";
/**
 * @since 1.0.0
 * @category Layers
 */
export declare const layerHttpApi: <ApiId extends string, Groups extends HttpApiGroup.Any, ApiE, ApiR, Name extends HttpApiGroup.Name<Groups>, Type extends string, Rpcs extends Rpc.Any>(api: HttpApi.HttpApi<ApiId, Groups, ApiE, ApiR>, name: Name, entity: Entity.Entity<Type, Rpcs>) => Layer.Layer<ApiGroup<ApiId, Name>, never, Sharding | Rpc.Context<Rpcs>>;
/**
 * @since 1.0.0
 * @category Layers
 */
export declare const layerRpcHandlers: <const Type extends string, Rpcs extends Rpc.Any>(entity: Entity.Entity<Type, Rpcs>) => Layer.Layer<RpcHandlers<Rpcs, Type>, never, Sharding | Rpc.Context<Rpcs>>;
/**
 * @since 1.0.0
 */
export type RpcHandlers<Rpcs extends Rpc.Any, Prefix extends string> = Rpcs extends Rpc.Rpc<infer _Tag, infer _Payload, infer _Success, infer _Error, infer _Middleware> ? Rpc.Handler<`${Prefix}.${_Tag}`> | Rpc.Handler<`${Prefix}.${_Tag}Discard`> : never;
//# sourceMappingURL=EntityProxyServer.d.ts.map