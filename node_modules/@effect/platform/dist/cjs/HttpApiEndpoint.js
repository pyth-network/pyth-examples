"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.put = exports.post = exports.patch = exports.options = exports.make = exports.isHttpApiEndpoint = exports.head = exports.get = exports.del = exports.TypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Option = _interopRequireWildcard(require("effect/Option"));
var _Pipeable = require("effect/Pipeable");
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var HttpApiSchema = _interopRequireWildcard(require("./HttpApiSchema.js"));
var HttpRouter = _interopRequireWildcard(require("./HttpRouter.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiEndpoint");
/**
 * @since 1.0.0
 * @category guards
 */
const isHttpApiEndpoint = u => Predicate.hasProperty(u, TypeId);
exports.isHttpApiEndpoint = isHttpApiEndpoint;
const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  },
  addSuccess(schema, annotations) {
    schema = annotations?.status ? schema.annotations(HttpApiSchema.annotations({
      status: annotations.status
    })) : schema;
    return makeProto({
      ...this,
      successSchema: this.successSchema === HttpApiSchema.NoContent ? schema : HttpApiSchema.UnionUnify(this.successSchema, schema)
    });
  },
  addError(schema, annotations) {
    return makeProto({
      ...this,
      errorSchema: HttpApiSchema.UnionUnify(this.errorSchema, annotations?.status ? schema.annotations(HttpApiSchema.annotations({
        status: annotations.status
      })) : schema)
    });
  },
  setPayload(schema) {
    return makeProto({
      ...this,
      payloadSchema: Option.some(schema)
    });
  },
  setPath(schema) {
    return makeProto({
      ...this,
      pathSchema: Option.some(schema)
    });
  },
  setUrlParams(schema) {
    return makeProto({
      ...this,
      urlParamsSchema: Option.some(schema)
    });
  },
  setHeaders(schema) {
    return makeProto({
      ...this,
      headersSchema: Option.some(schema)
    });
  },
  prefix(prefix) {
    return makeProto({
      ...this,
      path: HttpRouter.prefixPath(this.path, prefix)
    });
  },
  middleware(middleware) {
    return makeProto({
      ...this,
      errorSchema: HttpApiSchema.UnionUnify(this.errorSchema, middleware.failure),
      middlewares: new Set([...this.middlewares, middleware])
    });
  },
  annotate(tag, value) {
    return makeProto({
      ...this,
      annotations: Context.add(this.annotations, tag, value)
    });
  },
  annotateContext(context) {
    return makeProto({
      ...this,
      annotations: Context.merge(this.annotations, context)
    });
  }
};
const makeProto = options => Object.assign(Object.create(Proto), options);
/**
 * @since 1.0.0
 * @category constructors
 */
const make = method => (name, ...args) => {
  if (args.length === 1) {
    return makeProto({
      name,
      path: args[0],
      method,
      pathSchema: Option.none(),
      urlParamsSchema: Option.none(),
      payloadSchema: Option.none(),
      headersSchema: Option.none(),
      successSchema: HttpApiSchema.NoContent,
      errorSchema: Schema.Never,
      annotations: Context.empty(),
      middlewares: new Set()
    });
  }
  return (segments, ...schemas) => {
    let path = segments[0].replace(":", "::");
    let pathSchema = Option.none();
    if (schemas.length > 0) {
      const obj = {};
      for (let i = 0; i < schemas.length; i++) {
        const schema = schemas[i];
        const key = HttpApiSchema.getParam(schema.ast) ?? String(i);
        const optional = schema.ast._tag === "PropertySignatureTransformation" && schema.ast.from.isOptional || schema.ast._tag === "PropertySignatureDeclaration" && schema.ast.isOptional;
        obj[key] = schema;
        path += `:${key}${optional ? "?" : ""}${segments[i + 1].replace(":", "::")}`;
      }
      pathSchema = Option.some(Schema.Struct(obj));
    }
    return makeProto({
      name,
      path,
      method,
      pathSchema,
      urlParamsSchema: Option.none(),
      payloadSchema: Option.none(),
      headersSchema: Option.none(),
      successSchema: HttpApiSchema.NoContent,
      errorSchema: Schema.Never,
      annotations: Context.empty(),
      middlewares: new Set()
    });
  };
};
/**
 * @since 1.0.0
 * @category constructors
 */
exports.make = make;
const get = exports.get = /*#__PURE__*/make("GET");
/**
 * @since 1.0.0
 * @category constructors
 */
const post = exports.post = /*#__PURE__*/make("POST");
/**
 * @since 1.0.0
 * @category constructors
 */
const put = exports.put = /*#__PURE__*/make("PUT");
/**
 * @since 1.0.0
 * @category constructors
 */
const patch = exports.patch = /*#__PURE__*/make("PATCH");
/**
 * @since 1.0.0
 * @category constructors
 */
const del = exports.del = /*#__PURE__*/make("DELETE");
/**
 * @since 1.0.0
 * @category constructors
 */
const head = exports.head = /*#__PURE__*/make("HEAD");
/**
 * @since 1.0.0
 * @category constructors
 */
const options = exports.options = /*#__PURE__*/make("OPTIONS");
//# sourceMappingURL=HttpApiEndpoint.js.map