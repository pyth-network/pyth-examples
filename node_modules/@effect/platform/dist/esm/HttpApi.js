/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Option from "effect/Option";
import { pipeArguments } from "effect/Pipeable";
import * as Predicate from "effect/Predicate";
import * as Record from "effect/Record";
import * as AST from "effect/SchemaAST";
import { HttpApiDecodeError } from "./HttpApiError.js";
import * as HttpApiSchema from "./HttpApiSchema.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApi");
/**
 * @since 1.0.0
 * @category guards
 */
export const isHttpApi = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category tags
 */
export class Api extends /*#__PURE__*/Context.Tag("@effect/platform/HttpApi/Api")() {}
const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments);
  },
  add(group) {
    return makeProto({
      identifier: this.identifier,
      groups: Record.set(this.groups, group.identifier, group),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    });
  },
  addHttpApi(api) {
    const newGroups = {
      ...this.groups
    };
    for (const key in api.groups) {
      const newGroup = api.groups[key].annotateContext(Context.empty());
      newGroup.annotations = Context.merge(api.annotations, newGroup.annotations);
      newGroup.middlewares = new Set([...api.middlewares, ...newGroup.middlewares]);
      newGroups[key] = newGroup;
    }
    return makeProto({
      identifier: this.identifier,
      groups: newGroups,
      errorSchema: HttpApiSchema.UnionUnify(this.errorSchema, api.errorSchema),
      annotations: this.annotations,
      middlewares: this.middlewares
    });
  },
  addError(schema, annotations) {
    return makeProto({
      identifier: this.identifier,
      groups: this.groups,
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
      groups: Record.map(this.groups, group => group.prefix(prefix)),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    });
  },
  middleware(tag) {
    return makeProto({
      identifier: this.identifier,
      groups: this.groups,
      errorSchema: HttpApiSchema.UnionUnify(this.errorSchema, tag.failure),
      annotations: this.annotations,
      middlewares: new Set([...this.middlewares, tag])
    });
  },
  annotate(tag, value) {
    return makeProto({
      identifier: this.identifier,
      groups: this.groups,
      errorSchema: this.errorSchema,
      annotations: Context.add(this.annotations, tag, value),
      middlewares: this.middlewares
    });
  },
  annotateContext(context) {
    return makeProto({
      identifier: this.identifier,
      groups: this.groups,
      errorSchema: this.errorSchema,
      annotations: Context.merge(this.annotations, context),
      middlewares: this.middlewares
    });
  }
};
const makeProto = options => {
  function HttpApi() {}
  Object.setPrototypeOf(HttpApi, Proto);
  HttpApi.groups = options.groups;
  HttpApi.errorSchema = options.errorSchema;
  HttpApi.annotations = options.annotations;
  HttpApi.middlewares = options.middlewares;
  return HttpApi;
};
/**
 * An `HttpApi` is a collection of `HttpApiEndpoint`s. You can use an `HttpApi` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.make` api.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = identifier => makeProto({
  identifier,
  groups: new Map(),
  errorSchema: HttpApiDecodeError,
  annotations: Context.empty(),
  middlewares: new Set()
});
/**
 * Extract metadata from an `HttpApi`, which can be used to generate documentation
 * or other tooling.
 *
 * See the `OpenApi` & `HttpApiClient` modules for examples of how to use this function.
 *
 * @since 1.0.0
 * @category reflection
 */
export const reflect = (self, options) => {
  const apiErrors = extractMembers(self.errorSchema.ast, new Map(), HttpApiSchema.getStatusErrorAST);
  const groups = Object.values(self.groups);
  for (const group of groups) {
    const groupErrors = extractMembers(group.errorSchema.ast, apiErrors, HttpApiSchema.getStatusErrorAST);
    const groupAnnotations = Context.merge(self.annotations, group.annotations);
    options.onGroup({
      group,
      mergedAnnotations: groupAnnotations
    });
    const endpoints = Object.values(group.endpoints);
    for (const endpoint of endpoints) {
      if (options.predicate && !options.predicate({
        endpoint,
        group
      })) continue;
      const errors = extractMembers(endpoint.errorSchema.ast, groupErrors, HttpApiSchema.getStatusErrorAST);
      options.onEndpoint({
        group,
        endpoint,
        middleware: new Set([...group.middlewares, ...endpoint.middlewares]),
        mergedAnnotations: Context.merge(groupAnnotations, endpoint.annotations),
        payloads: endpoint.payloadSchema._tag === "Some" ? extractPayloads(endpoint.payloadSchema.value.ast) : emptyMap,
        successes: extractMembers(endpoint.successSchema.ast, new Map(), HttpApiSchema.getStatusSuccessAST),
        errors
      });
    }
  }
};
// -------------------------------------------------------------------------------------
const emptyMap = /*#__PURE__*/new Map();
const extractMembers = (ast, inherited, getStatus) => {
  const members = new Map(inherited);
  function process(type) {
    if (AST.isNeverKeyword(type)) {
      return;
    }
    const annotations = HttpApiSchema.extractAnnotations(ast.annotations);
    // Avoid changing the reference unless necessary
    // Otherwise, deduplication of the ASTs below will not be possible
    if (!Record.isEmptyRecord(annotations)) {
      type = AST.annotations(type, {
        ...annotations,
        ...type.annotations
      });
    }
    const status = getStatus(type);
    const emptyDecodeable = HttpApiSchema.getEmptyDecodeable(type);
    const current = members.get(status);
    members.set(status, {
      description: (current ? current.description : Option.none()).pipe(Option.orElse(() => getDescriptionOrIdentifier(type))),
      ast: (current ? current.ast : Option.none()).pipe(
      // Deduplicate the ASTs
      Option.map(current => HttpApiSchema.UnionUnifyAST(current, type)), Option.orElse(() => !emptyDecodeable && AST.isVoidKeyword(AST.encodedAST(type)) ? Option.none() : Option.some(type)))
    });
  }
  HttpApiSchema.extractUnionTypes(ast).forEach(process);
  return members;
};
const extractPayloads = topAst => {
  const members = new Map();
  function process(ast) {
    if (ast._tag === "NeverKeyword") {
      return;
    }
    ast = AST.annotations(ast, {
      ...HttpApiSchema.extractAnnotations(topAst.annotations),
      ...ast.annotations
    });
    const encoding = HttpApiSchema.getEncoding(ast);
    const contentType = HttpApiSchema.getMultipart(ast) || HttpApiSchema.getMultipartStream(ast) ? "multipart/form-data" : encoding.contentType;
    const current = members.get(contentType);
    if (current === undefined) {
      members.set(contentType, {
        encoding,
        ast
      });
    } else {
      current.ast = AST.Union.make([current.ast, ast]);
    }
  }
  if (topAst._tag === "Union") {
    for (const type of topAst.types) {
      process(type);
    }
  } else {
    process(topAst);
  }
  return members;
};
const getDescriptionOrIdentifier = ast => {
  const annotations = "to" in ast ? {
    ...ast.to.annotations,
    ...ast.annotations
  } : ast.annotations;
  return Option.fromNullable(annotations[AST.DescriptionAnnotationId] ?? annotations[AST.IdentifierAnnotationId]);
};
/**
 * Adds additional schemas to components/schemas.
 * The provided schemas must have a `identifier` annotation.
 *
 * @since 1.0.0
 * @category tags
 */
export class AdditionalSchemas extends /*#__PURE__*/Context.Tag("@effect/platform/HttpApi/AdditionalSchemas")() {}
//# sourceMappingURL=HttpApi.js.map