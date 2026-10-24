/**
 * @since 1.0.0
 */
import * as MsgPack from "@effect/platform/MsgPack";
import * as Schema from "effect/Schema";
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
export declare const isEvent: (u: unknown) => u is Event<any, any, any, any>;
/**
 * Represents an event in an EventLog.
 *
 * @since 1.0.0
 * @category models
 */
export interface Event<out Tag extends string, in out Payload extends Schema.Schema.Any = typeof Schema.Void, in out Success extends Schema.Schema.Any = typeof Schema.Void, in out Error extends Schema.Schema.All = typeof Schema.Never> {
    readonly [TypeId]: TypeId;
    readonly tag: Tag;
    readonly primaryKey: (payload: Schema.Schema.Type<Payload>) => string;
    readonly payload: Payload;
    readonly payloadMsgPack: MsgPack.schema<Payload>;
    readonly success: Success;
    readonly error: Error;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface EventHandler<in out Tag extends string> {
    readonly _: unique symbol;
    readonly tag: Tag;
}
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Event {
    /**
     * @since 1.0.0
     * @category models
     */
    interface Any {
        readonly [TypeId]: TypeId;
        readonly tag: string;
    }
    /**
     * @since 1.0.0
     * @category models
     */
    interface AnyWithProps extends Event<string, Schema.Schema.Any, Schema.Schema.Any, Schema.Schema.Any> {
    }
    /**
     * @since 1.0.0
     * @category models
     */
    type ToService<A> = A extends Event<infer _Tag, infer _Payload, infer _Success, infer _Error> ? EventHandler<_Tag> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Tag<A> = A extends Event<infer _Tag, infer _Payload, infer _Success, infer _Error> ? _Tag : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type ErrorSchema<A extends Any> = A extends Event<infer _Tag, infer _Payload, infer _Success, infer _Error> ? _Error : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Error<A extends Any> = Schema.Schema.Type<ErrorSchema<A>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type AddError<A extends Any, Error extends Schema.Schema.Any> = A extends Event<infer _Tag, infer _Payload, infer _Success, infer _Error> ? Event<_Tag, _Payload, _Success, _Error | Error> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type PayloadSchema<A extends Any> = A extends Event<infer _Tag, infer _Payload, infer _Success, infer _Error> ? _Payload : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Payload<A extends Any> = Schema.Schema.Type<PayloadSchema<A>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type TaggedPayload<A extends Any> = A extends Event<infer _Tag, infer _Payload, infer _Success, infer _Error> ? {
        readonly _tag: _Tag;
        readonly payload: Schema.Schema.Type<_Payload>;
    } : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type SuccessSchema<A extends Any> = A extends Event<infer _Tag, infer _Payload, infer _Success, infer _Error> ? _Success : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Success<A extends Any> = Schema.Schema.Type<SuccessSchema<A>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Context<A> = A extends Event<infer _Name, infer _Payload, infer _Success, infer _Error> ? Schema.Schema.Context<_Payload> | Schema.Schema.Context<_Success> | Schema.Schema.Context<_Error> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type WithTag<Events extends Any, Tag extends string> = Extract<Events, {
        readonly tag: Tag;
    }>;
    /**
     * @since 1.0.0
     * @category models
     */
    type ExcludeTag<Events extends Any, Tag extends string> = Exclude<Events, {
        readonly tag: Tag;
    }>;
    /**
     * @since 1.0.0
     * @category models
     */
    type PayloadWithTag<Events extends Any, Tag extends string> = Payload<WithTag<Events, Tag>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type SuccessWithTag<Events extends Any, Tag extends string> = Success<WithTag<Events, Tag>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type ErrorWithTag<Events extends Any, Tag extends string> = Error<WithTag<Events, Tag>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type ContextWithTag<Events extends Any, Tag extends string> = Context<WithTag<Events, Tag>>;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <Tag extends string, Payload extends Schema.Schema.Any = typeof Schema.Void, Success extends Schema.Schema.Any = typeof Schema.Void, Error extends Schema.Schema.All = typeof Schema.Never>(options: {
    readonly tag: Tag;
    readonly primaryKey: (payload: Schema.Schema.Type<Payload>) => string;
    readonly payload?: Payload;
    readonly success?: Success;
    readonly error?: Error;
}) => Event<Tag, Payload, Success, Error>;
//# sourceMappingURL=Event.d.ts.map