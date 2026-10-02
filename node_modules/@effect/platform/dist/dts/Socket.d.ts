/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel";
import type * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import type { DurationInput } from "effect/Duration";
import * as Effect from "effect/Effect";
import * as FiberRef from "effect/FiberRef";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
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
export declare const isSocket: (u: unknown) => u is Socket;
/**
 * @since 1.0.0
 * @category tags
 */
export declare const Socket: Context.Tag<Socket, Socket>;
/**
 * @since 1.0.0
 * @category models
 */
export interface Socket {
    readonly [TypeId]: TypeId;
    readonly run: <_, E = never, R = never>(handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void, options?: {
        readonly onOpen?: Effect.Effect<void> | undefined;
    }) => Effect.Effect<void, SocketError | E, R>;
    readonly runRaw: <_, E = never, R = never>(handler: (_: string | Uint8Array) => Effect.Effect<_, E, R> | void, options?: {
        readonly onOpen?: Effect.Effect<void> | undefined;
    }) => Effect.Effect<void, SocketError | E, R>;
    readonly writer: Effect.Effect<(chunk: Uint8Array | string | CloseEvent) => Effect.Effect<void, SocketError>, never, Scope.Scope>;
}
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const CloseEventTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type CloseEventTypeId = typeof CloseEventTypeId;
/**
 * @since 1.0.0
 * @category models
 */
export declare class CloseEvent {
    readonly code: number;
    readonly reason?: string | undefined;
    /**
     * @since 1.0.0
     */
    readonly [CloseEventTypeId]: CloseEventTypeId;
    constructor(code?: number, reason?: string | undefined);
    /**
     * @since 1.0.0
     */
    toString(): string;
}
/**
 * @since 1.0.0
 * @category refinements
 */
export declare const isCloseEvent: (u: unknown) => u is CloseEvent;
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const SocketErrorTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type SocketErrorTypeId = typeof SocketErrorTypeId;
/**
 * @since 1.0.0
 * @category refinements
 */
export declare const isSocketError: (u: unknown) => u is SocketError;
/**
 * @since 1.0.0
 * @category errors
 */
export type SocketError = SocketGenericError | SocketCloseError;
declare const SocketGenericError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => import("effect/Cause").YieldableError & Record<typeof SocketErrorTypeId, typeof SocketErrorTypeId> & {
    readonly _tag: "SocketError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class SocketGenericError extends SocketGenericError_base<{
    readonly reason: "Write" | "Read" | "Open" | "OpenTimeout";
    readonly cause: unknown;
}> {
    get message(): string;
}
declare const SocketCloseError_base: new <A extends Record<string, any>>(args: import("effect/Types").Simplify<A>) => import("effect/Cause").YieldableError & Record<typeof SocketErrorTypeId, typeof SocketErrorTypeId> & {
    readonly _tag: "SocketError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class SocketCloseError extends SocketCloseError_base<{
    readonly reason: "Close";
    readonly code: number;
    readonly closeReason?: string | undefined;
}> {
    /**
     * @since 1.0.0
     */
    static is(u: unknown): u is SocketCloseError;
    /**
     * @since 1.0.0
     */
    static isClean(isClean: (code: number) => boolean): (u: unknown) => u is SocketCloseError;
    get message(): string;
}
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const toChannelMap: <IE, A>(self: Socket, f: (data: Uint8Array | string) => A) => Channel.Channel<Chunk.Chunk<A>, Chunk.Chunk<Uint8Array | string | CloseEvent>, SocketError | IE, IE, void, unknown>;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const toChannel: <IE>(self: Socket) => Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array | string | CloseEvent>, SocketError | IE, IE, void, unknown>;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const toChannelString: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (encoding?: string | undefined): <IE>(self: Socket) => Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<Uint8Array | string | CloseEvent>, SocketError | IE, IE, void, unknown>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <IE>(self: Socket, encoding?: string | undefined): Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<Uint8Array | string | CloseEvent>, SocketError | IE, IE, void, unknown>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const toChannelWith: <IE = never>() => (self: Socket) => Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array | string | CloseEvent>, SocketError | IE, IE, void, unknown>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeChannel: <IE = never>() => Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array | string | CloseEvent>, SocketError | IE, IE, void, unknown, Socket>;
/**
 * @since 1.0.0
 */
export declare const defaultCloseCodeIsError: (code: number) => boolean;
/**
 * @since 1.0.0
 * @category tags
 */
export interface WebSocket {
    readonly _: unique symbol;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const WebSocket: Context.Tag<WebSocket, globalThis.WebSocket>;
/**
 * @since 1.0.0
 * @category tags
 */
export interface WebSocketConstructor {
    readonly _: unique symbol;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const WebSocketConstructor: Context.Tag<WebSocketConstructor, (url: string, protocols?: string | Array<string> | undefined) => globalThis.WebSocket>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerWebSocketConstructorGlobal: Layer.Layer<WebSocketConstructor>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeWebSocket: (url: string | Effect.Effect<string>, options?: {
    readonly closeCodeIsError?: ((code: number) => boolean) | undefined;
    readonly openTimeout?: DurationInput | undefined;
    readonly protocols?: string | Array<string> | undefined;
}) => Effect.Effect<Socket, never, WebSocketConstructor>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const fromWebSocket: <RO>(acquire: Effect.Effect<globalThis.WebSocket, SocketError, RO>, options?: {
    readonly closeCodeIsError?: (code: number) => boolean;
    readonly openTimeout?: DurationInput;
}) => Effect.Effect<Socket, never, Exclude<RO, Scope.Scope>>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeWebSocketChannel: <IE = never>(url: string, options?: {
    readonly closeCodeIsError?: (code: number) => boolean;
}) => Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array | string | CloseEvent>, SocketError | IE, IE, void, unknown, WebSocketConstructor>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerWebSocket: (url: string, options?: {
    readonly closeCodeIsError?: (code: number) => boolean;
}) => Layer.Layer<Socket, never, WebSocketConstructor>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const currentSendQueueCapacity: FiberRef.FiberRef<number>;
/**
 * @since 1.0.0
 * @category models
 */
export interface InputTransformStream {
    readonly readable: ReadableStream<Uint8Array> | ReadableStream<string> | ReadableStream<Uint8Array | string>;
    readonly writable: WritableStream<Uint8Array>;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const fromTransformStream: <R>(acquire: Effect.Effect<InputTransformStream, SocketError, R>, options?: {
    readonly closeCodeIsError?: (code: number) => boolean;
}) => Effect.Effect<Socket, never, Exclude<R, Scope.Scope>>;
export {};
//# sourceMappingURL=Socket.d.ts.map