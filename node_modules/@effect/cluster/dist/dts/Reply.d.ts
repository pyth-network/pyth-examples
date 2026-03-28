/**
 * @since 1.0.0
 */
import * as Rpc from "@effect/rpc/Rpc";
import type { NonEmptyReadonlyArray } from "effect/Array";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { MalformedMessage } from "./ClusterError.js";
import type { OutgoingRequest } from "./Message.js";
import { Snowflake } from "./Snowflake.js";
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
export declare const isReply: (u: unknown) => u is Reply<Rpc.Any>;
/**
 * @since 1.0.0
 * @category models
 */
export type Reply<R extends Rpc.Any> = WithExit<R> | Chunk<R>;
declare const ReplyWithContext_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => Readonly<A> & {
    readonly _tag: "ReplyWithContext";
};
/**
 * @since 1.0.0
 * @category models
 */
export declare class ReplyWithContext<R extends Rpc.Any> extends ReplyWithContext_base<{
    readonly reply: Reply<R>;
    readonly context: Context.Context<Rpc.Context<R>>;
    readonly rpc: R;
}> {
    /**
     * @since 1.0.0
     */
    static fromDefect(options: {
        readonly id: Snowflake;
        readonly requestId: Snowflake;
        readonly defect: unknown;
    }): ReplyWithContext<any>;
    /**
     * @since 1.0.0
     */
    static interrupt(options: {
        readonly id: Snowflake;
        readonly requestId: Snowflake;
    }): ReplyWithContext<any>;
}
/**
 * @since 1.0.0
 * @category models
 */
export type ReplyEncoded<R extends Rpc.Any> = WithExitEncoded<R> | ChunkEncoded<R>;
/**
 * @since 1.0.0
 * @category models
 */
export interface WithExitEncoded<R extends Rpc.Any> {
    readonly _tag: "WithExit";
    readonly requestId: string;
    readonly id: string;
    readonly exit: Rpc.ExitEncoded<R>;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface ChunkEncoded<R extends Rpc.Any> {
    readonly _tag: "Chunk";
    readonly requestId: string;
    readonly id: string;
    readonly sequence: number;
    readonly values: NonEmptyReadonlyArray<Rpc.SuccessChunkEncoded<R>>;
}
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Reply: <R extends Rpc.Any>(rpc: R) => Schema.Schema<Reply<R>, ReplyEncoded<R>, Rpc.Context<R>>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Encoded: Schema.Union<[Schema.Struct<{
    _tag: Schema.Literal<["WithExit"]>;
    requestId: typeof Schema.String;
    id: typeof Schema.String;
    exit: typeof Schema.Unknown;
}>, Schema.Struct<{
    _tag: Schema.Literal<["Chunk"]>;
    requestId: typeof Schema.String;
    id: typeof Schema.String;
    sequence: typeof Schema.Number;
    values: Schema.Array$<typeof Schema.Unknown>;
}>]>;
declare const Chunk_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => Readonly<A> & {
    readonly _tag: "Chunk";
};
/**
 * @since 1.0.0
 * @category models
 */
export declare class Chunk<R extends Rpc.Any> extends Chunk_base<{
    readonly requestId: Snowflake;
    readonly id: Snowflake;
    readonly sequence: number;
    readonly values: NonEmptyReadonlyArray<Rpc.SuccessChunk<R>>;
}> {
    /**
     * @since 1.0.0
     */
    readonly [TypeId]: symbol;
    /**
     * @since 1.0.0
     */
    static emptyFrom(requestId: Snowflake): Chunk<Rpc.Any>;
    /**
     * @since 1.0.0
     */
    static readonly schemaFromSelf: Schema.Schema<Chunk<never>>;
    /**
     * @since 1.0.0
     */
    static schema<R extends Rpc.Any>(rpc: R): Schema.Schema<Chunk<R>, ChunkEncoded<R>, Rpc.Context<R>>;
    /**
     * @since 1.0.0
     */
    withRequestId(requestId: Snowflake): Chunk<R>;
}
declare const WithExit_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => Readonly<A> & {
    readonly _tag: "WithExit";
};
/**
 * @since 1.0.0
 * @category models
 */
export declare class WithExit<R extends Rpc.Any> extends WithExit_base<{
    readonly requestId: Snowflake;
    readonly id: Snowflake;
    readonly exit: Rpc.Exit<R>;
}> {
    /**
     * @since 1.0.0
     */
    readonly [TypeId]: symbol;
    /**
     * @since 1.0.0
     */
    static schema<R extends Rpc.Any>(rpc: R): Schema.Schema<WithExit<R>, WithExitEncoded<R>, Rpc.Context<R>>;
    /**
     * @since 1.0.0
     */
    withRequestId(requestId: Snowflake): WithExit<R>;
}
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const serialize: <R extends Rpc.Any>(self: ReplyWithContext<R>) => Effect.Effect<ReplyEncoded<R>, MalformedMessage>;
/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export declare const serializeLastReceived: <R extends Rpc.Any>(self: OutgoingRequest<R>) => Effect.Effect<Option.Option<ReplyEncoded<R>>, MalformedMessage>;
export {};
//# sourceMappingURL=Reply.d.ts.map