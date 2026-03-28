/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import type * as Rpc from "./Rpc.js";
import * as RpcClient from "./RpcClient.js";
import type * as RpcGroup from "./RpcGroup.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeClient: <Rpcs extends Rpc.Any, const Flatten extends boolean = false>(group: RpcGroup.RpcGroup<Rpcs>, options?: {
    flatten?: Flatten | undefined;
}) => Effect.Effect<Flatten extends true ? RpcClient.RpcClient.Flat<Rpcs> : RpcClient.RpcClient<Rpcs>, never, Scope.Scope | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.MiddlewareClient<Rpcs>>;
//# sourceMappingURL=RpcTest.d.ts.map