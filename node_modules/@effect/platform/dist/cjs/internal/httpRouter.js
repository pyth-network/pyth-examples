"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withRouterConfig = exports.use = exports.transform = exports.toHttpApp = exports.setRouterConfig = exports.schemaPathParams = exports.schemaParams = exports.schemaNoBody = exports.schemaJson = exports.route = exports.put = exports.provideServiceEffect = exports.provideService = exports.prefixPath = exports.prefixAll = exports.post = exports.patch = exports.params = exports.options = exports.mountApp = exports.mount = exports.makeRoute = exports.head = exports.get = exports.fromIterable = exports.empty = exports.del = exports.currentRouterConfig = exports.concatAll = exports.concat = exports.catchTags = exports.catchTag = exports.catchAllCause = exports.catchAll = exports.append = exports.all = exports.TypeId = exports.Tag = exports.RouteTypeId = exports.RouteContextTypeId = exports.RouteContext = void 0;
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Effectable = _interopRequireWildcard(require("effect/Effectable"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var _Function = require("effect/Function");
var _GlobalValue = require("effect/GlobalValue");
var Inspectable = _interopRequireWildcard(require("effect/Inspectable"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Tracer = _interopRequireWildcard(require("effect/Tracer"));
var FindMyWay = _interopRequireWildcard(require("find-my-way-ts"));
var HttpServer = _interopRequireWildcard(require("../HttpServer.js"));
var Error = _interopRequireWildcard(require("../HttpServerError.js"));
var ServerRequest = _interopRequireWildcard(require("../HttpServerRequest.js"));
var Respondable = _interopRequireWildcard(require("../HttpServerRespondable.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpRouter");
/** @internal */
const RouteTypeId = exports.RouteTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpRouter/Route");
/** @internal */
const RouteContextTypeId = exports.RouteContextTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpRouter/RouteContext");
/** @internal */
const RouteContext = exports.RouteContext = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpRouter/RouteContext");
const isRouter = u => Predicate.hasProperty(u, TypeId);
/** @internal */
const params = exports.params = /*#__PURE__*/Effect.map(RouteContext, _ => _.params);
/** @internal */
const schemaJson = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return Effect.flatMap(Effect.context(), context => {
    const request = Context.get(context, ServerRequest.HttpServerRequest);
    const searchParams = Context.get(context, ServerRequest.ParsedSearchParams);
    const routeContext = Context.get(context, RouteContext);
    return Effect.flatMap(request.json, body => parse({
      method: request.method,
      url: request.url,
      headers: request.headers,
      cookies: request.cookies,
      pathParams: routeContext.params,
      searchParams,
      body
    }));
  });
};
/** @internal */
exports.schemaJson = schemaJson;
const schemaNoBody = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return Effect.flatMap(Effect.context(), context => {
    const request = Context.get(context, ServerRequest.HttpServerRequest);
    const searchParams = Context.get(context, ServerRequest.ParsedSearchParams);
    const routeContext = Context.get(context, RouteContext);
    return parse({
      method: request.method,
      url: request.url,
      headers: request.headers,
      cookies: request.cookies,
      pathParams: routeContext.params,
      searchParams
    });
  });
};
/** @internal */
exports.schemaNoBody = schemaNoBody;
const schemaParams = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return Effect.flatMap(Effect.context(), context => {
    const searchParams = Context.get(context, ServerRequest.ParsedSearchParams);
    const routeContext = Context.get(context, RouteContext);
    return parse({
      ...searchParams,
      ...routeContext.params
    });
  });
};
/** @internal */
exports.schemaParams = schemaParams;
const schemaPathParams = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return Effect.flatMap(RouteContext, _ => parse(_.params));
};
/** @internal */
exports.schemaPathParams = schemaPathParams;
const currentRouterConfig = exports.currentRouterConfig = /*#__PURE__*/(0, _GlobalValue.globalValue)("@effect/platform/HttpRouter/currentRouterConfig", () => FiberRef.unsafeMake({}));
/** @internal */
const withRouterConfig = exports.withRouterConfig = /*#__PURE__*/(0, _Function.dual)(2, (effect, config) => Effect.locally(effect, currentRouterConfig, config));
/** @internal */
const setRouterConfig = config => Layer.locallyScoped(currentRouterConfig, config);
exports.setRouterConfig = setRouterConfig;
class RouterImpl extends Effectable.StructuralClass {
  routes;
  mounts;
  [TypeId];
  constructor(routes, mounts) {
    super();
    this.routes = routes;
    this.mounts = mounts;
    this[TypeId] = TypeId;
    this.httpApp = toHttpApp(this).pipe(Effect.flatMap(app => this.httpApp = app));
  }
  httpApp;
  commit() {
    return this.httpApp;
  }
  toJSON() {
    return {
      _id: "Router",
      routes: this.routes.toJSON(),
      mounts: this.mounts.toJSON()
    };
  }
  toString() {
    return Inspectable.format(this);
  }
  [Inspectable.NodeInspectSymbol]() {
    return this.toJSON();
  }
}
/** @internal */
const toHttpApp = self => Effect.map(FiberRef.get(currentRouterConfig), config => {
  const router = FindMyWay.make(config);
  const mounts = Chunk.toReadonlyArray(self.mounts).map(([path, app, options]) => [path, new RouteContextImpl(new RouteImpl("*", options?.includePrefix ? `${path}/*` : "/*", app, options?.includePrefix ? Option.none() : Option.some(path), false), {}), options]);
  const mountsLen = mounts.length;
  Chunk.forEach(self.routes, route => {
    if (route.method === "*") {
      router.all(route.path, route);
    } else {
      router.on(route.method, route.path, route);
    }
  });
  return Effect.withFiberRuntime(fiber => {
    const context = Context.unsafeMake(new Map(fiber.getFiberRef(FiberRef.currentContext).unsafeMap));
    const request = Context.unsafeGet(context, ServerRequest.HttpServerRequest);
    if (mountsLen > 0) {
      const searchIndex = request.url.indexOf("?");
      const pathname = searchIndex === -1 ? request.url : request.url.slice(0, searchIndex);
      for (let i = 0; i < mountsLen; i++) {
        const [path, routeContext, options] = mounts[i];
        if (pathname === path || pathname.startsWith(path + "/")) {
          context.unsafeMap.set(RouteContext.key, routeContext);
          if (options?.includePrefix !== true) {
            context.unsafeMap.set(ServerRequest.HttpServerRequest.key, sliceRequestUrl(request, path));
          }
          return Effect.locally(Effect.flatMap(routeContext.route.handler, Respondable.toResponse), FiberRef.currentContext, context);
        }
      }
    }
    let result = router.find(request.method, request.url);
    if (result === undefined && request.method === "HEAD") {
      result = router.find("GET", request.url);
    }
    if (result === undefined) {
      return Effect.fail(new Error.RouteNotFound({
        request
      }));
    }
    const route = result.handler;
    if (route.prefix._tag === "Some") {
      context.unsafeMap.set(ServerRequest.HttpServerRequest.key, sliceRequestUrl(request, route.prefix.value));
    }
    context.unsafeMap.set(ServerRequest.ParsedSearchParams.key, result.searchParams);
    context.unsafeMap.set(RouteContext.key, new RouteContextImpl(route, result.params));
    const span = Context.getOption(context, Tracer.ParentSpan);
    if (span._tag === "Some" && span.value._tag === "Span") {
      span.value.attribute("http.route", route.path);
    }
    const handlerResponse = Effect.flatMap(route.handler, Respondable.toResponse);
    return Effect.locally(route.uninterruptible ? handlerResponse : Effect.interruptible(handlerResponse), FiberRef.currentContext, context);
  });
});
exports.toHttpApp = toHttpApp;
function sliceRequestUrl(request, prefix) {
  const prefexLen = prefix.length;
  return request.modify({
    url: request.url.length <= prefexLen ? "/" : request.url.slice(prefexLen)
  });
}
class RouteImpl extends Inspectable.Class {
  method;
  path;
  handler;
  prefix;
  uninterruptible;
  [RouteTypeId];
  constructor(method, path, handler, prefix = Option.none(), uninterruptible = false) {
    super();
    this.method = method;
    this.path = path;
    this.handler = handler;
    this.prefix = prefix;
    this.uninterruptible = uninterruptible;
    this[RouteTypeId] = RouteTypeId;
  }
  toJSON() {
    return {
      _id: "@effect/platform/HttpRouter/Route",
      method: this.method,
      path: this.path,
      prefix: this.prefix.toJSON()
    };
  }
}
class RouteContextImpl {
  route;
  params;
  [RouteContextTypeId];
  constructor(route, params) {
    this.route = route;
    this.params = params;
    this[RouteContextTypeId] = RouteContextTypeId;
  }
}
/** @internal */
const empty = exports.empty = /*#__PURE__*/new RouterImpl(/*#__PURE__*/Chunk.empty(), /*#__PURE__*/Chunk.empty());
/** @internal */
const fromIterable = routes => new RouterImpl(Chunk.fromIterable(routes), Chunk.empty());
/** @internal */
exports.fromIterable = fromIterable;
const makeRoute = (method, path, handler, options) => new RouteImpl(method, path, handler, options?.prefix ? Option.some(options.prefix) : Option.none(), options?.uninterruptible ?? false);
/** @internal */
exports.makeRoute = makeRoute;
const append = exports.append = /*#__PURE__*/(0, _Function.dual)(2, (self, route) => new RouterImpl(Chunk.append(self.routes, route), self.mounts));
/** @internal */
const concat = exports.concat = /*#__PURE__*/(0, _Function.dual)(2, (self, that) => concatAll(self, that));
/** @internal */
const concatAll = (...routers) => new RouterImpl(routers.reduce((cur, acc) => Chunk.appendAll(cur, acc.routes), Chunk.empty()), routers.reduce((cur, acc) => Chunk.appendAll(cur, acc.mounts), Chunk.empty()));
exports.concatAll = concatAll;
const removeTrailingSlash = path => path.endsWith("/") ? path.slice(0, -1) : path;
/** @internal */
const prefixPath = exports.prefixPath = /*#__PURE__*/(0, _Function.dual)(2, (self, prefix) => {
  prefix = removeTrailingSlash(prefix);
  return self === "/" ? prefix : prefix + self;
});
/** @internal */
const prefixAll = exports.prefixAll = /*#__PURE__*/(0, _Function.dual)(2, (self, prefix) => {
  prefix = removeTrailingSlash(prefix);
  return new RouterImpl(Chunk.map(self.routes, route => new RouteImpl(route.method, route.path === "/" ? prefix : prefix + route.path, route.handler, Option.orElse(Option.map(route.prefix, _ => prefix + _), () => Option.some(prefix)), route.uninterruptible)), Chunk.map(self.mounts, ([path, app]) => [path === "/" ? prefix : prefix + path, app]));
});
/** @internal */
const mount = exports.mount = /*#__PURE__*/(0, _Function.dual)(3, (self, path, that) => concat(self, prefixAll(that, path)));
/** @internal */
const mountApp = exports.mountApp = /*#__PURE__*/(0, _Function.dual)(args => Predicate.hasProperty(args[0], TypeId), (self, path, that, options) => new RouterImpl(self.routes, Chunk.append(self.mounts, [removeTrailingSlash(path), that, options])));
/** @internal */
const route = method => (0, _Function.dual)(args => isRouter(args[0]), (self, path, handler, options) => new RouterImpl(Chunk.append(self.routes, new RouteImpl(method, path, handler, Option.none(), options?.uninterruptible ?? false)), self.mounts));
/** @internal */
exports.route = route;
const all = exports.all = /*#__PURE__*/route("*");
/** @internal */
const get = exports.get = /*#__PURE__*/route("GET");
/** @internal */
const post = exports.post = /*#__PURE__*/route("POST");
/** @internal */
const put = exports.put = /*#__PURE__*/route("PUT");
/** @internal */
const patch = exports.patch = /*#__PURE__*/route("PATCH");
/** @internal */
const del = exports.del = /*#__PURE__*/route("DELETE");
/** @internal */
const head = exports.head = /*#__PURE__*/route("HEAD");
/** @internal */
const options = exports.options = /*#__PURE__*/route("OPTIONS");
/** @internal */
const use = exports.use = /*#__PURE__*/(0, _Function.dual)(2, (self, f) => new RouterImpl(Chunk.map(self.routes, route => new RouteImpl(route.method, route.path, f(Effect.flatMap(route.handler, Respondable.toResponse)), route.prefix, route.uninterruptible)), Chunk.map(self.mounts, ([path, app]) => [path, f(app)])));
/** @internal */
const transform = exports.transform = /*#__PURE__*/(0, _Function.dual)(2, (self, f) => new RouterImpl(Chunk.map(self.routes, route => new RouteImpl(route.method, route.path, f(route.handler), route.prefix, route.uninterruptible)), Chunk.map(self.mounts, ([path, app]) => [path, Effect.flatMap(f(app), Respondable.toResponse)])));
/** @internal */
const catchAll = exports.catchAll = /*#__PURE__*/(0, _Function.dual)(2, (self, f) => transform(self, Effect.catchAll(f)));
/** @internal */
const catchAllCause = exports.catchAllCause = /*#__PURE__*/(0, _Function.dual)(2, (self, f) => transform(self, Effect.catchAllCause(f)));
/** @internal */
const catchTag = exports.catchTag = /*#__PURE__*/(0, _Function.dual)(3, (self, k, f) => transform(self, Effect.catchTag(k, f)));
/** @internal */
const catchTags = exports.catchTags = /*#__PURE__*/(0, _Function.dual)(2, (self, cases) => use(self, Effect.catchTags(cases)));
const provideService = exports.provideService = /*#__PURE__*/(0, _Function.dual)(3, (self, tag, service) => use(self, Effect.provideService(tag, service)));
/* @internal */
const provideServiceEffect = exports.provideServiceEffect = /*#__PURE__*/(0, _Function.dual)(3, (self, tag, effect) => use(self, Effect.provideServiceEffect(tag, effect)));
const makeService = () => {
  let router = empty;
  return {
    addRoute(route) {
      return Effect.sync(() => {
        router = append(router, route);
      });
    },
    all(path, handler, options) {
      return Effect.sync(() => {
        router = all(router, path, handler, options);
      });
    },
    get(path, handler, options) {
      return Effect.sync(() => {
        router = get(router, path, handler, options);
      });
    },
    post(path, handler, options) {
      return Effect.sync(() => {
        router = post(router, path, handler, options);
      });
    },
    put(path, handler, options) {
      return Effect.sync(() => {
        router = put(router, path, handler, options);
      });
    },
    patch(path, handler, options) {
      return Effect.sync(() => {
        router = patch(router, path, handler, options);
      });
    },
    del(path, handler, options) {
      return Effect.sync(() => {
        router = del(router, path, handler, options);
      });
    },
    head(path, handler, options) {
      return Effect.sync(() => {
        router = head(router, path, handler, options);
      });
    },
    options(path, handler, opts) {
      return Effect.sync(() => {
        router = options(router, path, handler, opts);
      });
    },
    router: Effect.sync(() => router),
    mount(path, that) {
      return Effect.sync(() => {
        router = mount(router, path, that);
      });
    },
    mountApp(path, app, options) {
      return Effect.sync(() => {
        router = mountApp(router, path, app, options);
      });
    },
    concat(that) {
      return Effect.sync(() => {
        router = concat(router, that);
      });
    }
  };
};
/* @internal */
const Tag = id => () => {
  const Err = globalThis.Error;
  const limit = Err.stackTraceLimit;
  Err.stackTraceLimit = 2;
  const creationError = new Err();
  Err.stackTraceLimit = limit;
  function TagClass() {}
  const TagClass_ = TagClass;
  Object.setPrototypeOf(TagClass, Object.getPrototypeOf(Context.GenericTag(id)));
  TagClass.key = id;
  Object.defineProperty(TagClass, "stack", {
    get() {
      return creationError.stack;
    }
  });
  TagClass_.Live = Layer.sync(TagClass_, makeService);
  TagClass_.router = Effect.flatMap(TagClass_, _ => _.router);
  TagClass_.use = f => TagClass_.pipe(Effect.flatMap(f), Layer.scopedDiscard, Layer.provide(TagClass_.Live));
  TagClass_.unwrap = f => TagClass_.pipe(Effect.flatMap(_ => _.router), Effect.map(f), Layer.unwrapEffect, Layer.provide(TagClass_.Live));
  TagClass_.serve = middleware => TagClass_.unwrap(HttpServer.serve(middleware));
  return TagClass;
};
exports.Tag = Tag;
//# sourceMappingURL=httpRouter.js.map