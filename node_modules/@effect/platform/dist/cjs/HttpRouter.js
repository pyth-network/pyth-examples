"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withRouterConfig = exports.use = exports.transform = exports.toHttpApp = exports.setRouterConfig = exports.schemaPathParams = exports.schemaParams = exports.schemaNoBody = exports.schemaJson = exports.route = exports.put = exports.provideServiceEffect = exports.provideService = exports.prefixPath = exports.prefixAll = exports.post = exports.patch = exports.params = exports.options = exports.mountApp = exports.mount = exports.makeRoute = exports.head = exports.get = exports.fromIterable = exports.empty = exports.del = exports.currentRouterConfig = exports.concatAll = exports.concat = exports.catchTags = exports.catchTag = exports.catchAllCause = exports.catchAll = exports.append = exports.all = exports.TypeId = exports.Tag = exports.RouteTypeId = exports.RouteContextTypeId = exports.RouteContext = exports.Default = void 0;
var internal = _interopRequireWildcard(require("./internal/httpRouter.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category type ids
 */
const RouteTypeId = exports.RouteTypeId = internal.RouteTypeId;
/**
 * @since 1.0.0
 * @category type ids
 */
const RouteContextTypeId = exports.RouteContextTypeId = internal.RouteContextTypeId;
/**
 * @since 1.0.0
 * @category route context
 */
const RouteContext = exports.RouteContext = internal.RouteContext;
/**
 * @since 1.0.0
 * @category route context
 */
const params = exports.params = internal.params;
/**
 * @since 1.0.0
 * @category route context
 */
const schemaJson = exports.schemaJson = internal.schemaJson;
/**
 * @since 1.0.0
 * @category route context
 */
const schemaNoBody = exports.schemaNoBody = internal.schemaNoBody;
/**
 * @since 1.0.0
 * @category route context
 */
const schemaParams = exports.schemaParams = internal.schemaParams;
/**
 * @since 1.0.0
 * @category route context
 */
const schemaPathParams = exports.schemaPathParams = internal.schemaPathParams;
/**
 * @since 1.0.0
 * @category router config
 */
const currentRouterConfig = exports.currentRouterConfig = internal.currentRouterConfig;
/**
 * @since 1.0.0
 * @category router config
 */
const withRouterConfig = exports.withRouterConfig = internal.withRouterConfig;
/**
 * @since 1.0.0
 * @category router config
 */
const setRouterConfig = exports.setRouterConfig = internal.setRouterConfig;
/**
 * @since 1.0.0
 * @category constructors
 */
const empty = exports.empty = internal.empty;
/**
 * @since 1.0.0
 * @category constructors
 */
const fromIterable = exports.fromIterable = internal.fromIterable;
/**
 * @since 1.0.0
 * @category constructors
 */
const makeRoute = exports.makeRoute = internal.makeRoute;
/**
 * @since 1.0.0
 * @category utils
 */
const prefixPath = exports.prefixPath = internal.prefixPath;
/**
 * @since 1.0.0
 * @category combinators
 */
const prefixAll = exports.prefixAll = internal.prefixAll;
/**
 * @since 1.0.0
 * @category combinators
 */
const append = exports.append = internal.append;
/**
 * @since 1.0.0
 * @category combinators
 */
const concat = exports.concat = internal.concat;
/**
 * @since 1.0.0
 * @category combinators
 */
const concatAll = exports.concatAll = internal.concatAll;
/**
 * @since 1.0.0
 * @category routing
 */
const mount = exports.mount = internal.mount;
/**
 * @since 1.0.0
 * @category routing
 */
const mountApp = exports.mountApp = internal.mountApp;
/**
 * @since 1.0.0
 * @category routing
 */
const route = exports.route = internal.route;
/**
 * @since 1.0.0
 * @category routing
 */
const all = exports.all = internal.all;
/**
 * @since 1.0.0
 * @category routing
 */
const get = exports.get = internal.get;
/**
 * @since 1.0.0
 * @category routing
 */
const post = exports.post = internal.post;
/**
 * @since 1.0.0
 * @category routing
 */
const patch = exports.patch = internal.patch;
/**
 * @since 1.0.0
 * @category routing
 */
const put = exports.put = internal.put;
/**
 * @since 1.0.0
 * @category routing
 */
const del = exports.del = internal.del;
/**
 * @since 1.0.0
 * @category routing
 */
const head = exports.head = internal.head;
/**
 * @since 1.0.0
 * @category routing
 */
const options = exports.options = internal.options;
/**
 * @since 1.0.0
 * @category combinators
 */
const use = exports.use = internal.use;
/**
 * @since 1.0.0
 * @category combinators
 */
const transform = exports.transform = internal.transform;
/**
 * @since 1.0.0
 * @category combinators
 */
const catchAll = exports.catchAll = internal.catchAll;
/**
 * @since 1.0.0
 * @category combinators
 */
const catchAllCause = exports.catchAllCause = internal.catchAllCause;
/**
 * @since 1.0.0
 * @category combinators
 */
const catchTag = exports.catchTag = internal.catchTag;
/**
 * @since 1.0.0
 * @category combinators
 */
const catchTags = exports.catchTags = internal.catchTags;
/**
 * @since 1.0.0
 * @category combinators
 */
const provideService = exports.provideService = internal.provideService;
/**
 * @since 1.0.0
 * @category combinators
 */
const provideServiceEffect = exports.provideServiceEffect = internal.provideServiceEffect;
/**
 * @since 1.0.0
 * @category tags
 */
const Tag = exports.Tag = internal.Tag;
/**
 * @since 1.0.0
 * @category tags
 */
class Default extends /*#__PURE__*/Tag("@effect/platform/HttpRouter/Default")() {}
/**
 * @since 1.0.0
 * @category utils
 */
exports.Default = Default;
const toHttpApp = exports.toHttpApp = internal.toHttpApp;
//# sourceMappingURL=HttpRouter.js.map