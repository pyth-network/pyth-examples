/**
 * @since 1.0.0
 */
import * as FiberRef from "effect/FiberRef";
import * as FiberRefs from "effect/FiberRefs";
import { dual, identity } from "effect/Function";
import { globalValue } from "effect/GlobalValue";
import { symbolRedactable } from "effect/Inspectable";
import * as Predicate from "effect/Predicate";
import * as Record from "effect/Record";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as String from "effect/String";
/**
 * @since 1.0.0
 * @category type ids
 */
export const HeadersTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Headers");
/**
 * @since 1.0.0
 * @category refinements
 */
export const isHeaders = u => Predicate.hasProperty(u, HeadersTypeId);
const Proto = /*#__PURE__*/Object.assign(/*#__PURE__*/Object.create(null), {
  [HeadersTypeId]: HeadersTypeId,
  [symbolRedactable](fiberRefs) {
    return redact(this, FiberRefs.getOrDefault(fiberRefs, currentRedactedNames));
  }
});
const make = input => Object.assign(Object.create(Proto), input);
/**
 * @since 1.0.0
 * @category schemas
 */
export const schemaFromSelf = /*#__PURE__*/Schema.declare(isHeaders, {
  identifier: "Headers",
  equivalence: () => Record.getEquivalence(String.Equivalence)
});
/**
 * @since 1.0.0
 * @category schemas
 */
export const schema = /*#__PURE__*/Schema.transform(/*#__PURE__*/Schema.Record({
  key: Schema.String,
  value: Schema.String
}), schemaFromSelf, {
  strict: true,
  decode: record => fromInput(record),
  encode: identity
});
/**
 * @since 1.0.0
 * @category constructors
 */
export const empty = /*#__PURE__*/Object.create(Proto);
/**
 * @since 1.0.0
 * @category constructors
 */
export const fromInput = input => {
  if (input === undefined) {
    return empty;
  } else if (Symbol.iterator in input) {
    const out = Object.create(Proto);
    for (const [k, v] of input) {
      out[k.toLowerCase()] = v;
    }
    return out;
  }
  const out = Object.create(Proto);
  for (const [k, v] of Object.entries(input)) {
    if (Array.isArray(v)) {
      out[k.toLowerCase()] = v.join(", ");
    } else if (v !== undefined) {
      out[k.toLowerCase()] = v;
    }
  }
  return out;
};
/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeFromRecord = input => Object.setPrototypeOf(input, Proto);
/**
 * @since 1.0.0
 * @category combinators
 */
export const has = /*#__PURE__*/dual(2, (self, key) => key.toLowerCase() in self);
/**
 * @since 1.0.0
 * @category combinators
 */
export const get = /*#__PURE__*/dual(2, (self, key) => Record.get(self, key.toLowerCase()));
/**
 * @since 1.0.0
 * @category combinators
 */
export const set = /*#__PURE__*/dual(3, (self, key, value) => {
  const out = make(self);
  out[key.toLowerCase()] = value;
  return out;
});
/**
 * @since 1.0.0
 * @category combinators
 */
export const setAll = /*#__PURE__*/dual(2, (self, headers) => make({
  ...self,
  ...fromInput(headers)
}));
/**
 * @since 1.0.0
 * @category combinators
 */
export const merge = /*#__PURE__*/dual(2, (self, headers) => {
  const out = make(self);
  Object.assign(out, headers);
  return out;
});
/**
 * @since 1.0.0
 * @category combinators
 */
export const remove = /*#__PURE__*/dual(2, (self, key) => {
  const out = make(self);
  const modify = key => {
    if (typeof key === "string") {
      const k = key.toLowerCase();
      if (k in self) {
        delete out[k];
      }
    } else {
      for (const name in self) {
        if (key.test(name)) {
          delete out[name];
        }
      }
    }
  };
  if (Array.isArray(key)) {
    for (let i = 0; i < key.length; i++) {
      modify(key[i]);
    }
  } else {
    modify(key);
  }
  return out;
});
/**
 * @since 1.0.0
 * @category combinators
 */
export const redact = /*#__PURE__*/dual(2, (self, key) => {
  const out = {
    ...self
  };
  const modify = key => {
    if (typeof key === "string") {
      const k = key.toLowerCase();
      if (k in self) {
        out[k] = Redacted.make(self[k]);
      }
    } else {
      for (const name in self) {
        if (key.test(name)) {
          out[name] = Redacted.make(self[name]);
        }
      }
    }
  };
  if (Array.isArray(key)) {
    for (let i = 0; i < key.length; i++) {
      modify(key[i]);
    }
  } else {
    modify(key);
  }
  return out;
});
/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentRedactedNames = /*#__PURE__*/globalValue("@effect/platform/Headers/currentRedactedNames", () => FiberRef.unsafeMake(["authorization", "cookie", "set-cookie", "x-api-key"]));
//# sourceMappingURL=Headers.js.map