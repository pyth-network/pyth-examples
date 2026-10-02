import * as Effect from "effect/Effect";
import * as MutableRef from "effect/MutableRef";
import * as Option from "effect/Option";
import * as Scope from "effect/Scope";
export type State<A> = {
    readonly _tag: "Closed";
} | {
    readonly _tag: "Acquiring";
    readonly scope: Scope.CloseableScope;
} | {
    readonly _tag: "Acquired";
    readonly scope: Scope.CloseableScope;
    readonly value: A;
};
export declare class ResourceRef<A, E = never> {
    readonly state: MutableRef.MutableRef<State<A>>;
    readonly acquire: (scope: Scope.Scope) => Effect.Effect<A, E>;
    static from: <A_1, E_1>(parentScope: Scope.Scope, acquire: (scope: Scope.Scope) => Effect.Effect<A_1, E_1>) => Effect.Effect<ResourceRef<A_1, E_1>, E_1, never>;
    constructor(state: MutableRef.MutableRef<State<A>>, acquire: (scope: Scope.Scope) => Effect.Effect<A, E>);
    latch: Effect.Latch;
    unsafeGet(): Option.Option<A>;
    unsafeRebuild(): Effect.Effect<void, E>;
    await: Effect.Effect<A>;
}
//# sourceMappingURL=resourceRef.d.ts.map