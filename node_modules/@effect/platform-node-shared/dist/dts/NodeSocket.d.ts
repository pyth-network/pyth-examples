/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket";
import * as Channel from "effect/Channel";
import type * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as Net from "node:net";
import type { Duplex } from "node:stream";
/**
 * @since 1.0.0
 * @category tags
 */
export interface NetSocket {
    readonly _: unique symbol;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const NetSocket: Context.Tag<NetSocket, Net.Socket>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeNet: (options: Net.NetConnectOpts) => Effect.Effect<Socket.Socket, Socket.SocketError>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const fromDuplex: <RO>(open: Effect.Effect<Duplex, Socket.SocketError, RO>) => Effect.Effect<Socket.Socket, never, Exclude<RO, Scope.Scope>>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeNetChannel: <IE = never>(options: Net.NetConnectOpts) => Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array | string | Socket.CloseEvent>, Socket.SocketError | IE, IE, void, unknown>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerNet: (options: Net.NetConnectOpts) => Layer.Layer<Socket.Socket, Socket.SocketError>;
//# sourceMappingURL=NodeSocket.d.ts.map