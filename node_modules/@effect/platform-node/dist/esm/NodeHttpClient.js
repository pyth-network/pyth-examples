import * as Context from "effect/Context";
import * as internal from "./internal/httpClient.js";
import * as internalUndici from "./internal/httpClientUndici.js";
/**
 * @since 1.0.0
 * @category agent
 */
export const HttpAgentTypeId = internal.HttpAgentTypeId;
/**
 * @since 1.0.0
 * @category agent
 */
export const HttpAgent = internal.HttpAgent;
/**
 * @since 1.0.0
 * @category agent
 */
export const makeAgent = internal.makeAgent;
/**
 * @since 1.0.0
 * @category agent
 */
export const agentLayer = internal.agentLayer;
/**
 * @since 1.0.0
 * @category agent
 */
export const makeAgentLayer = internal.makeAgentLayer;
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make;
/**
 * @since 1.0.0
 * @category layers
 */
export const layer = internal.layer;
/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithoutAgent = internal.layerWithoutAgent;
/**
 * @since 1.0.0
 * @category undici
 */
export const Dispatcher = internalUndici.Dispatcher;
/**
 * @since 1.0.0
 * @category undici
 */
export const makeDispatcher = internalUndici.makeDispatcher;
/**
 * @since 1.0.0
 * @category undici
 */
export const dispatcherLayer = internalUndici.dispatcherLayer;
/**
 * @since 1.0.0
 * @category undici
 */
export const dispatcherLayerGlobal = internalUndici.dispatcherLayerGlobal;
/**
 * @since 1.0.0
 * @category undici
 */
export class UndiciRequestOptions extends /*#__PURE__*/Context.Tag(internalUndici.undiciOptionsTagKey)() {}
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeUndici = internalUndici.make;
/**
 * @since 1.0.0
 * @category layers
 */
export const layerUndici = internalUndici.layer;
/**
 * @since 1.0.0
 * @category layers
 */
export const layerUndiciWithoutDispatcher = internalUndici.layerWithoutDispatcher;
//# sourceMappingURL=NodeHttpClient.js.map