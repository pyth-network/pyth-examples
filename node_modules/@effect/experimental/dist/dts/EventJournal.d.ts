/**
 * @since 1.0.0
 */
import * as MsgPack from "@effect/platform/MsgPack";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import type { Scope } from "effect/Scope";
declare const EventJournal_base: Context.TagClass<EventJournal, "@effect/experimental/EventJournal", {
    /**
     * Read all the entries in the journal.
     */
    readonly entries: Effect.Effect<ReadonlyArray<Entry>, EventJournalError>;
    /**
     * Write an event to the journal, performing an effect before committing the
     * event.
     */
    readonly write: <A, E, R>(options: {
        readonly event: string;
        readonly primaryKey: string;
        readonly payload: Uint8Array;
        readonly effect: (entry: Entry) => Effect.Effect<A, E, R>;
    }) => Effect.Effect<A, EventJournalError | E, R>;
    /**
     * Write events from a remote source to the journal.
     */
    readonly writeFromRemote: (options: {
        readonly remoteId: RemoteId;
        readonly entries: ReadonlyArray<RemoteEntry>;
        readonly compact?: ((uncommitted: ReadonlyArray<RemoteEntry>) => Effect.Effect<ReadonlyArray<[compacted: ReadonlyArray<Entry>, remoteEntries: ReadonlyArray<RemoteEntry>]>, EventJournalError>) | undefined;
        readonly effect: (options: {
            readonly entry: Entry;
            readonly conflicts: ReadonlyArray<Entry>;
        }) => Effect.Effect<void, EventJournalError>;
    }) => Effect.Effect<void, EventJournalError>;
    /**
     * Return the uncommitted entries for a remote source.
     */
    readonly withRemoteUncommited: <A, E, R>(remoteId: RemoteId, f: (entries: ReadonlyArray<Entry>) => Effect.Effect<A, E, R>) => Effect.Effect<A, EventJournalError | E, R>;
    /**
     * Retrieve the last known sequence number for a remote source.
     */
    readonly nextRemoteSequence: (remoteId: RemoteId) => Effect.Effect<number, EventJournalError>;
    /**
     * The entries added to the local journal.
     */
    readonly changes: Effect.Effect<Queue.Dequeue<Entry>, never, Scope>;
    /**
     * Remove all data
     */
    readonly destroy: Effect.Effect<void, EventJournalError>;
}>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class EventJournal extends EventJournal_base {
}
/**
 * @since 1.0.0
 * @category errors
 */
export declare const ErrorTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category errors
 */
export type ErrorTypeId = typeof ErrorTypeId;
declare const EventJournalError_base: Schema.TaggedClass<EventJournalError, "EventJournalError", {
    readonly _tag: Schema.tag<"EventJournalError">;
} & {
    method: typeof Schema.String;
    cause: typeof Schema.Defect;
}>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class EventJournalError extends EventJournalError_base {
    /**
     * @since 1.0.0
     */
    readonly [ErrorTypeId]: ErrorTypeId;
}
/**
 * @since 1.0.0
 * @category remote
 */
export declare const RemoteIdTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category remote
 */
export declare const RemoteId: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof RemoteIdTypeId>;
/**
 * @since 1.0.0
 * @category remote
 */
export type RemoteId = typeof RemoteId.Type;
/**
 * @since 1.0.0
 * @category remote
 */
export declare const makeRemoteId: () => RemoteId;
/**
 * @since 1.0.0
 * @category entry
 */
export declare const EntryIdTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category entry
 */
export declare const EntryId: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof EntryIdTypeId>;
/**
 * @since 1.0.0
 * @category entry
 */
export type EntryId = typeof EntryId.Type;
/**
 * @since 1.0.0
 * @category entry
 */
export declare const makeEntryId: (options?: {
    msecs?: number;
}) => EntryId;
/**
 * @since 1.0.0
 * @category entry
 */
export declare const entryIdMillis: (entryId: EntryId) => number;
declare const Entry_base: Schema.Class<Entry, {
    id: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof EntryIdTypeId>;
    event: typeof Schema.String;
    primaryKey: typeof Schema.String;
    payload: typeof Schema.Uint8ArrayFromSelf;
}, Schema.Struct.Encoded<{
    id: Schema.brand<typeof Schema.Uint8ArrayFromSelf, typeof EntryIdTypeId>;
    event: typeof Schema.String;
    primaryKey: typeof Schema.String;
    payload: typeof Schema.Uint8ArrayFromSelf;
}>, never, {
    readonly id: Uint8Array<ArrayBufferLike> & import("effect/Brand").Brand<typeof EntryIdTypeId>;
} & {
    readonly event: string;
} & {
    readonly primaryKey: string;
} & {
    readonly payload: Uint8Array<ArrayBufferLike>;
}, {}, {}>;
/**
 * @since 1.0.0
 * @category entry
 */
export declare class Entry extends Entry_base {
    /**
     * @since 1.0.0
     */
    static arrayMsgPack: Schema.Array$<MsgPack.schema<typeof Entry>>;
    /**
     * @since 1.0.0
     */
    static encodeArray: (a: readonly Entry[], overrideOptions?: import("effect/SchemaAST").ParseOptions) => Effect.Effect<readonly Uint8Array<ArrayBufferLike>[], import("effect/ParseResult").ParseError, never>;
    /**
     * @since 1.0.0
     */
    static decodeArray: (i: readonly Uint8Array<ArrayBufferLike>[], overrideOptions?: import("effect/SchemaAST").ParseOptions) => Effect.Effect<readonly Entry[], import("effect/ParseResult").ParseError, never>;
    /**
     * @since 1.0.0
     */
    get idString(): string;
    /**
     * @since 1.0.0
     */
    get createdAtMillis(): number;
    /**
     * @since 1.0.0
     */
    get createdAt(): DateTime.Utc;
}
declare const RemoteEntry_base: Schema.Class<RemoteEntry, {
    remoteSequence: typeof Schema.Number;
    entry: typeof Entry;
}, Schema.Struct.Encoded<{
    remoteSequence: typeof Schema.Number;
    entry: typeof Entry;
}>, never, {
    readonly remoteSequence: number;
} & {
    readonly entry: Entry;
}, {}, {}>;
/**
 * @since 1.0.0
 * @category entry
 */
export declare class RemoteEntry extends RemoteEntry_base {
}
/**
 * @since 1.0.0
 * @category memory
 */
export declare const makeMemory: Effect.Effect<typeof EventJournal.Service>;
/**
 * @since 1.0.0
 * @category memory
 */
export declare const layerMemory: Layer.Layer<EventJournal>;
/**
 * @since 1.0.0
 * @category indexed db
 */
export declare const makeIndexedDb: (options?: {
    readonly database?: string;
}) => Effect.Effect<typeof EventJournal.Service, EventJournalError, Scope>;
/**
 * @since 1.0.0
 * @category indexed db
 */
export declare const layerIndexedDb: (options?: {
    readonly database?: string;
}) => Layer.Layer<EventJournal, EventJournalError>;
export {};
//# sourceMappingURL=EventJournal.d.ts.map