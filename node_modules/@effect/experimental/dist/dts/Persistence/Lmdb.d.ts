import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Lmdb from "lmdb";
import * as Persistence from "../Persistence.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: (options: Lmdb.RootDatabaseOptionsWithPath) => Effect.Effect<Persistence.BackingPersistence, never, import("effect/Scope").Scope>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: (options: Lmdb.RootDatabaseOptionsWithPath) => Layer.Layer<Persistence.BackingPersistence>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerResult: (options: Lmdb.RootDatabaseOptionsWithPath) => Layer.Layer<Persistence.ResultPersistence>;
//# sourceMappingURL=Lmdb.d.ts.map