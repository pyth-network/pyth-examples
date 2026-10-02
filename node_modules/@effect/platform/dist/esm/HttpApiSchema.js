import * as Effect from "effect/Effect";
import * as Effectable from "effect/Effectable";
import { constant, constVoid, dual } from "effect/Function";
import { globalValue } from "effect/GlobalValue";
import * as Option from "effect/Option";
import { hasProperty } from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as AST from "effect/SchemaAST";
import * as Struct from "effect/Struct";
/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationMultipart = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationMultipart");
/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationMultipartStream = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationMultipartStream");
/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationStatus = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationStatus");
/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationEmptyDecodeable = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationEmptyDecodeable");
/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationEncoding = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationEncoding");
/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationParam = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationParam");
/**
 * @since 1.0.0
 * @category annotations
 */
export const extractAnnotations = ast => {
  const result = {};
  if (AnnotationStatus in ast) {
    result[AnnotationStatus] = ast[AnnotationStatus];
  }
  if (AnnotationEmptyDecodeable in ast) {
    result[AnnotationEmptyDecodeable] = ast[AnnotationEmptyDecodeable];
  }
  if (AnnotationEncoding in ast) {
    result[AnnotationEncoding] = ast[AnnotationEncoding];
  }
  if (AnnotationParam in ast) {
    result[AnnotationParam] = ast[AnnotationParam];
  }
  if (AnnotationMultipart in ast) {
    result[AnnotationMultipart] = ast[AnnotationMultipart];
  }
  if (AnnotationMultipartStream in ast) {
    result[AnnotationMultipartStream] = ast[AnnotationMultipartStream];
  }
  return result;
};
const mergedAnnotations = ast => ast._tag === "Transformation" ? {
  ...ast.to.annotations,
  ...ast.annotations
} : ast.annotations;
const getAnnotation = (ast, key) => mergedAnnotations(ast)[key];
/**
 * @since 1.0.0
 * @category annotations
 */
export const getStatus = (ast, defaultStatus) => getAnnotation(ast, AnnotationStatus) ?? defaultStatus;
/**
 * @since 1.0.0
 * @category annotations
 */
export const getEmptyDecodeable = ast => getAnnotation(ast, AnnotationEmptyDecodeable) ?? false;
/**
 * @since 1.0.0
 * @category annotations
 */
export const getMultipart = ast => getAnnotation(ast, AnnotationMultipart);
/**
 * @since 1.0.0
 * @category annotations
 */
export const getMultipartStream = ast => getAnnotation(ast, AnnotationMultipartStream);
const encodingJson = {
  kind: "Json",
  contentType: "application/json"
};
/**
 * @since 1.0.0
 * @category annotations
 */
export const getEncoding = (ast, fallback = encodingJson) => getAnnotation(ast, AnnotationEncoding) ?? fallback;
/**
 * @since 1.0.0
 * @category annotations
 */
export const getParam = ast => {
  const annotations = ast._tag === "PropertySignatureTransformation" ? ast.to.annotations : ast.annotations;
  return annotations[AnnotationParam]?.name;
};
/**
 * @since 1.0.0
 * @category annotations
 */
export const annotations = annotations => {
  const result = Struct.omit(annotations, "status");
  if (annotations.status !== undefined) {
    result[AnnotationStatus] = annotations.status;
  }
  return result;
};
/**
 * @since 1.0.0
 * @category reflection
 */
export const isVoid = ast => {
  switch (ast._tag) {
    case "VoidKeyword":
      {
        return true;
      }
    case "Transformation":
      {
        return isVoid(ast.from);
      }
    case "Suspend":
      {
        return isVoid(ast.f());
      }
    default:
      {
        return false;
      }
  }
};
/**
 * @since 1.0.0
 * @category reflection
 */
export const getStatusSuccessAST = ast => getStatus(ast, isVoid(ast) ? 204 : 200);
/**
 * @since 1.0.0
 * @category reflection
 */
export const getStatusSuccess = self => getStatusSuccessAST(self.ast);
/**
 * @since 1.0.0
 * @category reflection
 */
export const getStatusErrorAST = ast => getStatus(ast, 500);
/**
 * @since 1.0.0
 * @category reflection
 */
export const getStatusError = self => getStatusErrorAST(self.ast);
/**
 * Extracts all individual types from a union type recursively.
 *
 * **Details**
 *
 * This function traverses an AST and collects all the types within a union,
 * even if they are nested. It ensures that every type in a union (including
 * deeply nested unions) is included in the resulting array. The returned array
 * contains each type as an individual AST node, preserving the order in which
 * they appear.
 *
 * @internal
 */
export const extractUnionTypes = ast => {
  function process(ast) {
    if (AST.isUnion(ast)) {
      for (const type of ast.types) {
        process(type);
      }
    } else {
      out.push(ast);
    }
  }
  const out = [];
  process(ast);
  return out;
};
/** @internal */
export const UnionUnifyAST = (self, that) => AST.Union.make(Array.from(new Set([...extractUnionTypes(self), ...extractUnionTypes(that)])));
/**
 * @since 1.0.0
 */
