import { type Pipeable } from "effect/Pipeable";
import * as Record from "effect/Record";
import type * as Schema from "effect/Schema";
import type { Event } from "./Event.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const TypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId;
/**
 * @since 1.0.0
 * @category guards
 */
export declare const isEventGroup: (u: unknown) => u is EventGroup.Any;
/**
 * An `EventGroup` is a collection of `Event`s. You can use an `EventGroup` to
 * represent a portion of your domain.
 *
 * The events can be implemented later using the `EventLogBuilder.group` api.
 *
 * @since 1.0.0
 * @category models
 */
export interface EventGroup<out Events extends Event.Any = never> extends Pipeable {
    new (_: never): {};
    readonly [TypeId]: TypeId;
    readonly events: Record.ReadonlyRecord<string, Events>;
    /**
     * Add an `Event` to the `EventGroup`.
     */
    add<Tag extends string, Payload extends Schema.Schema.Any = typeof Schema.Void, Success extends Schema.Schema.Any = typeof Schema.Void, Error extends Schema.Schema.All = typeof Schema.Never>(options: {
        readonly tag: Tag;
        readonly primaryKey: (payload: Schema.Schema.Type<Payload>) => string;
        readonly payload?: Payload;
        readonly success?: Success;
        readonly error?: Error;
    }): EventGroup<Events | Event<Tag, Payload, Success, Error>>;
    /**
     * Add an error schema to all the events in the `EventGroup`.
     */
    addError<Error extends Schema.Schema.Any>(error: Error): EventGroup<Event.AddError<Events, Error>>;
}
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace EventGroup {
    /**
     * @since 1.0.0
     * @category models
     */
    interface Any {
        readonly [TypeId]: TypeId;
    }
    /**
     * @since 1.0.0
     * @category models
     */
    type AnyWithProps = EventGroup<Event.AnyWithProps>;
    /**
     * @since 1.0.0
     * @category models
     */
    type ToService<A> = A extends EventGroup<infer _Events> ? Event.ToService<_Events> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Events<Group> = Group extends EventGroup<infer _Events> ? _Events : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Context<Group> = Event.Context<Events<Group>>;
}
/**
 * An `EventGroup` is a collection of `Event`s. You can use an `EventGroup` to
 * represent a portion of your domain.
 *
 * The events can be implemented later using the `EventLog.group` api.
 *
 * @since 1.0.0
 * @category constructors
 */
export declare const empty: EventGroup<never>;
//# sourceMappingURL=EventGroup.d.ts.map