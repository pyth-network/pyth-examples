/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array";
import * as Either from "effect/Either";
import { dual } from "effect/Function";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category constructors
 */
export const fromInput = input => {
  const parsed = fromInputNested(input);
  const out = [];
  for (let i = 0; i < parsed.length; i++) {
    if (Array.isArray(parsed[i][0])) {
      const [keys, value] = parsed[i];
      out.push([`${keys[0]}[${keys.slice(1).join("][")}]`, value]);
    } else {
      out.push(parsed[i]);
    }
  }
  return out;
};
const fromInputNested = input => {
  const entries = Symbol.iterator in input ? Arr.fromIterable(input) : Object.entries(input);
  const out = [];
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== undefined) {
          out.push([key, String(value[i])]);
        }
      }
    } else if (typeof value === "object") {
      const nested = fromInputNested(value);
      for (const [k, v] of nested) {
        out.push([[key, ...(typeof k === "string" ? [k] : k)], v]);
      }
    } else if (value !== undefined) {
      out.push([key, String(value)]);
    }
  }
  return out;
};
/**
 * @since 1.0.0
 * @category schemas
 */
export const schemaFromSelf = /*#__PURE__*/Schema.Array(Schema.Tuple(Schema.String, Schema.String)).annotations({
  identifier: "UrlParams"
});
/**
 * @since 1.0.0
 * @category constructors
 */
export const empty = [];
/**
 * @since 1.0.0
 * @category combinators
 */
export const getAll = /*#__PURE__*/dual(2, (self, key) => Arr.reduce(self, [], (acc, [k, value]) => {
  if (k === key) {
    acc.push(value);
  }
  return acc;
}));
/**
 * @since 1.0.0
 * @category combinators
 */
export const getFirst = /*#__PURE__*/dual(2, (self, key) => Option.map(Arr.findFirst(self, ([k]) => k === key), ([, value]) => value));
/**
 * @since 1.0.0
 * @category combinators
 */
export const getLast = /*#__PURE__*/dual(2, (self, key) => Option.map(Arr.findLast(self, ([k]) => k === key), ([, value]) => value));
/**
 * @since 1.0.0
 * @category combinators
 */
export const set = /*#__PURE__*/dual(3, (self, key, value) => Arr.append(Arr.filter(self, ([k]) => k !== key), [key, String(value)]));
/**
 * @since 1.0.0
 * @category combinators
 */
export const setAll = /*#__PURE__*/dual(2, (self, input) => {
  const toSet = fromInput(input);
  const keys = toSet.map(([k]) => k);
  return Arr.appendAll(Arr.filter(self, ([k]) => keys.includes(k)), toSet);
});
/**
 * @since 1.0.0
 * @category combinators
 */
export const append = /*#__PURE__*/dual(3, (self, key, value) => Arr.append(self, [key, String(value)]));
/**
 * @since 1.0.0
 * @category combinators
 */
export const appendAll = /*#__PURE__*/dual(2, (self, input) => Arr.appendAll(self, fromInput(input)));
/**
 * @since 1.0.0
 * @category combinators
 */
export const remove = /*#__PURE__*/dual(2, (self, key) => Arr.filter(self, ([k]) => k !== key));
/**
 * @since 1.0.0
 * @category conversions
 */
export const makeUrl = (url, params, hash) => {
  try {
    const urlInstance = new URL(url, baseUrl());
    for (let i = 0; i < params.length; i++) {
      const [key, value] = params[i];
      if (value !== undefined) {
        urlInstance.searchParams.append(key, value);
      }
    }
    if (hash._tag === "Some") {
      urlInstance.hash = hash.value;
    }
    return Either.right(urlInstance);
  } catch (e) {
    return Either.left(e);
  }
};
/**
 * @since 1.0.0
 * @category conversions
 */
export const toString = self => new URLSearchParams(self).toString();
const baseUrl = () => {
  if ("location" in globalThis && globalThis.location !== undefined && globalThis.location.origin !== undefined && globalThis.location.pathname !== undefined) {
    return location.origin + location.pathname;
  }
  return undefined;
};
/**
 * Builds a `Record` containing all the key-value pairs in the given `UrlParams`
 * as `string` (if only one value for a key) or a `NonEmptyArray<string>`
 * (when more than one value for a key)
 *
 * **Example**
 *
 * ```ts
 * import * as assert from "node:assert"
 * import { UrlParams } from "@effect/platform"
 *
 * const urlParams = UrlParams.fromInput({ a: 1, b: true, c: "string", e: [1, 2, 3] })
 * const result = UrlParams.toRecord(urlParams)
 *
 * assert.deepStrictEqual(
 *   result,
 *   { "a": "1", "b": "true", "c": "string", "e": ["1", "2", "3"] }
 * )
 * ```
 *
 * @since 1.0.0
 * @category conversions
 */
export const toRecord = self => {
  const out = Object.create(null);
  for (const [k, value] of self) {
    const curr = out[k];
    if (curr === undefined) {
      out[k] = value;
    } else if (typeof curr === "string") {
      out[k] = [curr, value];
    } else {
      curr.push(value);
    }
  }
  return {
    ...out
  };
};
/**
 * @since 1.0.0
 * @category schema
 */
export const schemaJson = (schema, options) => {
  const parse = Schema.decodeUnknown(Schema.parseJson(schema), options);
  return dual(2, (self, field) => parse(Option.getOrElse(getLast(self, field), () => "")));
};
/**
 * Extract schema from all key-value pairs in the given `UrlParams`.
 *
 * **Example**
 *
 * ```ts
 * import * as assert from "node:assert"
 * import { Effect, Schema } from "effect"
 * import { UrlParams } from "@effect/platform"
 *
 * Effect.gen(function* () {
 *   const urlParams = UrlParams.fromInput({ "a": [10, "string"], "b": false })
 *   const result = yield* UrlParams.schemaStruct(Schema.Struct({
 *     a: Schema.Tuple(Schema.NumberFromString, Schema.String),
 *     b: Schema.BooleanFromString
 *   }))(urlParams)
 *
 *   assert.deepStrictEqual(result, {
 *     a: [10, "string"],
 *     b: false
 *   })
 * })
 * ```
 *
 * @since 1.0.0
 * @category schema
 */
export const schemaStruct = (schema, options) => self => {
  const parse = Schema.decodeUnknown(schema, options);
  return parse(toRecord(self));
};
/**
 * @since 1.0.0
 * @category schema
 */
export const schemaFromString = /*#__PURE__*/Schema.transform(Schema.String, schemaFromSelf, {
  decode(fromA) {
    return fromInput(new URLSearchParams(fromA));
  },
  encode(toI) {
    return toString(toI);
  }
});
/**
 * @since 1.0.0
 * @category schema
 */
export const schemaRecord = schema => Schema.transform(schemaFromSelf, schema, {
  decode(fromA) {
    return toRecord(fromA);
  },
  encode(toI) {
    return fromInput(toI);
  }
});
/**
 * @since 1.0.0
 * @category schema
 */
export const schemaParse = schema => Schema.compose(schemaFromString, schemaRecord(schema));
//# sourceMappingURL=UrlParams.js.map