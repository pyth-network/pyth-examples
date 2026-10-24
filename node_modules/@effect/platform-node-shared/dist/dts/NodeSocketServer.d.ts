/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket";
import * as SocketServer from "@effect/platform/SocketServer";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import type * as Http from "node:http";
import * as Net from "node:net";
import * as WS from "ws";
declare const IncomingMessage_base: Context.TagClass<IncomingMessage, "@effect/platform-node-shared/NodeSocketServer/IncomingMessage", Http.IncomingMessage>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class IncomingMessage extends IncomingMessage_base {
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: (options: Net.ServerOpts & Net.ListenOptions) => Effect.Effect<{
    readonly address: SocketServer.Address;
    readonly run: <R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) => Effect.Effect<never, SocketServer.SocketServerError, R>;
}, SocketServer.SocketServerError, Scope.Scope>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: (options: Net.ServerOpts & Net.ListenOptions) => Layer.Layer<SocketServer.SocketServer, SocketServer.SocketServerError>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeWebSocket: (options: WS.ServerOptions<typeof WS.WebSocket, typeof Http.IncomingMessage>) => Effect.Effect<SocketServer.SocketServer["Type"], SocketServer.SocketServerError, Scope.Scope>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerWebSocket: (options: WS.ServerOptions) => Layer.Layer<SocketServer.SocketServer, SocketServer.SocketServerError>;
export {};
//# sourceMappingURL=NodeSocketServer.d.ts.map