/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers";
import type * as Rpc from "@effect/rpc/Rpc";
import type { ReadonlyRecord } from "effect/Record";
import * as Schema from "effect/Schema";
import { EntityAddress } from "./EntityAddress.js";
import { type Snowflake } from "./Snowflake.js";
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
 * @category models
 */
export type Envelope<R extends Rpc.Any> = Request<R> | AckChunk | Interrupt;
/**
 * @since 1.0.0
 */
export declare namespace Envelope {
    /**
     * @since 1.0.0
     * @category models
     */
    type Any = Envelope<any>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Encoded = Request.Encoded | typeof AckChunk.Encoded | typeof Interrupt.Encoded;
    /**
     * @since 1.0.0
     * @category models
     */
    type PartialEncoded = Request.PartialEncoded | AckChunk | Interrupt;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Request<in out Rpc extends Rpc.Any> {
    readonly [TypeId]: TypeId;
    readonly _tag: "Request";
    readonly requestId: Snowflake;
    readonly address: EntityAddress;
    readonly tag: Rpc.Tag<Rpc>;
    readonly payload: Rpc.Payload<Rpc>;
    readonly headers: Headers.Headers;
    readonly traceId?: string | undefined;
    readonly spanId?: string | undefined;
    readonly sampled?: boolean | undefined;
}
declare const AckChunk_base: Schema.TaggedClass<AckChunk, "AckChunk", {
    readonly _tag: Schema.tag<"AckChunk">;
} & {
    id: Schema.Schema<Snowflake, string, never>;
    address: typeof EntityAddress;
    requestId: Schema.Schema<Snowflake, string, never>;
    replyId: Schema.Schema<Snowflake, string, never>;
}>;
/**
 * @since 1.0.0
 * @category models
 */
export declare class AckChunk extends AckChunk_base {
    /**
     * @since 1.0.0
     */
    readonly [TypeId]: TypeId;
    /**
     * @since 1.0.0
     */
    withRequestId(requestId: Snowflake): AckChunk;
}
declare const Interrupt_base: Schema.TaggedClass<Interrupt, "Interrupt", {
    readonly _tag: Schema.tag<"Interrupt">;
} & {
    id: Schema.Schema<Snowflake, string, never>;
    address: typeof EntityAddress;
    requestId: Schema.Schema<Snowflake, string, never>;
}>;
/**
 * @since 1.0.0
 * @category models
 */
export declare class Interrupt extends Interrupt_base {
    /**
     * @since 1.0.0
     */
    readonly [TypeId]: TypeId;
    /**
     * @since 1.0.0
     */
    withRequestId(requestId: Snowflake): Interrupt;
}
/**
 * @since 1.0.0
 */
export declare namespace Request {
    /**
     * @since 1.0.0
     * @category models
     */
    type Any = Request<any>;
    /**
     * @since 1.0.0
     * @category models
     */
    interface Encoded {
        readonly _tag: "Request";
        readonly requestId: string;
        readonly address: typeof EntityAddress.Encoded;
        readonly tag: string;
        readonly payload: unknown;
        readonly headers: ReadonlyRecord<string, string>;
        readonly traceId?: string | undefined;
        readonly spanId?: string | undefined;
        readonly sampled?: boolean | undefined;
    }
    /**
     * @since 1.0.0
     * @category models
     */
    interface PartialEncoded {
        readonly _tag: "Request";
        readonly requestId: Snowflake;
        readonly address: EntityAddress;
        readonly tag: string;
        readonly payload: unknown;
        readonly headers: Headers.Headers;
        readonly traceId?: string | undefined;
        readonly spanId?: string | undefined;
        readonly sampled?: boolean | undefined;
    }
}
/**
 * @since 1.0.0
 * @category refinements
 */
export declare const isEnvelope: (u: unknown) => u is Envelope<any>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeRequest: <Rpc extends Rpc.Any>(options: {
    readonly requestId: Snowflake;
    readonly address: EntityAddress;
    readonly tag: Rpc.Tag<Rpc>;
    readonly payload: Rpc.Payload<Rpc>;
    readonly headers: Headers.Headers;
    readonly traceId?: string | undefined;
    readonly spanId?: string | undefined;
    readonly sampled?: boolean | undefined;
}) => Request<Rpc>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const EnvelopeFromSelf: Schema.Schema<Envelope.Any, Envelope.Any>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const RequestFromSelf: Schema.Schema<Request.Any, Request.Any>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const PartialEncodedRequest: Schema.Struct<{
    _tag: Schema.Literal<["Request"]>;
    requestId: Schema.Schema<Snowflake, string>;
    address: typeof EntityAddress;
    tag: typeof Schema.String;
    payload: typeof Schema.Unknown;
    headers: Schema.Schema<Headers.Headers, ReadonlyRecord<string, string>>;
    traceId: Schema.optional<typeof Schema.String>;
    spanId: Schema.optional<typeof Schema.String>;
    sampled: Schema.optional<typeof Schema.Boolean>;
}>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const PartialEncoded: Schema.Union<[
    Schema.Struct<{
        _tag: Schema.Literal<["Request"]>;
        requestId: Schema.Schema<Snowflake, string>;
        address: typeof EntityAddress;
        tag: typeof Schema.String;
        payload: typeof Schema.Unknown;
        headers: Schema.Schema<Headers.Headers, ReadonlyRecord<string, string>>;
        traceId: Schema.optional<typeof Schema.String>;
        spanId: Schema.optional<typeof Schema.String>;
        sampled: Schema.optional<typeof Schema.Boolean>;
    }>,
    typeof AckChunk,
    typeof Interrupt
]>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const PartialEncodedArray: Schema.Schema<Array<Envelope.PartialEncoded>, Array<Envelope.Encoded>>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const PartialEncodedRequestFromSelf: Schema.Struct<{
    _tag: Schema.Literal<["Request"]>;
    requestId: Schema.Schema<Snowflake>;
    address: Schema.Schema<EntityAddress>;
    tag: typeof Schema.String;
    payload: typeof Schema.Unknown;
    headers: Schema.Schema<Headers.Headers>;
    traceId: Schema.optional<typeof Schema.String>;
    spanId: Schema.optional<typeof Schema.String>;
    sampled: Schema.optional<typeof Schema.Boolean>;
}>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const PartialEncodedFromSelf: Schema.Union<[
    Schema.Struct<{
        _tag: Schema.Literal<["Request"]>;
        requestId: Schema.Schema<Snowflake>;
        address: Schema.Schema<EntityAddress>;
        tag: typeof Schema.String;
        payload: typeof Schema.Unknown;
        headers: Schema.Schema<Headers.Headers>;
        traceId: Schema.optional<typeof Schema.String>;
        spanId: Schema.optional<typeof Schema.String>;
        sampled: Schema.optional<typeof Schema.Boolean>;
    }>,
    Schema.Schema<AckChunk>,
    Schema.Schema<Interrupt>
]>;
/**
 * @since 1.0.0
 * @category primary key
 */
export declare const primaryKey: <R extends Rpc.Any>(envelope: Envelope<R>) => string | null;
/**
 * @since 1.0.0
 * @category primary key
 */
export declare const primaryKeyByAddress: (options: {
    readonly address: EntityAddress;
    readonly tag: string;
    readonly id: string;
}) => string;
export {};
//# sourceMappingURL=Envelope.d.ts.map