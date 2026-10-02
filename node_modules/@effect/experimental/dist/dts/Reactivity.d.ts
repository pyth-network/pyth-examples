/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Mailbox from "effect/Mailbox";
import type { ReadonlyRecord } from "effect/Record";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
declare const Reactivity_base: Context.TagClass<Reactivity, "@effect/experimental/Reactivity", Reactivity.Service>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class Reactivity extends Reactivity_base {
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: Effect.Effect<Reactivity.Service, never, never>;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const mutation: {
    /**
     * @since 1.0.0
     * @category accessors
     */
    (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | Reactivity>;
    /**
     * @since 1.0.0
     * @category accessors
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): Effect.Effect<A, E, R | Reactivity>;
};
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const query: {
    /**
     * @since 1.0.0
     * @category accessors
     */
    (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Reactivity>;
    /**
     * @since 1.0.0
     * @category accessors
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Reactivity>;
};
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const stream: {
    /**
     * @since 1.0.0
     * @category accessors
     */
    (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Stream.Stream<A, E, Exclude<R, Scope.Scope> | Reactivity>;
    /**
     * @since 1.0.0
     * @category accessors
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): Stream.Stream<A, E, Exclude<R, Scope.Scope> | Reactivity>;
};
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const invalidate: (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>) => Effect.Effect<void, never, Reactivity>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: Layer.Layer<Reactivity>;
/**
 * @since 1.0.0
 * @category model
 */
export declare namespace Reactivity {
    /**
     * @since 1.0.0
     * @category model
     */
    interface Service {
        readonly unsafeInvalidate: (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>) => void;
        readonly unsafeRegister: (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>, handler: () => void) => () => void;
        readonly invalidate: (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>) => Effect.Effect<void>;
        readonly mutation: <A, E, R>(keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>, effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
        readonly query: <A, E, R>(keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>, effect: Effect.Effect<A, E, R>) => Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope>;
        readonly stream: <A, E, R>(keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>, effect: Effect.Effect<A, E, R>) => Stream.Stream<A, E, Exclude<R, Scope.Scope>>;
    }
}
export {};
//# sourceMappingURL=Reactivity.d.ts.map