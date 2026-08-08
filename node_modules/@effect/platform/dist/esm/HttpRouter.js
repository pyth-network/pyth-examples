import * as internal from "./internal/httpRouter.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category type ids
 */
export const RouteTypeId = internal.RouteTypeId;
/**
 * @since 1.0.0
 * @category type ids
 */
export const RouteContextTypeId = internal.RouteContextTypeId;
/**
 * @since 1.0.0
 * @category route context
 */
export const RouteContext = internal.RouteContext;
/**
 * @since 1.0.0
 * @category route context
 */
export const params = internal.params;
/**
 * @since 1.0.0
 * @category route context
 */
export const schemaJson = internal.schemaJson;
/**
 * @since 1.0.0
 * @category route context
 */
export const schemaNoBody = internal.schemaNoBody;
/**
 * @since 1.0.0
 * @category route context
 */
export const schemaParams = internal.schemaParams;
/**
 * @since 1.0.0
 * @category route context
 */
export const schemaPathParams = internal.schemaPathParams;
/**
 * @since 1.0.0
 * @category router config
 */
export const currentRouterConfig = internal.currentRouterConfig;
/**
 * @since 1.0.0
 * @category router config
 */
export const withRouterConfig = internal.withRouterConfig;
/**
 * @since 1.0.0
 * @category router config
 */
export const setRouterConfig = internal.setRouterConfig;
/**
 * @since 1.0.0
 * @category constructors
 */
export const empty = internal.empty;
/**
 * @since 1.0.0
 * @category constructors
 */
export const fromIterable = internal.fromIterable;
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeRoute = internal.makeRoute;
/**
 * @since 1.0.0
 * @category utils
 */
export const prefixPath = internal.prefixPath;
/**
 * @since 1.0.0
 * @category combinators
 */
export const prefixAll = internal.prefixAll;
/**
 * @since 1.0.0
 * @category combinators
 */
export const append = internal.append;
/**
 * @since 1.0.0
 * @category combinators
 */
export const concat = internal.concat;
/**
 * @since 1.0.0
 * @category combinators
 */
export const concatAll = internal.concatAll;
/**
 * @since 1.0.0
 * @category routing
 */
export const mount = internal.mount;
/**
 * @since 1.0.0
 * @category routing
 */
export const mountApp = internal.mountApp;
/**
 * @since 1.0.0
 * @category routing
 */
export const route = internal.route;
/**
 * @since 1.0.0
 * @category routing
 */
export const all = internal.all;
/**
 * @since 1.0.0
 * @category routing
 */
export const get = internal.get;
/**
 * @since 1.0.0
 * @category routing
 */
export const post = internal.post;
/**
 * @since 1.0.0
 * @category routing
 */
export const patch = internal.patch;
/**
 * @since 1.0.0
 * @category routing
 */
export const put = internal.put;
/**
 * @since 1.0.0
 * @category routing
 */
export const del = internal.del;
/**
 * @since 1.0.0
 * @category routing
 */
export const head = internal.head;
/**
 * @since 1.0.0
 * @category routing
 */
export const options = internal.options;
/**
 * @since 1.0.0
 * @category combinators
 */
export const use = internal.use;
/**
 * @since 1.0.0
 * @category combinators
 */
export const transform = internal.transform;
/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAll = internal.catchAll;
/**
 * @since 1.0.0
 * @category combinators
 */
export const catchAllCause = internal.catchAllCause;
/**
 * @since 1.0.0
 * @category combinators
 */
export const catchTag = internal.catchTag;
/**
 * @since 1.0.0
 * @category combinators
 */
export const catchTags = internal.catchTags;
/**
 * @since 1.0.0
 * @category combinators
 */
export const provideService = internal.provideService;
/**
 * @since 1.0.0
 * @category combinators
 */
export const provideServiceEffect = internal.provideServiceEffect;
/**
 * @since 1.0.0
 * @category tags
 */
export const Tag = internal.Tag;
/**
 * @since 1.0.0
 * @category tags
 */
export class Default extends /*#__PURE__*/Tag("@effect/platform/HttpRouter/Default")() {}
/**
 * @since 1.0.0
 * @category utils
 */
export const toHttpApp = internal.toHttpApp;
//# sourceMappingURL=HttpRouter.js.map