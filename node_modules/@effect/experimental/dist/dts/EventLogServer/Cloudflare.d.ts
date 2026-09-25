/**
 * @since 1.0.0
 */
import { DurableObject } from "cloudflare:workers";
import type * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as EventLogServer from "../EventLogServer.js";
/**
 * @since 1.0.0
 * @category DurableObject
 */
export declare abstract class EventLogDurableObject extends DurableObject {
    /**
     * @since 1.0.0
     */
    readonly runtime: ManagedRuntime.ManagedRuntime<EventLogServer.Storage, never>;
    constructor(options: {
        readonly ctx: DurableObjectState;
        readonly env: unknown;
        readonly storageLayer: Layer.Layer<EventLogServer.Storage>;
    });
    /**
     * @since 1.0.0
     */
    webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void>;
    private chunks;
    /**
     * @since 1.0.0
     */
    private handleRequest;
    /**
     * @since 1.0.0
     */
    private encodeChanges;
    /**
     * @since 1.0.0
     */
    webSocketError(_ws: WebSocket, error: Error): void;
    /**
     * @since 1.0.0
     */
    webSocketClose(_ws: WebSocket, code: number, reason: string): void;
    /**
     * @since 1.0.0
     */
    fetch(): Promise<Response>;
}
//# sourceMappingURL=Cloudflare.d.ts.map