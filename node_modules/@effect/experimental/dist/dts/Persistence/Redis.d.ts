import * as Config from "effect/Config";
import type { ConfigError } from "effect/ConfigError";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { RedisOptions } from "ioredis";
import * as Persistence from "../Persistence.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: (options: RedisOptions) => Effect.Effect<Persistence.BackingPersistence, never, import("effect/Scope").Scope>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: (options: RedisOptions) => Layer.Layer<Persistence.BackingPersistence>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerConfig: (options: Config.Config.Wrap<RedisOptions>) => Layer.Layer<Persistence.BackingPersistence, ConfigError>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerResult: (options: RedisOptions) => Layer.Layer<Persistence.ResultPersistence>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerResultConfig: (options: Config.Config.Wrap<RedisOptions>) => Layer.Layer<Persistence.ResultPersistence, ConfigError>;
//# sourceMappingURL=Redis.d.ts.map