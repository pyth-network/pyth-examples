import * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Effectable from "effect/Effectable";
import * as FiberRef from "effect/FiberRef";
import { dual } from "effect/Function";
import { globalValue } from "effect/GlobalValue";
import * as Inspectable from "effect/Inspectable";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Tracer from "effect/Tracer";
import * as FindMyWay from "find-my-way-ts";
import * as HttpServer from "../HttpServer.js";
import * as Error from "../HttpServerError.js";
import * as ServerRequest from "../HttpServerRequest.js";
import * as Respondable from "../HttpServerRespondable.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpRouter");
/** @internal */
export const RouteTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpRouter/Route");
/** @internal */
export const RouteContextTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpRouter/RouteContext");
/** @internal */
export const RouteContext = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpRouter/RouteContext");
const isRouter = u => Predicate.hasProperty(u, TypeId);
/** @internal */
export const params = /*#__PURE__*/Effect.map(RouteContext, _ => _.params);
/** @internal */
export const schemaJson = (schema, options) => {
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
export const schemaNoBody = (schema, options) => {
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
export const schemaParams = (schema, options) => {
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
export const schemaPathParams = (schema, options) => {
  const parse = Schema.decodeUnknown(schema, options);
  return Effect.flatMap(RouteContext, _ => parse(_.params));
};
/** @internal */
export const currentRouterConfig = /*#__PURE__*/globalValue("@effect/platform/HttpRouter/currentRouterConfig", () => FiberRef.unsafeMake({}));
/** @internal */
export const withRouterConfig = /*#__PURE__*/dual(2, (effect, config) => Effect.locally(effect, currentRouterConfig, config));
/** @internal */
export const setRouterConfig = config => Layer.locallyScoped(currentRouterConfig, config);
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
export const toHttpApp = self => Effect.map(FiberRef.get(currentRouterConfig), config => {
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
export const empty = /*#__PURE__*/new RouterImpl(/*#__PURE__*/Chunk.empty(), /*#__PURE__*/Chunk.empty());
/** @internal */
export const fromIterable = routes => new RouterImpl(Chunk.fromIterable(routes), Chunk.empty());
/** @internal */
export const makeRoute = (method, path, handler, options) => new RouteImpl(method, path, handler, options?.prefix ? Option.some(options.prefix) : Option.none(), options?.uninterruptible ?? false);
/** @internal */
export const append = /*#__PURE__*/dual(2, (self, route) => new RouterImpl(Chunk.append(self.routes, route), self.mounts));
/** @internal */
export const concat = /*#__PURE__*/dual(2, (self, that) => concatAll(self, that));
/** @internal */
export const concatAll = (...routers) => new RouterImpl(routers.reduce((cur, acc) => Chunk.appendAll(cur, acc.routes), Chunk.empty()), routers.reduce((cur, acc) => Chunk.appendAll(cur, acc.mounts), Chunk.empty()));
const removeTrailingSlash = path => path.endsWith("/") ? path.slice(0, -1) : path;
/** @internal */
export const prefixPath = /*#__PURE__*/dual(2, (self, prefix) => {
  prefix = removeTrailingSlash(prefix);
  return self === "/" ? prefix : prefix + self;
});
/** @internal */
export const prefixAll = /*#__PURE__*/dual(2, (self, prefix) => {
  prefix = removeTrailingSlash(prefix);
  return new RouterImpl(Chunk.map(self.routes, route => new RouteImpl(route.method, route.path === "/" ? prefix : prefix + route.path, route.handler, Option.orElse(Option.map(route.prefix, _ => prefix + _), () => Option.some(prefix)), route.uninterruptible)), Chunk.map(self.mounts, ([path, app]) => [path === "/" ? prefix : prefix + path, app]));
});
/** @internal */
export const mount = /*#__PURE__*/dual(3, (self, path, that) => concat(self, prefixAll(that, path)));
/** @internal */
export const mountApp = /*#__PURE__*/dual(args => Predicate.hasProperty(args[0], TypeId), (self, path, that, options) => new RouterImpl(self.routes, Chunk.append(self.mounts, [removeTrailingSlash(path), that, options])));
/** @internal */
export const route = method => dual(args => isRouter(args[0]), (self, path, handler, options) => new RouterImpl(Chunk.append(self.routes, new RouteImpl(method, path, handler, Option.none(), options?.uninterruptible ?? false)), self.mounts));
/** @internal */
export const all = /*#__PURE__*/route("*");
/** @internal */
export const get = /*#__PURE__*/route("GET");
/** @internal */
export const post = /*#__PURE__*/route("POST");
/** @internal */
export const put = /*#__PURE__*/route("PUT");
/** @internal */
export const patch = /*#__PURE__*/route("PATCH");
/** @internal */
export const del = /*#__PURE__*/route("DELETE");
/** @internal */
export const head = /*#__PURE__*/route("HEAD");
/** @internal */
export const options = /*#__PURE__*/route("OPTIONS");
/** @internal */
export const use = /*#__PURE__*/dual(2, (self, f) => new RouterImpl(Chunk.map(self.routes, route => new RouteImpl(route.method, route.path, f(Effect.flatMap(route.handler, Respondable.toResponse)), route.prefix, route.uninterruptible)), Chunk.map(self.mounts, ([path, app]) => [path, f(app)])));
/** @internal */
export const transform = /*#__PURE__*/dual(2, (self, f) => new RouterImpl(Chunk.map(self.routes, route => new RouteImpl(route.method, route.path, f(route.handler), route.prefix, route.uninterruptible)), Chunk.map(self.mounts, ([path, app]) => [path, Effect.flatMap(f(app), Respondable.toResponse)])));
/** @internal */
export const catchAll = /*#__PURE__*/dual(2, (self, f) => transform(self, Effect.catchAll(f)));
/** @internal */
export const catchAllCause = /*#__PURE__*/dual(2, (self, f) => transform(self, Effect.catchAllCause(f)));
/** @internal */
export const catchTag = /*#__PURE__*/dual(3, (self, k, f) => transform(self, Effect.catchTag(k, f)));
/** @internal */
export const catchTags = /*#__PURE__*/dual(2, (self, cases) => use(self, Effect.catchTags(cases)));
export const provideService = /*#__PURE__*/dual(3, (self, tag, service) => use(self, Effect.provideService(tag, service)));
/* @internal */
export const provideServiceEffect = /*#__PURE__*/dual(3, (self, tag, effect) => use(self, Effect.provideServiceEffect(tag, effect)));
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
export const Tag = id => () => {
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
//# sourceMappingURL=httpRouter.js.map