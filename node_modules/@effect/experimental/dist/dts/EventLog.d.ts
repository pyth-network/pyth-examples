/**
 * @since 1.0.0
 */
import type * as Error from "@effect/platform/Error";
import * as KeyValueStore from "@effect/platform/KeyValueStore";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as ParseResult from "effect/ParseResult";
import { type Pipeable } from "effect/Pipeable";
import type * as Record from "effect/Record";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import type { Scope } from "effect/Scope";
import type { Covariant } from "effect/Types";
import type { Event } from "./Event.js";
import type { EventGroup } from "./EventGroup.js";
import type { EventJournalError } from "./EventJournal.js";
import { Entry, EventJournal } from "./EventJournal.js";
import { type EventLogRemote } from "./EventLogRemote.js";
/**
 * @since 1.0.0
 * @category schema
 */
export declare const SchemaTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category schema
 */
export type SchemaTypeId = typeof SchemaTypeId;
/**
 * @since 1.0.0
 * @category schema
 */
export declare const isEventLogSchema: (u: unknown) => u is EventLogSchema<any>;
/**
 * @since 1.0.0
 * @category schema
 */
export interface EventLogSchema<Groups extends EventGroup.Any> {
    new (_: never): {};
    readonly [SchemaTypeId]: SchemaTypeId;
    readonly groups: ReadonlyArray<Groups>;
}
/**
 * @since 1.0.0
 * @category schema
 */
export declare const schema: <Groups extends ReadonlyArray<EventGroup.Any>>(...groups: Groups) => EventLogSchema<Groups[number]>;
/**
 * @since 1.0.0
 * @category handlers
 */
export declare const HandlersTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category handlers
 */
export type HandlersTypeId = typeof HandlersTypeId;
/**
 * Represents a handled `EventGroup`.
 *
 * @since 1.0.0
 * @category handlers
 */
export interface Handlers<R, Events extends Event.Any = never> extends Pipeable {
    readonly [HandlersTypeId]: {
        _Endpoints: Covariant<Events>;
    };
    readonly group: EventGroup.AnyWithProps;
    readonly handlers: Record.ReadonlyRecord<string, Handlers.Item<R>>;
    readonly context: Context.Context<any>;
    /**
     * Add the implementation for an `Event` to a `Handlers` group.
     */
    handle<Tag extends Events["tag"], R1>(name: Tag, handler: (options: {
        readonly payload: Event.PayloadWithTag<Events, Tag>;
        readonly entry: Entry;
        readonly conflicts: Array<{
            readonly entry: Entry;
            readonly payload: Event.PayloadWithTag<Events, Tag>;
        }>;
    }) => Effect.Effect<Event.SuccessWithTag<Events, Tag>, Event.ErrorWithTag<Events, Tag>, R1>): Handlers<R | R1, Event.ExcludeTag<Events, Tag>>;
}
/**
 * @since 1.0.0
 * @category handlers
 */
export declare namespace Handlers {
    /**
     * @since 1.0.0
     * @category handlers
     */
    interface Any {
        readonly [HandlersTypeId]: any;
    }
    /**
     * @since 1.0.0
     * @category handlers
     */
    type Item<R> = {
        readonly event: Event.AnyWithProps;
        readonly context: Context.Context<any>;
        readonly handler: (options: {
            readonly payload: any;
            readonly entry: Entry;
            readonly conflicts: Array<{
                readonly entry: Entry;
                readonly payload: any;
            }>;
        }) => Effect.Effect<any, R>;
    };
    /**
     * @since 1.0.0
     * @category handlers
     */
    type ValidateReturn<A> = A extends (Handlers<infer _R, infer _Events> | Effect.Effect<Handlers<infer _R, infer _Events>, infer _EX, infer _RX>) ? [_Events] extends [never] ? A : `Event not handled: ${Event.Tag<_Events>}` : `Must return the implemented handlers`;
    /**
     * @since 1.0.0
     * @category handlers
     */
    type Error<A> = A extends Effect.Effect<Handlers<infer _R, infer _Events>, infer _EX, infer _RX> ? _EX : never;
    /**
     * @since 1.0.0
     * @category handlers
     */
    type Context<A> = A extends Handlers<infer _R, infer _Events> ? _R | Event.Context<_Events> : A extends Effect.Effect<Handlers<infer _R, infer _Events>, infer _EX, infer _RX> ? _R | _RX | Event.Context<_Events> : never;
}
/**
 * @since 1.0.0
 * @category handlers
 */
export declare const group: <Events extends Event.Any, Return>(group: EventGroup<Events>, f: (handlers: Handlers<never, Events>) => Handlers.ValidateReturn<Return>) => Layer.Layer<Event.ToService<Events>, Handlers.Error<Return>, Exclude<Handlers.Context<Return>, Scope>>;
/**
 * @since 1.0.0
 * @category compaction
 */
