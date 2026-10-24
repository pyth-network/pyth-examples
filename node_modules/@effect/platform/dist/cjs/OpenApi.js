"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromApi = exports.annotations = exports.Version = exports.Transform = exports.Title = exports.Summary = exports.Servers = exports.Override = exports.License = exports.Identifier = exports.Format = exports.ExternalDocs = exports.Exclude = exports.Description = exports.Deprecated = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var _Function = require("effect/Function");
var _GlobalValue = require("effect/GlobalValue");
var Option = _interopRequireWildcard(require("effect/Option"));
var HttpApi = _interopRequireWildcard(require("./HttpApi.js"));
var HttpApiMiddleware = _interopRequireWildcard(require("./HttpApiMiddleware.js"));
var HttpApiSchema = _interopRequireWildcard(require("./HttpApiSchema.js"));
var HttpMethod = _interopRequireWildcard(require("./HttpMethod.js"));
var JsonSchema = _interopRequireWildcard(require("./OpenApiJsonSchema.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category annotations
 */
class Identifier extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Identifier")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.Identifier = Identifier;
class Title extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Title")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.Title = Title;
class Version extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Version")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.Version = Version;
class Description extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Description")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.Description = Description;
class License extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/License")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.License = License;
class ExternalDocs extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/ExternalDocs")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.ExternalDocs = ExternalDocs;
class Servers extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Servers")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.Servers = Servers;
class Format extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Format")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.Format = Format;
class Summary extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Summary")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.Summary = Summary;
class Deprecated extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Deprecated")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.Deprecated = Deprecated;
class Override extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Override")() {}
/**
 * @since 1.0.0
 * @category annotations
 */
exports.Override = Override;
class Exclude extends /*#__PURE__*/Context.Reference()("@effect/platform/OpenApi/Exclude", {
  defaultValue: _Function.constFalse
}) {}
/**
 * Transforms the generated OpenAPI specification
 * @since 1.0.0
 * @category annotations
 */
exports.Exclude = Exclude;
class Transform extends /*#__PURE__*/Context.Tag("@effect/platform/OpenApi/Transform")() {}
exports.Transform = Transform;
const contextPartial = tags => {
  const entries = Object.entries(tags);
  return options => {
    let context = Context.empty();
    for (const [key, tag] of entries) {
      if (options[key] !== undefined) {
        context = Context.add(context, tag, options[key]);
      }
    }
    return context;
  };
};
/**
 * @since 1.0.0
 * @category annotations
 */
const annotations = exports.annotations = /*#__PURE__*/contextPartial({
  identifier: Identifier,
  title: Title,
  version: Version,
  description: Description,
  license: License,
  summary: Summary,
  deprecated: Deprecated,
  externalDocs: ExternalDocs,
  servers: Servers,
  format: Format,
  override: Override,
  exclude: Exclude,
  transform: Transform
});
const apiCache = /*#__PURE__*/(0, _GlobalValue.globalValue)("@effect/platform/OpenApi/apiCache", () => new WeakMap());
/**
 * This function checks if a given tag exists within the provided context. If
 * the tag is present, it retrieves the associated value and applies the given
 * callback function to it. If the tag is not found, the function does nothing.
 */
function processAnnotation(ctx, tag, f) {
  const o = Context.getOption(ctx, tag);
  if (Option.isSome(o)) {
    f(o.value);
  }
}
/**
 * Converts an `HttpApi` instance into an OpenAPI Specification object.
 *
 * **Details**
 *
 * This function takes an `HttpApi` instance, which defines a structured API,
 * and generates an OpenAPI Specification (`OpenAPISpec`). The resulting spec
 * adheres to the OpenAPI 3.1.0 standard and includes detailed metadata such as
 * paths, operations, security schemes, and components. The function processes
 * the API's annotations, middleware, groups, and endpoints to build a complete
 * and accurate representation of the API in OpenAPI format.
 *
 * The function also deduplicates schemas, applies transformations, and
 * integrates annotations like descriptions, summaries, external documentation,
 * and overrides. Cached results are used for better performance when the same
 * `HttpApi` instance is processed multiple times.
 *
 * **Options**
 *
 * - `additionalPropertiesStrategy`: Controls the handling of additional properties. Possible values are:
 *   - `"strict"`: Disallow additional properties (default behavior).
 *   - `"allow"`: Allow additional properties.
 *
 * **Example**
 *
 * ```ts
 * import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
 * import { Schema } from "effect"
 *
 * const api = HttpApi.make("api").add(
 *   HttpApiGroup.make("group").add(
 *     HttpApiEndpoint.get("get", "/items")
 *       .addSuccess(Schema.Array(Schema.String))
 *   )
 * )
 *
 * const spec = OpenApi.fromApi(api)
 *
 * console.log(JSON.stringify(spec, null, 2))
 * // Output: OpenAPI specification in JSON format
 * ```
 *
 * @category constructors
 * @since 1.0.0
 */
const fromApi = (api, options) => {
  const cached = apiCache.get(api);
  if (cached !== undefined) {
    return cached;
  }
  const jsonSchemaDefs = {};
  let spec = {
    openapi: "3.1.0",
    info: {
      title: Context.getOrElse(api.annotations, Title, () => "Api"),
      version: Context.getOrElse(api.annotations, Version, () => "0.0.1")
    },
    paths: {},
    components: {
      schemas: jsonSchemaDefs,
      securitySchemes: {}
    },
    security: [],
    tags: []
  };
  function processAST(ast) {
    return JsonSchema.fromAST(ast, {
      defs: jsonSchemaDefs,
      additionalPropertiesStrategy: options?.additionalPropertiesStrategy
    });
  }
  function processHttpApiSecurity(name, security) {
    if (spec.components.securitySchemes[name] !== undefined) {
      return;
    }
    spec.components.securitySchemes[name] = makeSecurityScheme(security);
  }
  processAnnotation(api.annotations, HttpApi.AdditionalSchemas, componentSchemas => {
    componentSchemas.forEach(componentSchema => processAST(componentSchema.ast));
  });
  processAnnotation(api.annotations, Description, description => {
    spec.info.description = description;
  });
  processAnnotation(api.annotations, License, license => {
    spec.info.license = license;
  });
  processAnnotation(api.annotations, Summary, summary => {
    spec.info.summary = summary;
  });
  processAnnotation(api.annotations, Servers, servers => {
    spec.servers = [...servers];
  });
  api.middlewares.forEach(middleware => {
    if (!HttpApiMiddleware.isSecurity(middleware)) {
      return;
    }
    for (const [name, security] of Object.entries(middleware.security)) {
      processHttpApiSecurity(name, security);
      spec.security.push({
        [name]: []
      });
    }
  });
  HttpApi.reflect(api, {
    onGroup({
      group
    }) {
      if (Context.get(group.annotations, Exclude)) {
        return;
      }
      let tag = {
        name: Context.getOrElse(group.annotations, Title, () => group.identifier)
      };
      processAnnotation(group.annotations, Description, description => {
        tag.description = description;
      });
      processAnnotation(group.annotations, ExternalDocs, externalDocs => {
        tag.externalDocs = externalDocs;
      });
      processAnnotation(group.annotations, Override, override => {
        Object.assign(tag, override);
      });
      processAnnotation(group.annotations, Transform, transformFn => {
        tag = transformFn(tag);
      });
      spec.tags.push(tag);
    },
    onEndpoint({
      endpoint,
      errors,
      group,
      mergedAnnotations,
      middleware,
      payloads,
      successes
    }) {
      if (Context.get(mergedAnnotations, Exclude)) {
        return;
      }
      let op = {
        tags: [Context.getOrElse(group.annotations, Title, () => group.identifier)],
        operationId: Context.getOrElse(endpoint.annotations, Identifier, () => group.topLevel ? endpoint.name : `${group.identifier}.${endpoint.name}`),
        parameters: [],
        security: [],
        responses: {}
      };
      function processResponseMap(map, defaultDescription) {
        for (const [status, {
          ast,
          description
        }] of map) {
          if (op.responses[status]) continue;
          op.responses[status] = {
            description: Option.getOrElse(description, defaultDescription)
          };
          ast.pipe(Option.filter(ast => !HttpApiSchema.getEmptyDecodeable(ast)), Option.map(ast => {
            const encoding = HttpApiSchema.getEncoding(ast);
            op.responses[status].content = {
              [encoding.contentType]: {
                schema: processAST(ast)
              }
            };
          }));
        }
      }
      function processParameters(schema, i) {
        if (Option.isSome(schema)) {
          const jsonSchema = processAST(schema.value.ast);
          if ("properties" in jsonSchema) {
            Object.entries(jsonSchema.properties).forEach(([name, psJsonSchema]) => {
              op.parameters.push({
                name,
                in: i,
                schema: psJsonSchema,
                required: jsonSchema.required.includes(name),
                ...(psJsonSchema.description !== undefined ? {
                  description: psJsonSchema.description
                } : undefined)
              });
            });
          }
        }
      }
      processAnnotation(endpoint.annotations, Description, description => {
        op.description = description;
      });
      processAnnotation(endpoint.annotations, Summary, summary => {
        op.summary = summary;
      });
      processAnnotation(endpoint.annotations, Deprecated, deprecated => {
        op.deprecated = deprecated;
      });
      processAnnotation(endpoint.annotations, ExternalDocs, externalDocs => {
        op.externalDocs = externalDocs;
      });
      middleware.forEach(middleware => {
        if (!HttpApiMiddleware.isSecurity(middleware)) {
          return;
        }
        for (const [name, security] of Object.entries(middleware.security)) {
          processHttpApiSecurity(name, security);
          op.security.push({
            [name]: []
          });
        }
      });
      const hasBody = HttpMethod.hasBody(endpoint.method);
      if (hasBody && payloads.size > 0) {
        const content = {};
        payloads.forEach(({
          ast
        }, contentType) => {
          content[contentType] = {
            schema: processAST(ast)
          };
        });
        op.requestBody = {
          content,
          required: true
        };
      }
      processParameters(endpoint.pathSchema, "path");
      if (!hasBody) {
        processParameters(endpoint.payloadSchema, "query");
      }
      processParameters(endpoint.headersSchema, "header");
      processParameters(endpoint.urlParamsSchema, "query");
      processResponseMap(successes, () => "Success");
      processResponseMap(errors, () => "Error");
      const path = endpoint.path.replace(/:(\w+)\??/g, "{$1}");
      const method = endpoint.method.toLowerCase();
      if (!spec.paths[path]) {
        spec.paths[path] = {};
      }
      processAnnotation(endpoint.annotations, Override, override => {
        Object.assign(op, override);
      });
      processAnnotation(endpoint.annotations, Transform, transformFn => {
        op = transformFn(op);
      });
      spec.paths[path][method] = op;
    }
  });
  processAnnotation(api.annotations, Override, override => {
    Object.assign(spec, override);
  });
  processAnnotation(api.annotations, Transform, transformFn => {
    spec = transformFn(spec);
  });
  apiCache.set(api, spec);
  return spec;
};
exports.fromApi = fromApi;
const makeSecurityScheme = security => {
  const meta = {};
  processAnnotation(security.annotations, Description, description => {
    meta.description = description;
  });
  switch (security._tag) {
    case "Basic":
      {
        return {
          ...meta,
          type: "http",
          scheme: "basic"
        };
      }
    case "Bearer":
      {
        const format = Context.getOption(security.annotations, Format).pipe(Option.map(format => ({
          bearerFormat: format
        })), Option.getOrUndefined);
        return {
          ...meta,
          type: "http",
          scheme: "bearer",
          ...format
        };
      }
    case "ApiKey":
      {
        return {
          ...meta,
          type: "apiKey",
          name: security.key,
          in: security.in
        };
      }
  }
};
//# sourceMappingURL=OpenApi.js.map