/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause";
import * as Channel from "effect/Channel";
import * as Chunk from "effect/Chunk";
import type { ParseError } from "effect/ParseResult";
import type * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const ErrorTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type NdjsonErrorTypeId = typeof ErrorTypeId;
declare const NdjsonError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => Cause.YieldableError & Record<typeof ErrorTypeId, typeof ErrorTypeId> & {
    readonly _tag: "NdjsonError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class NdjsonError extends NdjsonError_base<{
    readonly reason: "Pack" | "Unpack";
    readonly cause: unknown;
}> {
    get message(): "Pack" | "Unpack";
}
/**
 * Represents a set of options which can be used to control how the newline
 * delimited JSON is handled.
 *
 * @since 1.0.0
 * @category models
 */
export interface NdjsonOptions {
    /**
     * Whether or not the newline delimited JSON parser should ignore empty lines.
     *
     * Defaults to `false`.
     *
     * From the [newline delimited JSON spec](https://github.com/ndjson/ndjson-spec):
     * ```text
     * The parser MAY silently ignore empty lines, e.g. \n\n. This behavior MUST
     * be documented and SHOULD be configurable by the user of the parser.
     * ```
     *
     * @since 1.0.0
     */
    readonly ignoreEmptyLines?: boolean;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const packString: <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<unknown>, IE | NdjsonError, IE, Done, Done>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const pack: <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<unknown>, IE | NdjsonError, IE, Done, Done>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const packSchema: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<A>, IE | NdjsonError | ParseError, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const packSchemaString: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>() => Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<A>, IE | NdjsonError | ParseError, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const unpackString: <IE = never, Done = unknown>(options?: NdjsonOptions) => Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<string>, IE | NdjsonError, IE, Done, Done>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const unpack: <IE = never, Done = unknown>(options?: NdjsonOptions) => Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<Uint8Array>, IE | NdjsonError, IE, Done, Done>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const unpackSchema: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>(options?: NdjsonOptions) => Channel.Channel<Chunk.Chunk<A>, Chunk.Chunk<Uint8Array>, NdjsonError | ParseError | IE, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const unpackSchemaString: <A, I, R>(schema: Schema.Schema<A, I, R>) => <IE = never, Done = unknown>(options?: NdjsonOptions) => Channel.Channel<Chunk.Chunk<A>, Chunk.Chunk<string>, NdjsonError | ParseError | IE, IE, Done, Done, R>;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const duplex: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (options?: NdjsonOptions): <R, IE, OE, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OE, IE | NdjsonError, OutDone, InDone, R>) => Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <R, IE, OE, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OE, IE | NdjsonError, OutDone, InDone, R>, options?: NdjsonOptions): Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const duplexString: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (options?: NdjsonOptions): <R, IE, OE, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<string>, OE, IE | NdjsonError, OutDone, InDone, R>) => Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <R, IE, OE, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<string>, OE, IE | NdjsonError, OutDone, InDone, R>, options?: NdjsonOptions): Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const duplexSchema: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <IA, II, IR, OA, OI, OR>(options: Partial<NdjsonOptions> & {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): <R, InErr, OutErr, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OutErr, NdjsonError | ParseError | InErr, OutDone, InDone, R>) => Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, NdjsonError | ParseError | OutErr, InErr, OutDone, InDone, R | IR | OR>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OutErr, NdjsonError | ParseError | InErr, OutDone, InDone, R>, options: Partial<NdjsonOptions> & {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, NdjsonError | ParseError | OutErr, InErr, OutDone, InDone, R | IR | OR>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const duplexSchemaString: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <IA, II, IR, OA, OI, OR>(options: Partial<NdjsonOptions> & {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): <R, InErr, OutErr, OutDone, InDone>(self: Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<string>, OutErr, NdjsonError | ParseError | InErr, OutDone, InDone, R>) => Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, NdjsonError | ParseError | OutErr, InErr, OutDone, InDone, R | IR | OR>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(self: Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<string>, OutErr, NdjsonError | ParseError | InErr, OutDone, InDone, R>, options: Partial<NdjsonOptions> & {
        readonly inputSchema: Schema.Schema<IA, II, IR>;
        readonly outputSchema: Schema.Schema<OA, OI, OR>;
    }): Channel.Channel<Chunk.Chunk<OA>, Chunk.Chunk<IA>, NdjsonError | ParseError | OutErr, InErr, OutDone, InDone, R | IR | OR>;
};
export {};
//# sourceMappingURL=Ndjson.d.ts.map