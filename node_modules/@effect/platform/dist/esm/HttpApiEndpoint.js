import * as Context from "effect/Context";
import * as Option from "effect/Option";
import { pipeArguments } from "effect/Pipeable";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as HttpApiSchema from "./HttpApiSchema.js";
import * as HttpRouter from "./HttpRouter.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiEndpoint");
/**
 * @since 1.0.0
 * @category guards
 */
export const isHttpApiEndpoint = u => Predicate.hasProperty(u, TypeId);
const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments);
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
export const make = method => (name, ...args) => {
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
export const get = /*#__PURE__*/make("GET");
/**
 * @since 1.0.0
 * @category constructors
 */
export const post = /*#__PURE__*/make("POST");
/**
 * @since 1.0.0
 * @category constructors
 */
export const put = /*#__PURE__*/make("PUT");
/**
 * @since 1.0.0
 * @category constructors
 */
export const patch = /*#__PURE__*/make("PATCH");
/**
 * @since 1.0.0
 * @category constructors
 */
export const del = /*#__PURE__*/make("DELETE");
/**
 * @since 1.0.0
 * @category constructors
 */
export const head = /*#__PURE__*/make("HEAD");
/**
 * @since 1.0.0
 * @category constructors
 */
export const options = /*#__PURE__*/make("OPTIONS");
//# sourceMappingURL=HttpApiEndpoint.js.map