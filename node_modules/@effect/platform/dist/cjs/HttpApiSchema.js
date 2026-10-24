"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withEncoding = exports.param = exports.isVoid = exports.getStatusSuccessAST = exports.getStatusSuccess = exports.getStatusErrorAST = exports.getStatusError = exports.getStatus = exports.getParam = exports.getMultipartStream = exports.getMultipart = exports.getEncoding = exports.getEmptyDecodeable = exports.extractUnionTypes = exports.extractAnnotations = exports.deunionize = exports.asEmpty = exports.annotations = exports.UnionUnifyAST = exports.UnionUnify = exports.Uint8Array = exports.Text = exports.NoContent = exports.MultipartTypeId = exports.MultipartStreamTypeId = exports.MultipartStream = exports.Multipart = exports.EmptyError = exports.Empty = exports.Created = exports.AnnotationStatus = exports.AnnotationParam = exports.AnnotationMultipartStream = exports.AnnotationMultipart = exports.AnnotationEncoding = exports.AnnotationEmptyDecodeable = exports.Accepted = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Effectable = _interopRequireWildcard(require("effect/Effectable"));
var _Function = require("effect/Function");
var _GlobalValue = require("effect/GlobalValue");
var Option = _interopRequireWildcard(require("effect/Option"));
var _Predicate = require("effect/Predicate");
var Schema = _interopRequireWildcard(require("effect/Schema"));
var AST = _interopRequireWildcard(require("effect/SchemaAST"));
var Struct = _interopRequireWildcard(require("effect/Struct"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category annotations
 */
const AnnotationMultipart = exports.AnnotationMultipart = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationMultipart");
/**
 * @since 1.0.0
 * @category annotations
 */
const AnnotationMultipartStream = exports.AnnotationMultipartStream = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationMultipartStream");
/**
 * @since 1.0.0
 * @category annotations
 */
const AnnotationStatus = exports.AnnotationStatus = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationStatus");
/**
 * @since 1.0.0
 * @category annotations
 */
const AnnotationEmptyDecodeable = exports.AnnotationEmptyDecodeable = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationEmptyDecodeable");
/**
 * @since 1.0.0
 * @category annotations
 */
const AnnotationEncoding = exports.AnnotationEncoding = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationEncoding");
/**
 * @since 1.0.0
 * @category annotations
 */
const AnnotationParam = exports.AnnotationParam = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/AnnotationParam");
/**
 * @since 1.0.0
 * @category annotations
 */
const extractAnnotations = ast => {
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
exports.extractAnnotations = extractAnnotations;
const mergedAnnotations = ast => ast._tag === "Transformation" ? {
  ...ast.to.annotations,
  ...ast.annotations
} : ast.annotations;
const getAnnotation = (ast, key) => mergedAnnotations(ast)[key];
/**
 * @since 1.0.0
 * @category annotations
 */
const getStatus = (ast, defaultStatus) => getAnnotation(ast, AnnotationStatus) ?? defaultStatus;
/**
 * @since 1.0.0
 * @category annotations
 */
exports.getStatus = getStatus;
const getEmptyDecodeable = ast => getAnnotation(ast, AnnotationEmptyDecodeable) ?? false;
/**
 * @since 1.0.0
 * @category annotations
 */
exports.getEmptyDecodeable = getEmptyDecodeable;
const getMultipart = ast => getAnnotation(ast, AnnotationMultipart);
/**
 * @since 1.0.0
 * @category annotations
 */
exports.getMultipart = getMultipart;
const getMultipartStream = ast => getAnnotation(ast, AnnotationMultipartStream);
exports.getMultipartStream = getMultipartStream;
const encodingJson = {
  kind: "Json",
  contentType: "application/json"
};
/**
 * @since 1.0.0
 * @category annotations
 */
const getEncoding = (ast, fallback = encodingJson) => getAnnotation(ast, AnnotationEncoding) ?? fallback;
/**
 * @since 1.0.0
 * @category annotations
 */
exports.getEncoding = getEncoding;
const getParam = ast => {
  const annotations = ast._tag === "PropertySignatureTransformation" ? ast.to.annotations : ast.annotations;
  return annotations[AnnotationParam]?.name;
};
/**
 * @since 1.0.0
 * @category annotations
 */
exports.getParam = getParam;
const annotations = annotations => {
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
exports.annotations = annotations;
const isVoid = ast => {
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
exports.isVoid = isVoid;
const getStatusSuccessAST = ast => getStatus(ast, isVoid(ast) ? 204 : 200);
/**
 * @since 1.0.0
 * @category reflection
 */
exports.getStatusSuccessAST = getStatusSuccessAST;
const getStatusSuccess = self => getStatusSuccessAST(self.ast);
/**
 * @since 1.0.0
 * @category reflection
 */
exports.getStatusSuccess = getStatusSuccess;
const getStatusErrorAST = ast => getStatus(ast, 500);
/**
 * @since 1.0.0
 * @category reflection
 */
exports.getStatusErrorAST = getStatusErrorAST;
const getStatusError = self => getStatusErrorAST(self.ast);
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
exports.getStatusError = getStatusError;
const extractUnionTypes = ast => {
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
exports.extractUnionTypes = extractUnionTypes;
const UnionUnifyAST = (self, that) => AST.Union.make(Array.from(new Set([...extractUnionTypes(self), ...extractUnionTypes(that)])));
/**
 * @since 1.0.0
 */
exports.UnionUnifyAST = UnionUnifyAST;
const UnionUnify = (self, that) => Schema.make(UnionUnifyAST(self.ast, that.ast));
/**
 * @since 1.0.0
 * @category path params
 */
exports.UnionUnify = UnionUnify;
const param = exports.param = /*#__PURE__*/(0, _Function.dual)(2, (name, schema) => {
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
const Empty = status => Schema.Void.annotations(annotations({
  status
}));
/**
 * @since 1.0.0
 * @category empty response
 */
exports.Empty = Empty;
const asEmpty = exports.asEmpty = /*#__PURE__*/(0, _Function.dual)(2, (self, options) => Schema.transform(Schema.Void.annotations(self.ast.annotations), Schema.typeSchema(self), {
  decode: options.decode,
  encode: _Function.constVoid
}).annotations(annotations({
  status: options.status,
  [AnnotationEmptyDecodeable]: true
})));
/**
 * @since 1.0.0
 * @category empty response
 */
const Created = exports.Created = /*#__PURE__*/Empty(201);
/**
 * @since 1.0.0
 * @category empty response
 */
const Accepted = exports.Accepted = /*#__PURE__*/Empty(202);
/**
 * @since 1.0.0
 * @category empty response
 */
const NoContent = exports.NoContent = /*#__PURE__*/Empty(204);
/**
 * @since 1.0.0
 * @category multipart
 */
const MultipartTypeId = exports.MultipartTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/Multipart");
/**
 * @since 1.0.0
 * @category multipart
 */
const Multipart = (self, options) => self.annotations({
  [AnnotationMultipart]: options ?? {}
});
/**
 * @since 1.0.0
 * @category multipart
 */
exports.Multipart = Multipart;
const MultipartStreamTypeId = exports.MultipartStreamTypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpApiSchema/MultipartStream");
/**
 * @since 1.0.0
 * @category multipart
 */
const MultipartStream = (self, options) => self.annotations({
  [AnnotationMultipartStream]: options ?? {}
});
exports.MultipartStream = MultipartStream;
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
const withEncoding = exports.withEncoding = /*#__PURE__*/(0, _Function.dual)(2, (self, options) => self.annotations({
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
const Text = options => withEncoding(Schema.String, {
  kind: "Text",
  ...options
});
/**
 * @since 1.0.0
 * @category encoding
 */
exports.Text = Text;
const Uint8Array = options => withEncoding(Schema.Uint8ArrayFromSelf, {
  kind: "Uint8Array",
  ...options
});
exports.Uint8Array = Uint8Array;
const astCache = /*#__PURE__*/(0, _GlobalValue.globalValue)("@effect/platform/HttpApiSchema/astCache", () => new WeakMap());
/**
 * @since 1.0.0
 */
const deunionize = (schemas, schema) => {
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
exports.deunionize = deunionize;
const EmptyError = () => options => {
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
      transform = asEmpty(Schema.declare(u => (0, _Predicate.hasProperty)(u, symbol), {
        identifier: options.tag,
        title: options.tag
      }), {
        status: options.status,
        decode: (0, _Function.constant)(new self())
      });
      return transform.ast;
    }
  });
  return EmptyError;
};
exports.EmptyError = EmptyError;
//# sourceMappingURL=HttpApiSchema.js.map