import { constUndefined, dual } from "effect/Function";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import { pipeArguments } from "effect/Pipeable";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Struct_ from "effect/Struct";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/experimental/VariantSchema");
const cacheSymbol = /*#__PURE__*/Symbol.for("@effect/experimental/VariantSchema/cache");
/**
 * @since 1.0.0
 * @category guards
 */
export const isStruct = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category type ids
 */
export const FieldTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/VariantSchema/Field");
/**
 * @since 1.0.0
 * @category guards
 */
export const isField = u => Predicate.hasProperty(u, FieldTypeId);
const extract = /*#__PURE__*/dual(args => isStruct(args[0]), (self, variant, options) => {
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
export const fields = self => self[TypeId];
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = options => {
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
  const fieldEvolve = dual(2, (self, f) => {
    const field = isField(self) ? self : Field(Object.fromEntries(options.variants.map(variant => [variant, self])));
    return Field(Struct_.evolve(field.schemas, f));
  });
  const fieldFromKey = dual(2, (self, mapping) => {
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
  const extractVariants = dual(2, (self, variant) => extract(self, variant, {
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
export const Override = value => value;
/**
 * @since 1.0.0
 * @category overrideable
 */
export const Overrideable = (from, to, options) => Schema.transformOrFail(from, Schema.Union(Schema.Undefined, to), {
  decode: _ => options.decode ? ParseResult.decode(options.decode)(_) : ParseResult.succeed(undefined),
  encode: dt => options.generate(dt === undefined ? Option.none() : Option.some(dt))
}).pipe(Schema.propertySignature, Schema.withConstructorDefault(options.constructorDefault ?? constUndefined));
const StructProto = {
  pipe() {
    return pipeArguments(this, arguments);
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
    return pipeArguments(this, arguments);
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