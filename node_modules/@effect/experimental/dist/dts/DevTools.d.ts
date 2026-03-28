/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket";
import * as Layer from "effect/Layer";
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerSocket: Layer.Layer<never, never, Socket.Socket>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerWebSocket: (url?: string) => Layer.Layer<never, never, Socket.WebSocketConstructor>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: (url?: string) => Layer.Layer<never>;
//# sourceMappingURL=DevTools.d.ts.map