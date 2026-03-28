import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import type * as Scope from "effect/Scope";
import * as Persistence from "./Persistence.js";
/**
 * @since 1.0.0
 * @category models
 */
export interface PersistedCache<K extends Persistence.ResultPersistence.KeyAny> {
    readonly get: (key: K) => Effect.Effect<Schema.WithResult.Success<K>, Schema.WithResult.Failure<K> | Persistence.PersistenceError>;
    readonly invalidate: (key: K) => Effect.Effect<void, Persistence.PersistenceError>;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <K extends Persistence.ResultPersistence.KeyAny, R>(options: {
    readonly storeId: string;
    readonly lookup: (key: K) => Effect.Effect<Schema.WithResult.Success<K>, Schema.WithResult.Failure<K>, R>;
    readonly timeToLive: (...args: Persistence.ResultPersistence.TimeToLiveArgs<K>) => Duration.DurationInput;
    readonly inMemoryCapacity?: number | undefined;
    readonly inMemoryTTL?: Duration.DurationInput | undefined;
}) => Effect.Effect<PersistedCache<K>, never, Schema.SerializableWithResult.Context<K> | R | Persistence.ResultPersistence | Scope.Scope>;
//# sourceMappingURL=PersistedCache.d.ts.map