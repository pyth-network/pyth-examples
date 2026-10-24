/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Socket from "./Socket.js";
declare const SocketServer_base: Context.TagClass<SocketServer, "@effect/platform/SocketServer", {
    readonly address: Address;
    readonly run: <R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) => Effect.Effect<never, SocketServerError, R>;
}>;
/**
 * @since 1.0.0
 * @category tags
 */
export declare class SocketServer extends SocketServer_base {
}
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
declare const SocketServerError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "SocketServerError";
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class SocketServerError extends SocketServerError_base<{
    readonly reason: "Open" | "Unknown";
    readonly cause: unknown;
}> {
    /**
     * @since 1.0.0
     */
    readonly [ErrorTypeId]: ErrorTypeId;
    /**
     * @since 1.0.0
     */
    get message(): string;
}
/**
 * @since 1.0.0
 * @category models
 */
export type Address = UnixAddress | TcpAddress;
/**
 * @since 1.0.0
 * @category models
 */
export interface TcpAddress {
    readonly _tag: "TcpAddress";
    readonly hostname: string;
    readonly port: number;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface UnixAddress {
    readonly _tag: "UnixAddress";
    readonly path: string;
}
export {};
//# sourceMappingURL=SocketServer.d.ts.map