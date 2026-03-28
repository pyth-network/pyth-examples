/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { Scope } from "effect/Scope";
import { Sharding } from "./Sharding.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <E, R>(name: string, run: Effect.Effect<void, E, R>, options?: {
    readonly shardGroup?: string | undefined;
}) => Layer.Layer<never, never, Sharding | Exclude<R, Scope>>;
//# sourceMappingURL=Singleton.d.ts.map