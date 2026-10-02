/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel";
import * as Chunk from "effect/Chunk";
import * as Duration from "effect/Duration";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeChannel: <IE, Done>(options?: {
    readonly bufferSize?: number;
}) => Channel.Channel<Chunk.Chunk<Event>, Chunk.Chunk<string>, IE, IE, void, Done>;
/**
 * Create a SSE parser.
 *
 * Adapted from https://github.com/rexxars/eventsource-parser under MIT license.
 *
 * @since 1.0.0
 * @category constructors
 */
export declare function makeParser(onParse: (event: AnyEvent) => void): Parser;
/**
 * @since 1.0.0
 * @category models
 */
export interface Parser {
    feed(chunk: string): void;
    reset(): void;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Encoder {
    write(event: AnyEvent): string;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Event {
    readonly _tag: "Event";
    readonly event: string;
    readonly id: string | undefined;
    readonly data: string;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface EventEncoded {
    readonly event: string;
    readonly id: string | undefined;
    readonly data: string;
}
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const RetryTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type RetryTypeId = typeof RetryTypeId;
declare const Retry_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => Readonly<A> & {
    readonly _tag: "Retry";
};
/**
 * @since 1.0.0
 * @category models
 */
export declare class Retry extends Retry_base<{
    readonly duration: Duration.Duration;
    readonly lastEventId: string | undefined;
}> {
    /**
     * @since 1.0.0
     */
    readonly [RetryTypeId]: RetryTypeId;
    /**
     * @since 1.0.0
     */
    static is(u: unknown): u is Retry;
}
/**
 * @since 1.0.0
 * @category models
 */
export type AnyEvent = Event | Retry;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const encoder: Encoder;
export {};
//# sourceMappingURL=Sse.d.ts.map