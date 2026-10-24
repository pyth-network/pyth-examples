"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.isStruct = exports.isField = exports.fields = exports.TypeId = exports.Overrideable = exports.Override = exports.FieldTypeId = void 0;
var _Function = require("effect/Function");
var Option = _interopRequireWildcard(require("effect/Option"));
var ParseResult = _interopRequireWildcard(require("effect/ParseResult"));
var _Pipeable = require("effect/Pipeable");
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Struct_ = _interopRequireWildcard(require("effect/Struct"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category type ids
 */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/VariantSchema");
const cacheSymbol = /*#__PURE__*/Symbol.for("@effect/experimental/VariantSchema/cache");
/**
 * @since 1.0.0
 * @category guards
 */
const isStruct = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category type ids
 */
exports.isStruct = isStruct;
const FieldTypeId = exports.FieldTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/VariantSchema/Field");
/**
 * @since 1.0.0
 * @category guards
 */
const isField = u => Predicate.hasProperty(u, FieldTypeId);
exports.isField = isField;
const extract = /*#__PURE__*/(0, _Function.dual)(args => isStruct(args[0]), (self, variant, options) => {
  const cache = self[cacheSymbol] ?? (self[cacheSymbol] = {});
  const cacheKey = options?.isDefault === true ? "__default" : variant;
  if (cache[cacheKey] !== undefined) {
    return cache[cacheKey];
  }
  const fields = {};
  for (const key of Object.keys(self[TypeId])) {
    const value = self[TypeId][key];
    if (TypeId in value) {
      if (options?.isDefault === true && Schema.isSchema(value)) {
        fields[key] = value;
      } else {
        fields[key] = extract(value, variant);
      }
    } else if (FieldTypeId in value) {
      if (variant in value.schemas) {
        fields[key] = value.schemas[variant];
      }
    } else {
      fields[key] = value;
    }
  }
  return cache[cacheKey] = Schema.Struct(fields);
});
/**
 * @category accessors
 * @since 1.0.0
 */
const fields = self => self[TypeId];
/**
 * @since 1.0.0
 * @category constructors
 */
exports.fields = fields;
const make = options => {
  function Class(identifier) {
    return function (fields, annotations) {
      const variantStruct = Struct(fields);
      const schema = extract(variantStruct, options.defaultVariant, {
        isDefault: true
      });
      class Base extends Schema.Class(identifier)(schema.fields, annotations) {
        static [TypeId] = fields;
      }
      for (const variant of options.variants) {
        Object.defineProperty(Base, variant, {
          value: extract(variantStruct, variant).annotations({
            identifier: `${identifier}.${variant}`,
            title: `${identifier}.${variant}`
          })
        });
      }
      return Base;
    };
  }
  function FieldOnly(...keys) {
    return function (schema) {
      const obj = {};
      for (const key of keys) {
        obj[key] = schema;
      }
      return Field(obj);
    };
  }
  function FieldExcept(...keys) {
    return function (schema) {
      const obj = {};
      for (const variant of options.variants) {
        if (!keys.includes(variant)) {
          obj[variant] = schema;
        }
      }
      return Field(obj);
    };
  }
  function UnionVariants(...members) {
    return Union(members, options.variants);
  }
  const fieldEvolve = (0, _Function.dual)(2, (self, f) => {
    const field = isField(self) ? self : Field(Object.fromEntries(options.variants.map(variant => [variant, self])));
    return Field(Struct_.evolve(field.schemas, f));
  });
  const fieldFromKey = (0, _Function.dual)(2, (self, mapping) => {
    const obj = {};
    if (isField(self)) {
      for (const [key, schema] of Object.entries(self.schemas)) {
        obj[key] = mapping[key] !== undefined ? renameFieldValue(schema, mapping[key]) : schema;
      }
    } else {
      for (const key of options.variants) {
        obj[key] = mapping[key] !== undefined ? renameFieldValue(self, mapping[key]) : self;
      }
    }
    return Field(obj);
  });
  const extractVariants = (0, _Function.dual)(2, (self, variant) => extract(self, variant, {
    isDefault: variant === options.defaultVariant
  }));
  return {
    Struct,
    Field,
    FieldOnly,
    FieldExcept,
    Class,
    Union: UnionVariants,
    fieldEvolve,
    fieldFromKey,
    extract: extractVariants
  };
};
/**
 * @since 1.0.0
 * @category overrideable
 */
exports.make = make;
const Override = value => value;
/**
 * @since 1.0.0
 * @category overrideable
 */
exports.Override = Override;
const Overrideable = (from, to, options) => Schema.transformOrFail(from, Schema.Union(Schema.Undefined, to), {
  decode: _ => options.decode ? ParseResult.decode(options.decode)(_) : ParseResult.succeed(undefined),
  encode: dt => options.generate(dt === undefined ? Option.none() : Option.some(dt))
}).pipe(Schema.propertySignature, Schema.withConstructorDefault(options.constructorDefault ?? _Function.constUndefined));
exports.Overrideable = Overrideable;
const StructProto = {
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
};
const Struct = fields => {
  const self = Object.create(StructProto);
  self[TypeId] = fields;
  return self;
};
const FieldProto = {
  [FieldTypeId]: FieldTypeId,
  pipe() {
    return (0, _Pipeable.pipeArguments)(this, arguments);
  }
};
const Field = schemas => {
  const self = Object.create(FieldProto);
  self.schemas = schemas;
  return self;
};
const Union = (members, variants) => {
  class VariantUnion extends Schema.Union(...members.filter(member => Schema.isSchema(member))) {}
  for (const variant of variants) {
    Object.defineProperty(VariantUnion, variant, {
      value: Schema.Union(...members.map(member => extract(member, variant)))
    });
  }
  return VariantUnion;
};
const renameFieldValue = (self, key) => Schema.isPropertySignature(self) ? Schema.fromKey(self, key) : Schema.fromKey(Schema.propertySignature(self), key);
//# sourceMappingURL=VariantSchema.js.map