export declare const groupCompaction: <Events extends Event.Any, R>(group: EventGroup<Events>, effect: (options: {
    readonly primaryKey: string;
    readonly entries: Array<Entry>;
    readonly events: Array<Event.TaggedPayload<Events>>;
    readonly write: <Tag extends Event.Tag<Events>>(tag: Tag, payload: Event.PayloadWithTag<Events, Tag>) => Effect.Effect<void>;
}) => Effect.Effect<void, never, R>) => Layer.Layer<never, never, Identity | EventJournal | R | Event.Context<Events>>;
/**
 * @since 1.0.0
 * @category reactivity
 */
export declare const groupReactivity: <Events extends Event.Any>(group: EventGroup<Events>, keys: { readonly [Tag in Event.Tag<Events>]?: ReadonlyArray<string>; } | ReadonlyArray<string>) => Layer.Layer<never, never, Identity | EventJournal>;
declare const Registry_base: Context.TagClass<Registry, "@effect/experimental/EventLog/Registry", {
    readonly add: (handlers: Handlers.Any) => Effect.Effect<void>;
    readonly handlers: Effect.Effect<Record.ReadonlyRecord<string, Handlers.Item<any>>>;
}>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare class Registry extends Registry_base {
    /**
     * @since 1.0.0
     */
    static layer: Layer.Layer<Registry, never, never>;
}
declare const Identity_base: Context.TagClass<Identity, "@effect/experimental/EventLog/Identity", {
    readonly publicKey: string;
    readonly privateKey: Redacted.Redacted<Uint8Array>;
}>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class Identity extends Identity_base {
    /**
     * @since 1.0.0
     */
    static makeRandom(): {
        readonly publicKey: string;
        readonly privateKey: Redacted.Redacted<Uint8Array>;
    };
    /**
     * @since 1.0.0
     */
    static readonly Schema: Schema.Struct<{
        publicKey: typeof Schema.String;
        privateKey: Schema.Redacted<Schema.Schema<Uint8Array<ArrayBufferLike>, string, never>>;
    }>;
    /**
     * @since 1.0.0
     */
    static readonly SchemaFromString: Schema.transform<Schema.Schema<string, string, never>, Schema.transform<Schema.SchemaClass<unknown, string, never>, Schema.Struct<{
        publicKey: typeof Schema.String;
        privateKey: Schema.Redacted<Schema.Schema<Uint8Array<ArrayBufferLike>, string, never>>;
    }>>>;
    /**
     * @since 1.0.0
     */
    static decodeString: (s: string) => Identity["Type"];
    /**
     * @since 1.0.0
     */
    static encodeString: (identity: Identity["Type"]) => string;
}
/**
 * Generates a random `Identity` and stores it in a `KeyValueStore`.
 *
 * @since 1.0.0
 * @category layers
 */
export declare const layerIdentityKvs: (options: {
    readonly key: string;
}) => Layer.Layer<Identity, ParseResult.ParseError | Error.PlatformError, KeyValueStore.KeyValueStore>;
declare const EventLog_base: Context.TagClass<EventLog, "@effect/experimental/EventLog/EventLog", {
    readonly write: <Groups extends EventGroup.Any, Tag extends Event.Tag<EventGroup.Events<Groups>>>(options: {
        readonly schema: EventLogSchema<Groups>;
        readonly event: Tag;
        readonly payload: Event.PayloadWithTag<EventGroup.Events<Groups>, Tag>;
    }) => Effect.Effect<Event.SuccessWithTag<EventGroup.Events<Groups>, Tag>, Event.ErrorWithTag<EventGroup.Events<Groups>, Tag> | EventJournalError>;
    readonly registerRemote: (remote: EventLogRemote) => Effect.Effect<void, never, Scope>;
    readonly registerCompaction: (options: {
        readonly events: ReadonlyArray<string>;
        readonly effect: (options: {
            readonly entries: ReadonlyArray<Entry>;
            readonly write: (entry: Entry) => Effect.Effect<void>;
        }) => Effect.Effect<void>;
    }) => Effect.Effect<void, never, Scope>;
    readonly registerReactivity: (keys: Record<string, ReadonlyArray<string>>) => Effect.Effect<void, never, Scope>;
    readonly entries: Effect.Effect<ReadonlyArray<Entry>, EventJournalError>;
    readonly destroy: Effect.Effect<void, EventJournalError>;
}>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class EventLog extends EventLog_base {
}
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerEventLog: Layer.Layer<EventLog, never, EventJournal | Identity>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: <Groups extends EventGroup.Any>(_schema: EventLogSchema<Groups>) => Layer.Layer<EventLog, never, EventGroup.ToService<Groups> | EventJournal | Identity>;
/**
 * @since 1.0.0
 * @category client
 */
export declare const makeClient: <Groups extends EventGroup.Any>(schema: EventLogSchema<Groups>) => Effect.Effect<(<Tag extends Event.Tag<EventGroup.Events<Groups>>>(event: Tag, payload: Event.PayloadWithTag<EventGroup.Events<Groups>, Tag>) => Effect.Effect<Event.SuccessWithTag<EventGroup.Events<Groups>, Tag>, Event.ErrorWithTag<EventGroup.Events<Groups>, Tag> | EventJournalError>), never, EventLog>;
export {};
//# sourceMappingURL=EventLog.d.ts.map