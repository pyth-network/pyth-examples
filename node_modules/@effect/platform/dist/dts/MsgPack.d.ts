/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel";
import * as Chunk from "effect/Chunk";
import type { ParseError } from "effect/ParseResult";
import * as Schema from "effect/Schema";
import * as Msgpackr from "msgpackr";
export { 
/**
 * @since 1.0.0
 * @category re-exports
 */
Msgpackr };
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
declare const MsgPackError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "MsgPackError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class MsgPackError extends MsgPackError_base<{
    readonly reason: "Pack" | "Unpack";
    readonly cause: unknown;
}> {
    /**
     * @since 1.0.0
     */
    readonly [ErrorTypeId]: ErrorTypeId;
    /**
     * @since 1.0.0
     */
    get message(): "Pack" | "Unpack";
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const pack: <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<unknown>, IE | MsgPackError, IE, Done, Done>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const packSchema: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<A>, IE | MsgPackError | ParseError, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const unpack: <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<Uint8Array>, IE | MsgPackError, IE, Done, Done>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const unpackSchema: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<A>, Chunk.Chunk<Uint8Array>, MsgPackError | ParseError | IE, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const duplex: <R, IE, OE, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OE, IE | MsgPackError, OutDone, InDone, R>) => Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, MsgPackError | OE, IE, OutDone, InDone, R>;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const duplexSchema: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <IA, II, IR, OA, OI, OR>(options: {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): <R, InErr, OutErr, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OutErr, MsgPackError | ParseError | InErr, OutDone, InDone, R>) => Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, MsgPackError | ParseError | OutErr, InErr, OutDone, InDone, IR | OR | R>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OutErr, MsgPackError | ParseError | InErr, OutDone, InDone, R>, options: {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, MsgPackError | ParseError | OutErr, InErr, OutDone, InDone, R | IR | OR>;
};
/**
 * @since 1.0.0
 * @category schemas
 */
export interface schema<S extends Schema.Schema.Any> extends Schema.transformOrFail<Schema.Schema<Uint8Array>, S> {
}
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const schema: <S extends Schema.Schema.Any>(schema: S) => schema<S>;
//# sourceMappingURL=MsgPack.d.ts.map