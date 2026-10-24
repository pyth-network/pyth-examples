/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { LazyArg } from "effect/Function";
import type * as Layer from "effect/Layer";
import type * as Option from "effect/Option";
import type * as ParseResult from "effect/ParseResult";
import type * as Schema from "effect/Schema";
import type * as PlatformError from "./Error.js";
import type * as FileSystem from "./FileSystem.js";
import type * as Path from "./Path.js";
/**
 * @since 1.0.0
 * @category type id
 */
export declare const TypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId;
/**
 * @since 1.0.0
 * @category models
 */
export interface KeyValueStore {
    readonly [TypeId]: TypeId;
    /**
     * Returns the value of the specified key if it exists.
     */
    readonly get: (key: string) => Effect.Effect<Option.Option<string>, PlatformError.PlatformError>;
    /**
     * Returns the value of the specified key if it exists.
     */
    readonly getUint8Array: (key: string) => Effect.Effect<Option.Option<Uint8Array>, PlatformError.PlatformError>;
    /**
     * Sets the value of the specified key.
     */
    readonly set: (key: string, value: string | Uint8Array) => Effect.Effect<void, PlatformError.PlatformError>;
    /**
     * Removes the specified key.
     */
    readonly remove: (key: string) => Effect.Effect<void, PlatformError.PlatformError>;
    /**
     * Removes all entries.
     */
    readonly clear: Effect.Effect<void, PlatformError.PlatformError>;
    /**
     * Returns the number of entries.
     */
    readonly size: Effect.Effect<number, PlatformError.PlatformError>;
    /**
     * Updates the value of the specified key if it exists.
     */
    readonly modify: (key: string, f: (value: string) => string) => Effect.Effect<Option.Option<string>, PlatformError.PlatformError>;
    /**
     * Updates the value of the specified key if it exists.
     */
    readonly modifyUint8Array: (key: string, f: (value: Uint8Array) => Uint8Array) => Effect.Effect<Option.Option<Uint8Array>, PlatformError.PlatformError>;
    /**
     * Returns true if the KeyValueStore contains the specified key.
     */
    readonly has: (key: string) => Effect.Effect<boolean, PlatformError.PlatformError>;
    /**
     * Checks if the KeyValueStore contains any entries.
     */
    readonly isEmpty: Effect.Effect<boolean, PlatformError.PlatformError>;
    /**
     * Create a SchemaStore for the specified schema.
     */
    readonly forSchema: <A, I, R>(schema: Schema.Schema<A, I, R>) => SchemaStore<A, R>;
}
/**
 * @since 1.0.0
 */
export declare namespace KeyValueStore {
    /**
     * @since 1.0.0
     */
    type AnyStore = KeyValueStore | SchemaStore<any, any>;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const KeyValueStore: Context.Tag<KeyValueStore, KeyValueStore>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: (impl: Omit<KeyValueStore, typeof TypeId | "has" | "modify" | "modifyUint8Array" | "isEmpty" | "forSchema"> & Partial<KeyValueStore>) => KeyValueStore;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeStringOnly: (impl: Pick<KeyValueStore, "get" | "remove" | "clear" | "size"> & Partial<Omit<KeyValueStore, "set">> & {
    readonly set: (key: string, value: string) => Effect.Effect<void, PlatformError.PlatformError>;
}) => KeyValueStore;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const prefix: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (prefix: string): <S extends KeyValueStore.AnyStore>(self: S) => S;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <S extends KeyValueStore.AnyStore>(self: S, prefix: string): S;
};
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerMemory: Layer.Layer<KeyValueStore>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerFileSystem: (directory: string) => Layer.Layer<KeyValueStore, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path>;
/**
 * @since 1.0.0
 * @category type id
 */
export declare const SchemaStoreTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type id
 */
export type SchemaStoreTypeId = typeof SchemaStoreTypeId;
/**
 * @since 1.0.0
 * @category models
 */
export interface SchemaStore<A, R> {
    readonly [SchemaStoreTypeId]: SchemaStoreTypeId;
    /**
     * Returns the value of the specified key if it exists.
     */
    readonly get: (key: string) => Effect.Effect<Option.Option<A>, PlatformError.PlatformError | ParseResult.ParseError, R>;
    /**
     * Sets the value of the specified key.
     */
    readonly set: (key: string, value: A) => Effect.Effect<void, PlatformError.PlatformError | ParseResult.ParseError, R>;
    /**
     * Removes the specified key.
     */
    readonly remove: (key: string) => Effect.Effect<void, PlatformError.PlatformError>;
    /**
     * Removes all entries.
     */
    readonly clear: Effect.Effect<void, PlatformError.PlatformError>;
    /**
     * Returns the number of entries.
     */
    readonly size: Effect.Effect<number, PlatformError.PlatformError>;
    /**
     * Updates the value of the specified key if it exists.
     */
    readonly modify: (key: string, f: (value: A) => A) => Effect.Effect<Option.Option<A>, PlatformError.PlatformError | ParseResult.ParseError, R>;
    /**
     * Returns true if the KeyValueStore contains the specified key.
     */
    readonly has: (key: string) => Effect.Effect<boolean, PlatformError.PlatformError>;
    /**
     * Checks if the KeyValueStore contains any entries.
     */
    readonly isEmpty: Effect.Effect<boolean, PlatformError.PlatformError>;
}
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerSchema: <A, I, R>(schema: Schema.Schema<A, I, R>, tagIdentifier: string) => {
    readonly tag: Context.Tag<SchemaStore<A, R>, SchemaStore<A, R>>;
    readonly layer: Layer.Layer<SchemaStore<A, R>, never, KeyValueStore>;
};
/**
 * Creates an KeyValueStorage from an instance of the `Storage` api.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
 *
 * @since 1.0.0
 * @category layers
 */
export declare const layerStorage: (evaluate: LazyArg<Storage>) => Layer.Layer<KeyValueStore>;
//# sourceMappingURL=KeyValueStore.d.ts.map