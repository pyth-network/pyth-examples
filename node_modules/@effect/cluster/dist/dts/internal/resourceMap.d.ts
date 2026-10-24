import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as MutableHashMap from "effect/MutableHashMap";
import * as MutableRef from "effect/MutableRef";
import * as Scope from "effect/Scope";
export declare class ResourceMap<K, A, E> {
    readonly lookup: (key: K, scope: Scope.Scope) => Effect.Effect<A, E>;
    readonly entries: MutableHashMap.MutableHashMap<K, {
        readonly scope: Scope.CloseableScope;
        readonly deferred: Deferred.Deferred<A, E>;
    }>;
    readonly isClosed: MutableRef.MutableRef<boolean>;
    constructor(lookup: (key: K, scope: Scope.Scope) => Effect.Effect<A, E>, entries: MutableHashMap.MutableHashMap<K, {
        readonly scope: Scope.CloseableScope;
        readonly deferred: Deferred.Deferred<A, E>;
    }>, isClosed: MutableRef.MutableRef<boolean>);
    static make: <K_1, A_1, E_1, R>(lookup: (key: K_1) => Effect.Effect<A_1, E_1, R>) => Effect.Effect<ResourceMap<K_1, A_1, E_1>, never, Scope.Scope | R>;
    get(key: K): Effect.Effect<A, E>;
    remove(key: K): Effect.Effect<void>;
    removeIgnore(key: K): Effect.Effect<void>;
}
//# sourceMappingURL=resourceMap.d.ts.map