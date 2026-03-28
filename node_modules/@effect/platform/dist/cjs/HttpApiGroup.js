"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.isHttpApiGroup = exports.TypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var _Pipeable = require("effect/Pipeable");
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Record = _interopRequireWildcard(require("effect/Record"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var HttpApiSchema = _interopRequireWildcard(require("./HttpApiSchema.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiGroup");
/**
 * @since 1.0.0
 * @category guards
 */
const isHttpApiGroup = u => Predicate.hasProperty(u, TypeId);
exports.isHttpApiGroup = isHttpApiGroup;
const Proto = {
  [TypeId]: TypeId,
  add(endpoint) {
    return makeProto({
      identifier: this.identifier,
      topLevel: this.topLevel,
      endpoints: {
        ...this.endpoints,
        [endpoint.name]: endpoint
      },
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    });
  },
  addError(schema, annotations) {
    return makeProto({
      identifier: this.identifier,
      topLevel: this.topLevel,
      endpoints: this.endpoints,
      errorSchema: HttpApiSchema.UnionUnify(this.errorSchema, annotations?.status ? schema.annotations(HttpApiSchema.annotations({
        status: annotations.status
      })) : schema),
      annotations: this.annotations,
      middlewares: this.middlewares
    });
  },
  prefix(prefix) {
    return makeProto({
      identifier: this.identifier,
      topLevel: this.topLevel,
      endpoints: Record.map(this.endpoints, endpoint => endpoint.prefix(prefix)),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    });
  },
  middleware(middleware) {
    return makeProto({
      identifier: this.identifier,
      topLevel: this.topLevel,
      endpoints: this.endpoints,
      errorSchema: HttpApiSchema.UnionUnify(this.errorSchema, middleware.failure),
      annotations: this.annotations,
      middlewares: new Set([...this.middlewares, middleware])
    });
  },
  middlewareEndpoints(middleware) {
    return makeProto({
      identifier: this.identifier,
      topLevel: this.topLevel,
      endpoints: Record.map(this.endpoints, endpoint => endpoint.middleware(middleware)),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    });
  },
  annotateContext(context) {
    return makeProto({
      identifier: this.identifier,
      topLevel: this.topLevel,
      endpoints: this.endpoints,
      errorSchema: this.errorSchema,
      annotations: Context.merge(this.annotations, context),
      middlewares: this.middlewares
    });
  },
  annotate(tag, value) {
    return makeProto({
      identifier: this.identifier,
      topLevel: this.topLevel,
      endpoints: this.endpoints,
      errorSchema: this.errorSchema,
      annotations: Context.add(this.annotations, tag, value),
      middlewares: this.middlewares
    });
  },
  annotateEndpointsContext(context) {
    return makeProto({
      identifier: this.identifier,
      topLevel: this.topLevel,
      endpoints: Record.map(this.endpoints, endpoint => endpoint.annotateContext(context)),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    });
  },
  annotateEndpoints(tag, value) {
    return makeProto({
      identifier: this.identifier,
      topLevel: this.topLevel,
      endpoints: Record.map(this.endpoints, endpoint => endpoint.annotate(tag, value)),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    });
  },
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
};
const makeProto = options => {
  function HttpApiGroup() {}
  Object.setPrototypeOf(HttpApiGroup, Proto);
  return Object.assign(HttpApiGroup, options);
};
/**
 * An `HttpApiGroup` is a collection of `HttpApiEndpoint`s. You can use an `HttpApiGroup` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.group` api.
 *
 * @since 1.0.0
 * @category constructors
 */
const make = (identifier, options) => makeProto({
  identifier,
  topLevel: options?.topLevel ?? false,
  endpoints: Record.empty(),
  errorSchema: Schema.Never,
  annotations: Context.empty(),
  middlewares: new Set()
});
exports.make = make;
//# sourceMappingURL=HttpApiGroup.js.map