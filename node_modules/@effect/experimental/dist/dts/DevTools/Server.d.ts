import * as SocketServer from "@effect/platform/SocketServer";
import * as Effect from "effect/Effect";
import * as Mailbox from "effect/Mailbox";
import * as Domain from "./Domain.js";
/**
 * @since 1.0.0
 * @category models
 */
export interface Client {
    readonly queue: Mailbox.ReadonlyMailbox<Domain.Request.WithoutPing>;
    readonly request: (_: Domain.Response.WithoutPong) => Effect.Effect<void>;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const run: <R, E, _>(handle: (client: Client) => Effect.Effect<_, E, R>) => Effect.Effect<never, SocketServer.SocketServerError, R | SocketServer.SocketServer>;
//# sourceMappingURL=Server.d.ts.map