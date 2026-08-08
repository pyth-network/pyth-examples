/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as internal from "./internal/fetchHttpClient.js";
/**
 * @since 1.0.0
 * @category tags
 */
export class Fetch extends /*#__PURE__*/Context.Tag(internal.fetchTagKey)() {}
/**
 * @since 1.0.0
 * @category tags
 */
export class RequestInit extends /*#__PURE__*/Context.Tag(internal.requestInitTagKey)() {}
/**
 * @since 1.0.0
 * @category layers
 */
export const layer = internal.layer;
//# sourceMappingURL=FetchHttpClient.js.map