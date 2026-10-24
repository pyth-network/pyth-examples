"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.middlewareOpenApi = exports.middlewareCors = exports.middleware = exports.httpApp = exports.handler = exports.group = exports.buildMiddleware = exports.api = exports.Router = exports.Middleware = exports.HandlersTypeId = void 0;
exports.normalizeUrlParams = normalizeUrlParams;
exports.toWebHandler = exports.serve = exports.securitySetCookie = exports.securityDecode = void 0;
var Cause = _interopRequireWildcard(require("effect/Cause"));
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Encoding = _interopRequireWildcard(require("effect/Encoding"));
var Fiber = _interopRequireWildcard(require("effect/Fiber"));
var _Function = require("effect/Function");
var _GlobalValue = require("effect/GlobalValue");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Option = _interopRequireWildcard(require("effect/Option"));
var ParseResult = _interopRequireWildcard(require("effect/ParseResult"));
var _Pipeable = require("effect/Pipeable");
var Redacted = _interopRequireWildcard(require("effect/Redacted"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var _Unify = require("effect/Unify");
var HttpApi = _interopRequireWildcard(require("./HttpApi.js"));
var _HttpApiError = require("./HttpApiError.js");
var HttpApiMiddleware = _interopRequireWildcard(require("./HttpApiMiddleware.js"));
var HttpApiSchema = _interopRequireWildcard(require("./HttpApiSchema.js"));
var HttpApp = _interopRequireWildcard(require("./HttpApp.js"));
var HttpMethod = _interopRequireWildcard(require("./HttpMethod.js"));
var HttpMiddleware = _interopRequireWildcard(require("./HttpMiddleware.js"));
var HttpRouter = _interopRequireWildcard(require("./HttpRouter.js"));
var HttpServer = _interopRequireWildcard(require("./HttpServer.js"));
var HttpServerRequest = _interopRequireWildcard(require("./HttpServerRequest.js"));
var HttpServerResponse = _interopRequireWildcard(require("./HttpServerResponse.js"));
var Multipart = _interopRequireWildcard(require("./Multipart.js"));
var OpenApi = _interopRequireWildcard(require("./OpenApi.js"));
var UrlParams = _interopRequireWildcard(require("./UrlParams.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * The router that the API endpoints are attached to.
 *
 * @since 1.0.0
 * @category router
 */
class Router extends /*#__PURE__*/HttpRouter.Tag("@effect/platform/HttpApiBuilder/Router")() {}
/**
 * Create a top-level `HttpApi` layer.
 *
 * @since 1.0.0
 * @category constructors
 */
exports.Router = Router;
const api = api => Layer.effect(HttpApi.Api, Effect.map(Effect.context(), context => ({
  api: api,
  context
})));
/**
 * Build an `HttpApp` from an `HttpApi` instance, and serve it using an
 * `HttpServer`.
 *
 * Optionally, you can provide a middleware function that will be applied to
 * the `HttpApp` before serving.
 *
 * @since 1.0.0
 * @category constructors
 */
exports.api = api;
const serve = middleware => httpApp.pipe(Effect.map(app => HttpServer.serve(app, middleware)), Layer.unwrapEffect, Layer.provide([Router.Live, Middleware.layer]));
/**
 * Construct an `HttpApp` from an `HttpApi` instance.
 *
 * @since 1.0.0
 * @category constructors
 */
exports.serve = serve;
const httpApp = exports.httpApp = /*#__PURE__*/Effect.gen(function* () {
  const {
    api,
    context
  } = yield* HttpApi.Api;
  const middleware = makeMiddlewareMap(api.middlewares, context);
  const router = applyMiddleware(middleware, yield* HttpRouter.toHttpApp(yield* Router.router));
  const apiMiddlewareService = yield* Middleware;
  const apiMiddleware = yield* apiMiddlewareService.retrieve;
  const errorSchema = makeErrorSchema(api);
  const encodeError = Schema.encodeUnknown(errorSchema);
  return router.pipe(apiMiddleware, Effect.catchAllCause(cause => Effect.matchEffect(Effect.provide(encodeError(Cause.squash(cause)), context), {
    onFailure: () => Effect.failCause(cause),
    onSuccess: Effect.succeed
  })));
});
/**
 * @since 1.0.0
 * @category constructors
 */
const buildMiddleware = exports.buildMiddleware = /*#__PURE__*/Effect.fnUntraced(function* (api) {
  const context = yield* Effect.context();
  const middlewareMap = makeMiddlewareMap(api.middlewares, context);
  const errorSchema = makeErrorSchema(api);
  const encodeError = Schema.encodeUnknown(errorSchema);
  return effect => Effect.catchAllCause(applyMiddleware(middlewareMap, effect), cause => Effect.matchEffect(Effect.provide(encodeError(Cause.squash(cause)), context), {
    onFailure: () => Effect.failCause(cause),
    onSuccess: Effect.succeed
  }));
});
/**
 * Construct an http web handler from an `HttpApi` instance.
 *
 * **Example**
 *
 * ```ts
 * import { HttpApi, HttpApiBuilder, HttpServer } from "@effect/platform"
 * import { Layer } from "effect"
 *
 * class MyApi extends HttpApi.make("api") {}
 *
 * const MyApiLive = HttpApiBuilder.api(MyApi)
 *
 * const { dispose, handler } = HttpApiBuilder.toWebHandler(
 *   Layer.mergeAll(
 *     MyApiLive,
 *     // you could also use NodeHttpServer.layerContext, depending on your
 *     // server's platform
 *     HttpServer.layerContext
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
const toWebHandler = (layer, options) => {
  const layerMerged = Layer.mergeAll(layer, Router.Live, Middleware.layer);
  return HttpApp.toWebHandlerLayerWith(layerMerged, {
    memoMap: options?.memoMap,
    middleware: options?.middleware,
    toHandler: r => Effect.provide(httpApp, r)
  });
};
/**
 * @since 1.0.0
 * @category handlers
 */
exports.toWebHandler = toWebHandler;
const HandlersTypeId = exports.HandlersTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiBuilder/Handlers");
const HandlersProto = {
  [HandlersTypeId]: {
    _Endpoints: _Function.identity
  },
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  },
  handle(name, handler, options) {
    const endpoint = this.group.endpoints[name];
    return makeHandlers({
      group: this.group,
      handlers: Chunk.append(this.handlers, {
        endpoint,
        handler,
        withFullRequest: false,
        uninterruptible: options?.uninterruptible ?? false
      })
    });
  },
  handleRaw(name, handler, options) {
    const endpoint = this.group.endpoints[name];
    return makeHandlers({
      group: this.group,
      handlers: Chunk.append(this.handlers, {
        endpoint,
        handler,
        withFullRequest: true,
        uninterruptible: options?.uninterruptible ?? false
      })
    });
  }
};
const makeHandlers = options => {
  const self = Object.create(HandlersProto);
  self.group = options.group;
  self.handlers = options.handlers;
  return self;
};
/**
 * Create a `Layer` that will implement all the endpoints in an `HttpApi`.
 *
 * An unimplemented `Handlers` instance is passed to the `build` function, which
 * you can use to add handlers to the group.
 *
 * You can implement endpoints using the `handlers.handle` api.
 *
 * @since 1.0.0
 * @category handlers
 */
const group = (api, groupName, build) => Router.use(router => Effect.gen(function* () {
  const context = yield* Effect.context();
  const group = api.groups[groupName];
  const result = build(makeHandlers({
    group,
    handlers: Chunk.empty()
  }));
  const handlers = Effect.isEffect(result) ? yield* result : result;
  const groupMiddleware = makeMiddlewareMap(group.middlewares, context);
  const routes = [];
  for (const item of handlers.handlers) {
    const middleware = makeMiddlewareMap(item.endpoint.middlewares, context, groupMiddleware);
    routes.push(handlerToRoute(item.endpoint, middleware, function (request) {
      return Effect.mapInputContext(item.handler(request), input => Context.merge(context, input));
    }, item.withFullRequest, item.uninterruptible));
  }
  yield* router.concat(HttpRouter.fromIterable(routes));
}));
/**
 * Create a `Handler` for a single endpoint.
 *
 * @since 1.0.0
 * @category handlers
 */
exports.group = group;
const handler = (_api, _groupName, _name, f) => f;
// internal
exports.handler = handler;
const requestPayload = (request, urlParams, multipartLimits) => {
  if (!HttpMethod.hasBody(request.method)) {
    return Effect.succeed(urlParams);
  }
  const contentType = request.headers["content-type"] ? request.headers["content-type"].toLowerCase().trim() : "application/json";
  if (contentType.includes("application/json")) {
    return Effect.orDie(request.json);
  } else if (contentType.includes("multipart/form-data")) {
    return Effect.orDie(Option.match(multipartLimits, {
      onNone: () => request.multipart,
      onSome: limits => Multipart.withLimits(request.multipart, limits)
    }));
  } else if (contentType.includes("x-www-form-urlencoded")) {
    return Effect.map(Effect.orDie(request.urlParamsBody), UrlParams.toRecord);
  } else if (contentType.startsWith("text/")) {
    return Effect.orDie(request.text);
  }
  return Effect.map(Effect.orDie(request.arrayBuffer), buffer => new Uint8Array(buffer));
};
const makeMiddlewareMap = (middleware, context, initial) => {
  const map = new Map(initial);
  middleware.forEach(tag => {
    map.set(tag.key, {
      tag,
      effect: Context.unsafeGet(context, tag)
    });
  });
  return map;
};
function isSingleStringType(ast, key) {
  switch (ast._tag) {
    case "StringKeyword":
    case "Literal":
    case "TemplateLiteral":
    case "Enums":
      return true;
    case "TypeLiteral":
      {
        if (key !== undefined) {
          const ps = ast.propertySignatures.find(ps => ps.name === key);
          return ps !== undefined ? isSingleStringType(ps.type, key) : ast.indexSignatures.some(is => Schema.is(Schema.make(is.parameter))(key) && isSingleStringType(is.type));
        }
        return false;
      }
    case "Union":
      return ast.types.some(type => isSingleStringType(type, key));
    case "Suspend":
      return isSingleStringType(ast.f(), key);
    case "Refinement":
    case "Transformation":
      return isSingleStringType(ast.from, key);
  }
  return false;
}
/**
 * Normalizes the url parameters so that if a key is expected to be an array,
 * a single string value is wrapped in an array.
 *
 * @internal
 */
function normalizeUrlParams(params, ast) {
  const out = {};
  for (const key in params) {
    const value = params[key];
    out[key] = Array.isArray(value) || isSingleStringType(ast, key) ? value : [value];
  }
  return out;
}
const handlerToRoute = (endpoint_, middleware, handler, isFullRequest, uninterruptible) => {
  const endpoint = endpoint_;
  const isMultipartStream = endpoint.payloadSchema.pipe(Option.map(({
    ast
  }) => HttpApiSchema.getMultipartStream(ast) !== undefined), Option.getOrElse(_Function.constFalse));
  const multipartLimits = endpoint.payloadSchema.pipe(Option.flatMapNullable(({
    ast
  }) => HttpApiSchema.getMultipart(ast) || HttpApiSchema.getMultipartStream(ast)));
  const decodePath = Option.map(endpoint.pathSchema, Schema.decodeUnknown);
  const decodePayload = isFullRequest || isMultipartStream ? Option.none() : Option.map(endpoint.payloadSchema, Schema.decodeUnknown);
  const decodeHeaders = Option.map(endpoint.headersSchema, Schema.decodeUnknown);
  const encodeSuccess = Schema.encode(makeSuccessSchema(endpoint.successSchema));
  return HttpRouter.makeRoute(endpoint.method, endpoint.path, applyMiddleware(middleware, Effect.gen(function* () {
    const fiber = Option.getOrThrow(Fiber.getCurrentFiber());
    const context = fiber.currentContext;
    const httpRequest = Context.unsafeGet(context, HttpServerRequest.HttpServerRequest);
    const routeContext = Context.unsafeGet(context, HttpRouter.RouteContext);
    const urlParams = Context.unsafeGet(context, HttpServerRequest.ParsedSearchParams);
    const request = {
      request: httpRequest
    };
    if (decodePath._tag === "Some") {
      request.path = yield* decodePath.value(routeContext.params);
    }
    if (decodePayload._tag === "Some") {
      request.payload = yield* Effect.flatMap(requestPayload(httpRequest, urlParams, multipartLimits), decodePayload.value);
    } else if (isMultipartStream) {
      request.payload = Option.match(multipartLimits, {
        onNone: () => httpRequest.multipartStream,
        onSome: limits => Multipart.withLimitsStream(httpRequest.multipartStream, limits)
      });
    }
    if (decodeHeaders._tag === "Some") {
      request.headers = yield* decodeHeaders.value(httpRequest.headers);
    }
    if (endpoint.urlParamsSchema._tag === "Some") {
      const schema = endpoint.urlParamsSchema.value;
      request.urlParams = yield* Schema.decodeUnknown(schema)(normalizeUrlParams(urlParams, schema.ast));
    }
    const response = yield* handler(request);
    return HttpServerResponse.isServerResponse(response) ? response : yield* encodeSuccess(response);
  }).pipe(Effect.catchIf(ParseResult.isParseError, _HttpApiError.HttpApiDecodeError.refailParseError))), {
    uninterruptible
  });
};
const applyMiddleware = (middleware, handler) => {
  for (const entry of middleware.values()) {
    const effect = HttpApiMiddleware.SecurityTypeId in entry.tag ? makeSecurityMiddleware(entry) : entry.effect;
    if (entry.tag.optional) {
      const previous = handler;
      handler = Effect.matchEffect(effect, {
        onFailure: () => previous,
        onSuccess: entry.tag.provides !== undefined ? value => Effect.provideService(previous, entry.tag.provides, value) : _ => previous
      });
    } else {
      handler = entry.tag.provides !== undefined ? Effect.provideServiceEffect(handler, entry.tag.provides, effect) : Effect.zipRight(effect, handler);
    }
  }
  return handler;
};
const securityMiddlewareCache = /*#__PURE__*/(0, _GlobalValue.globalValue)("securityMiddlewareCache", () => new WeakMap());
const makeSecurityMiddleware = entry => {
  if (securityMiddlewareCache.has(entry)) {
    return securityMiddlewareCache.get(entry);
  }
  let effect;
  for (const [key, security] of Object.entries(entry.tag.security)) {
    const decode = securityDecode(security);
    const handler = entry.effect[key];
    const middleware = Effect.flatMap(decode, handler);
    effect = effect === undefined ? middleware : Effect.catchAll(effect, () => middleware);
  }
  if (effect === undefined) {
    effect = Effect.void;
  }
  securityMiddlewareCache.set(entry, effect);
  return effect;
};
const responseSchema = /*#__PURE__*/Schema.declare(HttpServerResponse.isServerResponse);
const makeSuccessSchema = schema => {
  const schemas = new Set();
  HttpApiSchema.deunionize(schemas, schema);
  return Schema.Union(...Array.from(schemas, toResponseSuccess));
};
const makeErrorSchema = api => {
  const schemas = new Set();
  HttpApiSchema.deunionize(schemas, api.errorSchema);
  for (const group of Object.values(api.groups)) {
    for (const endpoint of Object.values(group.endpoints)) {
      HttpApiSchema.deunionize(schemas, endpoint.errorSchema);
    }
    HttpApiSchema.deunionize(schemas, group.errorSchema);
  }
  return Schema.Union(...Array.from(schemas, toResponseError));
};
const decodeForbidden = (_, __, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, _, "Encode only schema"));
const toResponseSchema = getStatus => {
  const cache = new WeakMap();
  const schemaToResponse = (data, _, ast) => {
    const isEmpty = HttpApiSchema.isVoid(ast.to);
    const status = getStatus(ast.to);
    if (isEmpty) {
      return HttpServerResponse.empty({
        status
      });
    }
    const encoding = HttpApiSchema.getEncoding(ast.to);
    switch (encoding.kind) {
      case "Json":
        {
          return Effect.mapError(HttpServerResponse.json(data, {
            status,
            contentType: encoding.contentType
          }), error => new ParseResult.Type(ast, error, "Could not encode to JSON"));
        }
      case "Text":
        {
          return ParseResult.succeed(HttpServerResponse.text(data, {
            status,
            contentType: encoding.contentType
          }));
        }
      case "Uint8Array":
        {
          return ParseResult.succeed(HttpServerResponse.uint8Array(data, {
            status,
            contentType: encoding.contentType
          }));
        }
      case "UrlParams":
        {
          return ParseResult.succeed(HttpServerResponse.urlParams(data, {
            status,
            contentType: encoding.contentType
          }));
        }
    }
  };
  return schema => {
    if (cache.has(schema.ast)) {
      return cache.get(schema.ast);
    }
    const transform = Schema.transformOrFail(responseSchema, schema, {
      decode: decodeForbidden,
      encode: schemaToResponse
    });
    cache.set(transform.ast, transform);
    return transform;
  };
};
const toResponseSuccess = /*#__PURE__*/toResponseSchema(HttpApiSchema.getStatusSuccessAST);
const toResponseError = /*#__PURE__*/toResponseSchema(HttpApiSchema.getStatusErrorAST);
// ----------------------------------------------------------------------------
// Global middleware
// ----------------------------------------------------------------------------
/**
 * @since 1.0.0
 * @category middleware
 */
class Middleware extends /*#__PURE__*/Context.Tag("@effect/platform/HttpApiBuilder/Middleware")() {
  /**
   * @since 1.0.0
   */
  static layer = /*#__PURE__*/Layer.sync(Middleware, () => {
    let middleware = _Function.identity;
    return Middleware.of({
      add: f => Effect.sync(() => {
        const prev = middleware;
        middleware = app => f(prev(app));
      }),
      retrieve: Effect.sync(() => middleware)
    });
  });
}
exports.Middleware = Middleware;
const middlewareAdd = middleware => Effect.gen(function* () {
  const context = yield* Effect.context();
  const service = yield* Middleware;
  yield* service.add(httpApp => Effect.mapInputContext(middleware(httpApp), input => Context.merge(context, input)));
});
const middlewareAddNoContext = middleware => Effect.gen(function* () {
  const service = yield* Middleware;
  yield* service.add(middleware);
});
/**
 * Create an `HttpApi` level middleware `Layer`.
 *
 * @since 1.0.0
 * @category middleware
 */
const middleware = (...args) => {
  const apiFirst = HttpApi.isHttpApi(args[0]);
  const withContext = apiFirst ? args[2]?.withContext === true : args[1]?.withContext === true;
  const add = withContext ? middlewareAdd : middlewareAddNoContext;
  const middleware = apiFirst ? args[1] : args[0];
  return (Effect.isEffect(middleware) ? Layer.scopedDiscard(Effect.flatMap(middleware, add)) : Layer.scopedDiscard(add(middleware))).pipe(Layer.provide(Middleware.layer));
};
/**
 * A CORS middleware layer that can be provided to the `HttpApiBuilder.serve` layer.
 *
 * @since 1.0.0
 * @category middleware
 */
exports.middleware = middleware;
const middlewareCors = options => middleware(HttpMiddleware.cors(options));
/**
 * A middleware that adds an openapi.json endpoint to the API.
 *
 * @since 1.0.0
 * @category middleware
 */
exports.middlewareCors = middlewareCors;
const middlewareOpenApi = options => Router.use(router => Effect.gen(function* () {
  const {
    api
  } = yield* HttpApi.Api;
  const spec = OpenApi.fromApi(api, {
    additionalPropertiesStrategy: options?.additionalPropertiesStrategy
  });
  const response = yield* HttpServerResponse.json(spec).pipe(Effect.orDie);
  yield* router.get(options?.path ?? "/openapi.json", Effect.succeed(response));
}));
exports.middlewareOpenApi = middlewareOpenApi;
const bearerLen = `Bearer `.length;
const basicLen = `Basic `.length;
/**
 * @since 1.0.0
 * @category security
 */
const securityDecode = self => {
  switch (self._tag) {
    case "Bearer":
      {
        return Effect.map(HttpServerRequest.HttpServerRequest, request => Redacted.make((request.headers.authorization ?? "").slice(bearerLen)));
      }
    case "ApiKey":
      {
        const key = self.in === "header" ? self.key.toLowerCase() : self.key;
        const schema = Schema.Struct({
          [key]: Schema.String
        });
        const decode = (0, _Unify.unify)(self.in === "query" ? HttpServerRequest.schemaSearchParams(schema) : self.in === "cookie" ? HttpServerRequest.schemaCookies(schema) : HttpServerRequest.schemaHeaders(schema));
        return Effect.match(decode, {
          onFailure: () => Redacted.make(""),
          onSuccess: match => Redacted.make(match[key])
        });
      }
    case "Basic":
      {
        const empty = {
          username: "",
          password: Redacted.make("")
        };
        return HttpServerRequest.HttpServerRequest.pipe(Effect.flatMap(request => Encoding.decodeBase64String((request.headers.authorization ?? "").slice(basicLen))), Effect.match({
          onFailure: () => empty,
          onSuccess: header => {
            const parts = header.split(":");
            if (parts.length !== 2) {
              return empty;
            }
            return {
              username: parts[0],
              password: Redacted.make(parts[1])
            };
          }
        }));
      }
  }
};
/**
 * Set a cookie from an `HttpApiSecurity.HttpApiKey` instance.
 *
 * You can use this api before returning a response from an endpoint handler.
 *
 * ```ts skip-type-checking
 * handlers.handle(
 *   "authenticate",
 *   (_) => HttpApiBuilder.securitySetCookie(security, "secret123")
 * )
 * ```
 *
 * @since 1.0.0
 * @category middleware
 */
exports.securityDecode = securityDecode;
const securitySetCookie = (self, value, options) => {
  const stringValue = typeof value === "string" ? value : Redacted.value(value);
  return HttpApp.appendPreResponseHandler((_req, response) => Effect.orDie(HttpServerResponse.setCookie(response, self.key, stringValue, {
    secure: true,
    httpOnly: true,
    ...options
  })));
};
exports.securitySetCookie = securitySetCookie;
//# sourceMappingURL=HttpApiBuilder.js.map