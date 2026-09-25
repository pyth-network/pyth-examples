"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toString = exports.toRecord = exports.setAll = exports.set = exports.schemaStruct = exports.schemaRecord = exports.schemaParse = exports.schemaJson = exports.schemaFromString = exports.schemaFromSelf = exports.remove = exports.makeUrl = exports.getLast = exports.getFirst = exports.getAll = exports.fromInput = exports.empty = exports.appendAll = exports.append = void 0;
var Arr = _interopRequireWildcard(require("effect/Array"));
var Either = _interopRequireWildcard(require("effect/Either"));
var _Function = require("effect/Function");
var Option = _interopRequireWildcard(require("effect/Option"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category constructors
 */
const fromInput = input => {
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
exports.fromInput = fromInput;
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
const schemaFromSelf = exports.schemaFromSelf = /*#__PURE__*/Schema.Array(Schema.Tuple(Schema.String, Schema.String)).annotations({
  identifier: "UrlParams"
});
/**
 * @since 1.0.0
 * @category constructors
 */
const empty = exports.empty = [];
/**
 * @since 1.0.0
 * @category combinators
 */
const getAll = exports.getAll = /*#__PURE__*/(0, _Function.dual)(2, (self, key) => Arr.reduce(self, [], (acc, [k, value]) => {
  if (k === key) {
    acc.push(value);
  }
  return acc;
}));
/**
 * @since 1.0.0
 * @category combinators
 */
const getFirst = exports.getFirst = /*#__PURE__*/(0, _Function.dual)(2, (self, key) => Option.map(Arr.findFirst(self, ([k]) => k === key), ([, value]) => value));
/**
 * @since 1.0.0
 * @category combinators
 */
const getLast = exports.getLast = /*#__PURE__*/(0, _Function.dual)(2, (self, key) => Option.map(Arr.findLast(self, ([k]) => k === key), ([, value]) => value));
/**
 * @since 1.0.0
 * @category combinators
 */
const set = exports.set = /*#__PURE__*/(0, _Function.dual)(3, (self, key, value) => Arr.append(Arr.filter(self, ([k]) => k !== key), [key, String(value)]));
/**
 * @since 1.0.0
 * @category combinators
 */
const setAll = exports.setAll = /*#__PURE__*/(0, _Function.dual)(2, (self, input) => {
  const toSet = fromInput(input);
  const keys = toSet.map(([k]) => k);
  return Arr.appendAll(Arr.filter(self, ([k]) => keys.includes(k)), toSet);
});
/**
 * @since 1.0.0
 * @category combinators
 */
const append = exports.append = /*#__PURE__*/(0, _Function.dual)(3, (self, key, value) => Arr.append(self, [key, String(value)]));
/**
 * @since 1.0.0
 * @category combinators
 */
const appendAll = exports.appendAll = /*#__PURE__*/(0, _Function.dual)(2, (self, input) => Arr.appendAll(self, fromInput(input)));
/**
 * @since 1.0.0
 * @category combinators
 */
const remove = exports.remove = /*#__PURE__*/(0, _Function.dual)(2, (self, key) => Arr.filter(self, ([k]) => k !== key));
/**
 * @since 1.0.0
 * @category conversions
 */
const makeUrl = (url, params, hash) => {
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
exports.makeUrl = makeUrl;
const toString = self => new URLSearchParams(self).toString();
exports.toString = toString;
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
const toRecord = self => {
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
exports.toRecord = toRecord;
const schemaJson = (schema, options) => {
  const parse = Schema.decodeUnknown(Schema.parseJson(schema), options);
  return (0, _Function.dual)(2, (self, field) => parse(Option.getOrElse(getLast(self, field), () => "")));
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
exports.schemaJson = schemaJson;
const schemaStruct = (schema, options) => self => {
  const parse = Schema.decodeUnknown(schema, options);
  return parse(toRecord(self));
};
/**
 * @since 1.0.0
 * @category schema
 */
exports.schemaStruct = schemaStruct;
const schemaFromString = exports.schemaFromString = /*#__PURE__*/Schema.transform(Schema.String, schemaFromSelf, {
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
const schemaRecord = schema => Schema.transform(schemaFromSelf, schema, {
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
exports.schemaRecord = schemaRecord;
const schemaParse = schema => Schema.compose(schemaFromString, schemaRecord(schema));
exports.schemaParse = schemaParse;
//# sourceMappingURL=UrlParams.js.map