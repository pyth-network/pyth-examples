"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MiddlewareTypeId = exports.HttpRouter = exports.FindMyWay = void 0;
Object.defineProperty(exports, "RouteContext", {
  enumerable: true,
  get: function () {
    return _HttpRouter.RouteContext;
  }
});
exports.middleware = exports.make = exports.layer = exports.disableLogger = exports.cors = exports.addHttpApi = exports.addAll = exports.add = exports.TypeId = exports.RouterConfig = exports.RouteTypeId = void 0;
Object.defineProperty(exports, "params", {
  enumerable: true,
  get: function () {
    return _HttpRouter.params;
  }
});
exports.route = exports.prefixRoute = exports.prefixPath = void 0;
Object.defineProperty(exports, "schemaJson", {
  enumerable: true,
  get: function () {
    return _HttpRouter.schemaJson;
  }
});
Object.defineProperty(exports, "schemaNoBody", {
  enumerable: true,
  get: function () {
    return _HttpRouter.schemaNoBody;
  }
});
Object.defineProperty(exports, "schemaParams", {
  enumerable: true,
  get: function () {
    return _HttpRouter.schemaParams;
  }
});
Object.defineProperty(exports, "schemaPathParams", {
  enumerable: true,
  get: function () {
    return _HttpRouter.schemaPathParams;
  }
});
exports.use = exports.toWebHandler = exports.toHttpEffect = exports.serve = void 0;
var HttpServerRequest = _interopRequireWildcard(require("@effect/platform/HttpServerRequest"));
var HttpServerResponse = _interopRequireWildcard(require("@effect/platform/HttpServerResponse"));
var Arr = _interopRequireWildcard(require("effect/Array"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Scope = _interopRequireWildcard(require("effect/Scope"));
var Tracer = _interopRequireWildcard(require("effect/Tracer"));
var FindMyWay = _interopRequireWildcard(require("find-my-way-ts"));
var _FindMyWay = FindMyWay;
exports.FindMyWay = FindMyWay;
var HttpApiBuilder = _interopRequireWildcard(require("./HttpApiBuilder.js"));
var HttpApp = _interopRequireWildcard(require("./HttpApp.js"));
var HttpMiddleware = _interopRequireWildcard(require("./HttpMiddleware.js"));
var _HttpRouter = require("./HttpRouter.js");
var HttpServer = _interopRequireWildcard(require("./HttpServer.js"));
var HttpServerError = _interopRequireWildcard(require("./HttpServerError.js"));
var OpenApi = _interopRequireWildcard(require("./OpenApi.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category Re-exports
 */

/**
 * @since 1.0.0
 * @category HttpRouter
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpLayerRouter/HttpRouter");
/**
 * @since 1.0.0
 * @category HttpRouter
 */
const HttpRouter = exports.HttpRouter = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpLayerRouter");
/**
 * @since 1.0.0
 * @category HttpRouter
 */
const make = exports.make = /*#__PURE__*/Effect.gen(function* () {
  const router = FindMyWay.make(yield* RouterConfig);
  const middleware = new Set();
  const addAll = routes => Effect.contextWith(context => {
    const middleware = getMiddleware(context);
    const applyMiddleware = effect => {
      for (let i = 0; i < middleware.length; i++) {
        effect = middleware[i](effect);
      }
      return effect;
    };
    for (let i = 0; i < routes.length; i++) {
      const route = middleware.length === 0 ? routes[i] : makeRoute({
        ...routes[i],
        handler: applyMiddleware(routes[i].handler)
      });
      if (route.method === "*") {
        router.all(route.path, route);
      } else {
        router.on(route.method, route.path, route);
      }
    }
  });
  return HttpRouter.of({
    [TypeId]: TypeId,
    prefixed(prefix) {
      return HttpRouter.of({
        ...this,
        prefixed: newPrefix => this.prefixed(prefixPath(prefix, newPrefix)),
        addAll: routes => addAll(routes.map(prefixRoute(prefix))),
        add: (method, path, handler, options) => addAll([makeRoute({
          method,
          path: prefixPath(path, prefix),
          handler: Effect.isEffect(handler) ? handler : Effect.flatMap(HttpServerRequest.HttpServerRequest, handler),
          uninterruptible: options?.uninterruptible ?? false,
          prefix: Option.some(prefix)
        })])
      });
    },
    addAll,
    add: (method, path, handler, options) => addAll([route(method, path, handler, options)]),
    addGlobalMiddleware: middleware_ => Effect.sync(() => {
      middleware.add(middleware_);
    }),
    asHttpEffect() {
      let handler = Effect.withFiberRuntime(fiber => {
        const contextMap = new Map(fiber.currentContext.unsafeMap);
        const request = contextMap.get(HttpServerRequest.HttpServerRequest.key);
        let result = router.find(request.method, request.url);
        if (result === undefined && request.method === "HEAD") {
          result = router.find("GET", request.url);
        }
        if (result === undefined) {
          return Effect.fail(new HttpServerError.RouteNotFound({
            request
          }));
        }
        const route = result.handler;
        if (route.prefix._tag === "Some") {
          contextMap.set(HttpServerRequest.HttpServerRequest.key, sliceRequestUrl(request, route.prefix.value));
        }
        contextMap.set(HttpServerRequest.ParsedSearchParams.key, result.searchParams);
        contextMap.set(_HttpRouter.RouteContext.key, {
          [_HttpRouter.RouteContextTypeId]: _HttpRouter.RouteContextTypeId,
          route,
          params: result.params
        });
        const span = contextMap.get(Tracer.ParentSpan.key);
        if (span && span._tag === "Span") {
          span.attribute("http.route", route.path);
        }
        return Effect.locally(route.uninterruptible ? route.handler : Effect.interruptible(route.handler), FiberRef.currentContext, Context.unsafeMake(contextMap));
      });
      if (middleware.size === 0) return handler;
      for (const fn of Arr.reverse(middleware)) {
        handler = fn(handler);
      }
      return handler;
    }
  });
});
function sliceRequestUrl(request, prefix) {
  const prefexLen = prefix.length;
  return request.modify({
    url: request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen)
  });
}
/**
 * @since 1.0.0
 * @category Configuration
 */
class RouterConfig extends /*#__PURE__*/Context.Reference()("@effect/platform/HttpLayerRouter/RouterConfig", {
  defaultValue: /*#__PURE__*/(0, _Function.constant)({})
}) {}
exports.RouterConfig = RouterConfig;
/**
 * A helper function that is the equivalent of:
 *
 * ```ts
 * import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 *
 * const MyRoute = Layer.scopedDiscard(Effect.gen(function*() {
 *   const router = yield* HttpLayerRouter.HttpRouter
 *
 *   // then use `yield* router.add(...)` to add a route
 * }))
 * ```
 *
 * @since 1.0.0
 * @category HttpRouter
 */
const use = f => Layer.scopedDiscard(Effect.flatMap(HttpRouter, f));
/**
 * Create a layer that adds a single route to the HTTP router.
 *
 * ```ts
 * import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
 * import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
 *
 * const Route = HttpLayerRouter.add("GET", "/hello", HttpServerResponse.text("Hello, World!"))
 * ```
 *
 * @since 1.0.0
 * @category HttpRouter
 */
exports.use = use;
const add = (method, path, handler, options) => use(router => router.add(method, path, handler, options));
/**
 * Create a layer that adds multiple routes to the HTTP router.
 *
 * ```ts
 * import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
 * import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
 *
 * const Routes = HttpLayerRouter.addAll([
 *   HttpLayerRouter.route("GET", "/hello", HttpServerResponse.text("Hello, World!"))
 * ])
 * ```
 *
 * @since 1.0.0
 * @category HttpRouter
 */
exports.add = add;
const addAll = (routes, options) => Layer.scopedDiscard(Effect.gen(function* () {
  const toAdd = Effect.isEffect(routes) ? yield* routes : routes;
  let router = yield* HttpRouter;
  if (options?.prefix) {
    router = router.prefixed(options.prefix);
  }
  yield* router.addAll(toAdd);
}));
/**
 * @since 1.0.0
 * @category HttpRouter
 */
exports.addAll = addAll;
const layer = exports.layer = /*#__PURE__*/Layer.effect(HttpRouter, make);
/**
 * @since 1.0.0
 * @category HttpRouter
 */
const toHttpEffect = appLayer => Effect.gen(function* () {
  const scope = yield* Effect.scope;
  const memoMap = yield* Layer.CurrentMemoMap;
  const context = yield* Layer.buildWithMemoMap(Layer.provideMerge(appLayer, layer), memoMap, scope);
  const router = Context.get(context, HttpRouter);
  return router.asHttpEffect();
});
/**
 * @since 1.0.0
 * @category Route
 */
exports.toHttpEffect = toHttpEffect;
const RouteTypeId = exports.RouteTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpLayerRouter/Route");
const makeRoute = options => ({
  ...options,
  uninterruptible: options.uninterruptible ?? false,
  prefix: options.prefix ?? Option.none(),
  [RouteTypeId]: RouteTypeId
});
/**
 * @since 1.0.0
 * @category Route
 */
const route = (method, path, handler, options) => makeRoute({
  ...options,
  method,
  path,
  handler: Effect.isEffect(handler) ? handler : Effect.flatMap(HttpServerRequest.HttpServerRequest, handler),
  uninterruptible: options?.uninterruptible ?? false
});
exports.route = route;
const removeTrailingSlash = path => path.endsWith("/") ? path.slice(0, -1) : path;
/**
 * @since 1.0.0
 * @category PathInput
 */
const prefixPath = exports.prefixPath = /*#__PURE__*/(0, _Function.dual)(2, (self, prefix) => {
  prefix = removeTrailingSlash(prefix);
  return self === "/" ? prefix : prefix + self;
});
/**
 * @since 1.0.0
 * @category Route
 */
const prefixRoute = exports.prefixRoute = /*#__PURE__*/(0, _Function.dual)(2, (self, prefix) => makeRoute({
  ...self,
  path: prefixPath(self.path, prefix),
  prefix: Option.match(self.prefix, {
    onNone: () => Option.some(prefix),
    onSome: existingPrefix => Option.some(prefixPath(existingPrefix, prefix))
  })
}));
/**
 * @since 1.0.0
 * @category Middleware
 */
const MiddlewareTypeId = exports.MiddlewareTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpLayerRouter/Middleware");
/**
 * Create a middleware layer that can be used to modify requests and responses.
 *
 * By default, the middleware only affects the routes that it is provided to.
 *
 * If you want to create a middleware that applies globally to all routes, pass
 * the `global` option as `true`.
 *
 * ```ts
 * import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
 * import * as HttpMiddleware from "@effect/platform/HttpMiddleware"
 * import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
 * import * as Context from "effect/Context"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 *
 * // Here we are defining a CORS middleware
 * const CorsMiddleware = HttpLayerRouter.middleware(HttpMiddleware.cors()).layer
 * // You can also use HttpLayerRouter.cors() to create a CORS middleware
 *
 * class CurrentSession extends Context.Tag("CurrentSession")<CurrentSession, {
 *   readonly token: string
 * }>() {}
 *
 * // You can create middleware that provides a service to the HTTP requests.
 * const SessionMiddleware = HttpLayerRouter.middleware<{
 *   provides: CurrentSession
 * }>()(
 *   Effect.gen(function*() {
 *     yield* Effect.log("SessionMiddleware initialized")
 *
 *     return (httpEffect) =>
 *       Effect.provideService(httpEffect, CurrentSession, {
 *         token: "dummy-token"
 *       })
 *   })
 * ).layer
 *
 * Effect.gen(function*() {
 *   const router = yield* HttpLayerRouter.HttpRouter
 *   yield* router.add(
 *     "GET",
 *     "/hello",
 *     Effect.gen(function*() {
 *       // Requests can now access the current session
 *       const session = yield* CurrentSession
 *       return HttpServerResponse.text(`Hello, World! Your token is ${session.token}`)
 *     })
 *   )
 * }).pipe(
 *   Layer.effectDiscard,
 *   // Provide the SessionMiddleware & CorsMiddleware to some routes
 *   Layer.provide([SessionMiddleware, CorsMiddleware])
 * )
 * ```
 *
 * @since 1.0.0
 * @category Middleware
 */
const middleware = function () {
  if (arguments.length === 0) {
    return makeMiddleware;
  }
  return makeMiddleware(arguments[0], arguments[1]);
};
exports.middleware = middleware;
const makeMiddleware = (middleware, options) => options?.global ? Layer.scopedDiscard(Effect.gen(function* () {
  const router = yield* HttpRouter;
  const fn = Effect.isEffect(middleware) ? yield* middleware : middleware;
  yield* router.addGlobalMiddleware(fn);
})) : new MiddlewareImpl(Effect.isEffect(middleware) ? Layer.scopedContext(Effect.map(middleware, fn => Context.unsafeMake(new Map([[fnContextKey, fn]])))) : Layer.succeedContext(Context.unsafeMake(new Map([[fnContextKey, middleware]]))));
let middlewareId = 0;
const fnContextKey = "@effect/platform/HttpLayerRouter/MiddlewareFn";
class MiddlewareImpl {
  layerFn;
  dependencies;
  [MiddlewareTypeId] = {};
  constructor(layerFn, dependencies) {
    this.layerFn = layerFn;
    this.dependencies = dependencies;
    const contextKey = `@effect/platform/HttpLayerRouter/Middleware-${++middlewareId}`;
    this.layer = Layer.scopedContext(Effect.gen(this, function* () {
      const context = yield* Effect.context();
      const stack = [context.unsafeMap.get(fnContextKey)];
      if (this.dependencies) {
        const memoMap = yield* Layer.CurrentMemoMap;
        const scope = Context.get(context, Scope.Scope);
        const depsContext = yield* Layer.buildWithMemoMap(this.dependencies, memoMap, scope);
        // eslint-disable-next-line no-restricted-syntax
        stack.push(...getMiddleware(depsContext));
      }
      return Context.unsafeMake(new Map([[contextKey, stack]]));
    })).pipe(Layer.provide(this.layerFn));
  }
  layer;
  combine(other) {
    return new MiddlewareImpl(this.layerFn, this.dependencies ? Layer.provideMerge(this.dependencies, other.layer) : other.layer);
  }
}
const middlewareCache = /*#__PURE__*/new WeakMap();
const getMiddleware = context => {
  let arr = middlewareCache.get(context);
  if (arr) return arr;
  const topLevel = Arr.empty();
  let maxLength = 0;
  for (const [key, value] of context.unsafeMap) {
    if (key.startsWith("@effect/platform/HttpLayerRouter/Middleware-")) {
      topLevel.push(value);
      if (value.length > maxLength) {
        maxLength = value.length;
      }
    }
  }
  if (topLevel.length === 0) {
    arr = [];
  } else {
    const middleware = new Set();
    for (let i = maxLength - 1; i >= 0; i--) {
      for (const arr of topLevel) {
        if (i < arr.length) {
          middleware.add(arr[i]);
        }
      }
    }
    arr = Arr.fromIterable(middleware).reverse();
  }
  middlewareCache.set(context, arr);
  return arr;
};
/**
 * A middleware that applies CORS headers to the HTTP response.
 *
 * @since 1.0.0
 * @category Middleware
 */
const cors = options => middleware(HttpMiddleware.cors(options), {
  global: true
});
/**
 * A middleware that disables the logger for some routes.
 *
 * ```ts
 * import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
 * import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
 * import * as Layer from "effect/Layer"
 *
 * const Route = HttpLayerRouter.add("GET", "/hello", HttpServerResponse.text("Hello, World!")).pipe(
 *   // disable the logger for this route
 *   Layer.provide(HttpLayerRouter.disableLogger)
 * )
 * ```
 *
 * @since 1.0.0
 * @category Middleware
 */
exports.cors = cors;
const disableLogger = exports.disableLogger = /*#__PURE__*/middleware(HttpMiddleware.withLoggerDisabled).layer;
/**
 * ```ts
 * import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
 * import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
 * import * as HttpApi from "@effect/platform/HttpApi"
 * import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
 * import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
 * import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
 * import * as HttpApiScalar from "@effect/platform/HttpApiScalar"
 * import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
 * import * as HttpMiddleware from "@effect/platform/HttpMiddleware"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 * import { createServer } from "http"
 *
 * // First, we define our HttpApi
 * class MyApi extends HttpApi.make("api").add(
 *   HttpApiGroup.make("users").add(
 *     HttpApiEndpoint.get("me", "/me")
 *   ).prefix("/users")
 * ) {}
 *
 * // Implement the handlers for the API
 * const UsersApiLayer = HttpApiBuilder.group(MyApi, "users", (handers) => handers.handle("me", () => Effect.void))
 *
 * // Use `HttpLayerRouter.addHttpApi` to register the API with the router
 * const HttpApiRoutes = HttpLayerRouter.addHttpApi(MyApi, {
 *   openapiPath: "/docs/openapi.json"
 * }).pipe(
 *   // Provide the api handlers layer
 *   Layer.provide(UsersApiLayer)
 * )
 *
 * // Create a /docs route for the API documentation
 * const DocsRoute = HttpApiScalar.layerHttpLayerRouter({
 *   api: MyApi,
 *   path: "/docs"
 * })
 *
 * const CorsMiddleware = HttpLayerRouter.middleware(HttpMiddleware.cors())
 * // You can also use HttpLayerRouter.cors() to create a CORS middleware
 *
 * // Finally, we merge all routes and serve them using the Node HTTP server
 * const AllRoutes = Layer.mergeAll(
 *   HttpApiRoutes,
 *   DocsRoute
 * ).pipe(
 *   Layer.provide(CorsMiddleware.layer)
 * )
 *
 * HttpLayerRouter.serve(AllRoutes).pipe(
 *   Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
 *   Layer.launch,
 *   NodeRuntime.runMain
 * )
 * ```
 *
 * @since 1.0.0
 * @category HttpApi
 */
const addHttpApi = (api, options) => {
  const ApiMiddleware = middleware(HttpApiBuilder.buildMiddleware(api)).layer;
  return HttpApiBuilder.Router.unwrap(Effect.fnUntraced(function* (router_) {
    const router = yield* HttpRouter;
    let existing = existingRoutesMap.get(router);
    if (!existing) {
      existing = new Set();
      existingRoutesMap.set(router, existing);
    }
    const context = yield* Effect.context();
    const routes = Arr.empty();
    for (const route of router_.routes) {
      if (existing.has(route)) {
        continue;
      }
      existing.add(route);
      routes.push(makeRoute({
        ...route,
        handler: Effect.provide(route.handler, context)
      }));
    }
    yield* router.addAll(routes);
    if (options?.openapiPath) {
      const spec = OpenApi.fromApi(api);
      yield* router.add("GET", options.openapiPath, Effect.succeed(HttpServerResponse.unsafeJson(spec)));
    }
  }, Layer.effectDiscard)).pipe(Layer.provide(ApiMiddleware));
};
exports.addHttpApi = addHttpApi;
const existingRoutesMap = /*#__PURE__*/new WeakMap();
/**
 * Serves the provided application layer as an HTTP server.
 *
 * @since 1.0.0
 * @category Server
 */
const serve = (appLayer, options) => {
  let middleware = options?.middleware;
  if (options?.disableLogger !== true) {
    middleware = middleware ? (0, _Function.compose)(middleware, HttpMiddleware.logger) : HttpMiddleware.logger;
  }
  const RouterLayer = options?.routerConfig ? Layer.provide(layer, Layer.succeed(RouterConfig, options.routerConfig)) : layer;
  return Effect.gen(function* () {
    const router = yield* HttpRouter;
    const handler = router.asHttpEffect();
    return middleware ? HttpServer.serve(handler, middleware) : HttpServer.serve(handler);
  }).pipe(Layer.unwrapScoped, Layer.provide(appLayer), Layer.provide(RouterLayer), options?.disableListenLog ? _Function.identity : HttpServer.withLogAddress);
};
/**
 * @since 1.0.0
 * @category Server
 */
exports.serve = serve;
const toWebHandler = (appLayer, options) => {
  let middleware = options?.middleware;
  if (options?.disableLogger !== true) {
    middleware = middleware ? (0, _Function.compose)(middleware, HttpMiddleware.logger) : HttpMiddleware.logger;
  }
  const RouterLayer = Layer.provideMerge(appLayer, options?.routerConfig ? Layer.provide(layer, Layer.succeed(RouterConfig, options.routerConfig)) : layer);
  return HttpApp.toWebHandlerLayerWith(RouterLayer, {
    toHandler: r => Effect.succeed(Context.get(r.context, HttpRouter).asHttpEffect()),
    middleware,
    memoMap: options?.memoMap
  });
};
exports.toWebHandler = toWebHandler;
//# sourceMappingURL=HttpLayerRouter.js.map