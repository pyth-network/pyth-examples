import * as KeyValueStore from "@effect/platform/KeyValueStore";
import type * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import type * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import * as PrimaryKey from "effect/PrimaryKey";
import * as Schema from "effect/Schema";
import type * as Scope from "effect/Scope";
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const ErrorTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId;
/**
 * @since 1.0.0
 * @category errors
 */
export type PersistenceError = PersistenceParseError | PersistenceBackingError;
declare const PersistenceParseError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => import("effect/Cause").YieldableError & Record<typeof ErrorTypeId, typeof ErrorTypeId> & {
    readonly _tag: "PersistenceError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class PersistenceParseError extends PersistenceParseError_base<{
    readonly reason: "ParseError";
    readonly method: string;
    readonly error: ParseResult.ParseError["issue"];
}> {
    /**
     * @since 1.0.0
     */
    static make(method: string, error: ParseResult.ParseError["issue"]): PersistenceParseError;
    get message(): string;
}
declare const PersistenceBackingError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => import("effect/Cause").YieldableError & Record<typeof ErrorTypeId, typeof ErrorTypeId> & {
    readonly _tag: "PersistenceError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class PersistenceBackingError extends PersistenceBackingError_base<{
    readonly reason: "BackingError";
    readonly method: string;
    readonly cause: unknown;
}> {
    /**
     * @since 1.0.0
     */
    static make(method: string, cause: unknown): PersistenceBackingError;
    get message(): "BackingError";
}
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const BackingPersistenceTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type BackingPersistenceTypeId = typeof BackingPersistenceTypeId;
/**
 * @since 1.0.0
 * @category models
 */
export interface BackingPersistence {
    readonly [BackingPersistenceTypeId]: BackingPersistenceTypeId;
    readonly make: (storeId: string) => Effect.Effect<BackingPersistenceStore, never, Scope.Scope>;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface BackingPersistenceStore {
    readonly get: (key: string) => Effect.Effect<Option.Option<unknown>, PersistenceError>;
    readonly getMany: (key: Array<string>) => Effect.Effect<Array<Option.Option<unknown>>, PersistenceError>;
    readonly set: (key: string, value: unknown, ttl: Option.Option<Duration.Duration>) => Effect.Effect<void, PersistenceError>;
    readonly setMany: (entries: ReadonlyArray<readonly [key: string, value: unknown, ttl: Option.Option<Duration.Duration>]>) => Effect.Effect<void, PersistenceError>;
    readonly remove: (key: string) => Effect.Effect<void, PersistenceError>;
    readonly clear: Effect.Effect<void, PersistenceError>;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const BackingPersistence: Context.Tag<BackingPersistence, BackingPersistence>;
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const ResultPersistenceTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type ResultPersistenceTypeId = typeof ResultPersistenceTypeId;
/**
 * @since 1.0.0
 * @category models
 */
export interface ResultPersistence {
    readonly [ResultPersistenceTypeId]: ResultPersistenceTypeId;
    readonly make: (options: {
        readonly storeId: string;
        readonly timeToLive?: (key: ResultPersistence.KeyAny, exit: Exit.Exit<unknown, unknown>) => Duration.DurationInput;
    }) => Effect.Effect<ResultPersistenceStore, never, Scope.Scope>;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface ResultPersistenceStore {
    readonly get: <R, IE, E, IA, A>(key: ResultPersistence.Key<R, IE, E, IA, A>) => Effect.Effect<Option.Option<Exit.Exit<A, E>>, PersistenceError, R>;
    readonly getMany: <R, IE, E, IA, A>(key: ReadonlyArray<ResultPersistence.Key<R, IE, E, IA, A>>) => Effect.Effect<Array<Option.Option<Exit.Exit<A, E>>>, PersistenceError, R>;
    readonly set: <R, IE, E, IA, A>(key: ResultPersistence.Key<R, IE, E, IA, A>, value: Exit.Exit<A, E>) => Effect.Effect<void, PersistenceError, R>;
    readonly setMany: <R, IE, E, IA, A>(entries: Iterable<readonly [ResultPersistence.Key<R, IE, E, IA, A>, Exit.Exit<A, E>]>) => Effect.Effect<void, PersistenceError, R>;
    readonly remove: <R, IE, E, IA, A>(key: ResultPersistence.Key<R, IE, E, IA, A>) => Effect.Effect<void, PersistenceError>;
    readonly clear: Effect.Effect<void, PersistenceError>;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Persistable<A extends Schema.Schema.Any, E extends Schema.Schema.All> extends Schema.WithResult<A["Type"], A["Encoded"], E["Type"], E["Encoded"], A["Context"] | E["Context"]>, PrimaryKey.PrimaryKey {
}
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace ResultPersistence {
    /**
     * @since 1.0.0
     * @category models
     */
    interface Key<R, IE, E, IA, A> extends Schema.WithResult<A, IA, E, IE, R>, PrimaryKey.PrimaryKey {
    }
    /**
     * @since 1.0.0
     * @category models
     */
    type KeyAny = Persistable<any, any>;
    /**
     * @since 1.0.0
     * @category models
     */
    type TimeToLiveArgs<A> = A extends infer K ? K extends Persistable<infer _A, infer _E> ? [request: K, exit: Exit.Exit<_A["Type"], _E["Type"]>] : never : never;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const ResultPersistence: Context.Tag<ResultPersistence, ResultPersistence>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerResult: Layer.Layer<ResultPersistence, never, BackingPersistence>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerMemory: Layer.Layer<BackingPersistence>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerKeyValueStore: Layer.Layer<BackingPersistence, never, KeyValueStore.KeyValueStore>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerResultMemory: Layer.Layer<ResultPersistence>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerResultKeyValueStore: Layer.Layer<ResultPersistence, never, KeyValueStore.KeyValueStore>;
/**
 * @since 1.0.0
 */
export declare const unsafeTtlToExpires: (clock: Clock.Clock, ttl: Option.Option<Duration.Duration>) => number | null;
export {};
//# sourceMappingURL=Persistence.d.ts.map