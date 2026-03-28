import * as Channel from "effect/Channel";
import type * as Chunk from "effect/Chunk";
import type { ParseError } from "effect/ParseResult";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const encode: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<I>, Chunk.Chunk<A>, IE | ParseError, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const encodeUnknown: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<A>, IE | ParseError, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const decode: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<A>, Chunk.Chunk<I>, ParseError | IE, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const decodeUnknown: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<A>, Chunk.Chunk<any>, ParseError | IE, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const duplex: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <IA, II, IR, OA, OI, OR>(options: {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): <R, InErr, OutErr, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<OI>, Chunk.Chunk<II>, OutErr, ParseError | InErr, OutDone, InDone, R>) => Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, ParseError | OutErr, InErr, OutDone, InDone, R | IR | OR>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(self: Channel.Channel<Chunk.Chunk<OI>, Chunk.Chunk<II>, OutErr, ParseError | InErr, OutDone, InDone, R>, options: {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, ParseError | OutErr, InErr, OutDone, InDone, R | IR | OR>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const duplexUnknown: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <IA, II, IR, OA, OI, OR>(options: {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): <R, InErr, OutErr, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<any>, OutErr, ParseError | InErr, OutDone, InDone, R>) => Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, ParseError | OutErr, InErr, OutDone, InDone, R | IR | OR>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(self: Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<any>, OutErr, ParseError | InErr, OutDone, InDone, R>, options: {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, ParseError | OutErr, InErr, OutDone, InDone, R | IR | OR>;
};
//# sourceMappingURL=ChannelSchema.d.ts.map