export const UnionUnify = (self, that) => Schema.make(UnionUnifyAST(self.ast, that.ast));
/**
 * @since 1.0.0
 * @category path params
 */
export const param = /*#__PURE__*/dual(2, (name, schema) => {
  const annotations = {
    [AnnotationParam]: {
      name,
      schema
    }
  };
  if (Schema.isSchema(schema)) {
    const identifier = AST.getIdentifierAnnotation(schema.ast);
    if (Option.isSome(identifier)) {
      annotations[AST.IdentifierAnnotationId] = identifier.value;
    }
  }
  return schema.annotations(annotations);
});
/**
 * @since 1.0.0
 * @category empty response
 */
export const Empty = status => Schema.Void.annotations(annotations({
  status
}));
/**
 * @since 1.0.0
 * @category empty response
 */
export const asEmpty = /*#__PURE__*/dual(2, (self, options) => Schema.transform(Schema.Void.annotations(self.ast.annotations), Schema.typeSchema(self), {
  decode: options.decode,
  encode: constVoid
}).annotations(annotations({
  status: options.status,
  [AnnotationEmptyDecodeable]: true
})));
/**
 * @since 1.0.0
 * @category empty response
 */
export const Created = /*#__PURE__*/Empty(201);
/**
 * @since 1.0.0
 * @category empty response
 */
export const Accepted = /*#__PURE__*/Empty(202);
/**
 * @since 1.0.0
 * @category empty response
 */
export const NoContent = /*#__PURE__*/Empty(204);
/**
 * @since 1.0.0
 * @category multipart
 */
export const MultipartTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/Multipart");
/**
 * @since 1.0.0
 * @category multipart
 */
export const Multipart = (self, options) => self.annotations({
  [AnnotationMultipart]: options ?? {}
});
/**
 * @since 1.0.0
 * @category multipart
 */
export const MultipartStreamTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/MultipartStream");
/**
 * @since 1.0.0
 * @category multipart
 */
export const MultipartStream = (self, options) => self.annotations({
  [AnnotationMultipartStream]: options ?? {}
});
const defaultContentType = encoding => {
  switch (encoding) {
    case "Json":
      {
        return "application/json";
      }
    case "UrlParams":
      {
        return "application/x-www-form-urlencoded";
      }
    case "Uint8Array":
      {
        return "application/octet-stream";
      }
    case "Text":
      {
        return "text/plain";
      }
  }
};
/**
 * @since 1.0.0
 * @category encoding
 */
export const withEncoding = /*#__PURE__*/dual(2, (self, options) => self.annotations({
  [AnnotationEncoding]: {
    kind: options.kind,
    contentType: options.contentType ?? defaultContentType(options.kind)
  },
  ...(options.kind === "Uint8Array" ? {
    jsonSchema: {
      type: "string",
      format: "binary"
    }
  } : undefined)
}));
/**
 * @since 1.0.0
 * @category encoding
 */
export const Text = options => withEncoding(Schema.String, {
  kind: "Text",
  ...options
});
/**
 * @since 1.0.0
 * @category encoding
 */
export const Uint8Array = options => withEncoding(Schema.Uint8ArrayFromSelf, {
  kind: "Uint8Array",
  ...options
});
const astCache = /*#__PURE__*/globalValue("@effect/platform/HttpApiSchema/astCache", () => new WeakMap());
/**
 * @since 1.0.0
 */
export const deunionize = (schemas, schema) => {
  if (astCache.has(schema.ast)) {
    schemas.add(astCache.get(schema.ast));
    return;
  }
  const ast = schema.ast;
  if (ast._tag === "Union") {
    for (const astType of ast.types) {
      if (astCache.has(astType)) {
        schemas.add(astCache.get(astType));
        continue;
      }
      const memberSchema = Schema.make(AST.annotations(astType, {
        ...ast.annotations,
        ...astType.annotations
      }));
      astCache.set(astType, memberSchema);
      schemas.add(memberSchema);
    }
  } else {
    astCache.set(ast, schema);
    schemas.add(schema);
  }
};
/**
 * @since 1.0.0
 * @category empty errors
 */
export const EmptyError = () => options => {
  const symbol = Symbol.for(`@effect/platform/HttpApiSchema/EmptyError/${options.tag}`);
  class EmptyError extends Effectable.StructuralClass {
    _tag = options.tag;
    commit() {
      return Effect.fail(this);
    }
  }
  ;
  EmptyError.prototype[symbol] = symbol;
  Object.assign(EmptyError, {
    [Schema.TypeId]: Schema.Void[Schema.TypeId],
    pipe: Schema.Void.pipe,
    annotations(annotations) {
      return Schema.make(this.ast).annotations(annotations);
    }
  });
  let transform;
  Object.defineProperty(EmptyError, "ast", {
    get() {
      if (transform) {
        return transform.ast;
      }
      const self = this;
      transform = asEmpty(Schema.declare(u => hasProperty(u, symbol), {
        identifier: options.tag,
        title: options.tag
      }), {
        status: options.status,
        decode: constant(new self())
      });
      return transform.ast;
    }
  });
  return EmptyError;
};
//# sourceMappingURL=HttpApiSchema.js.map