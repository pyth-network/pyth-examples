"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unsafeFromRecord = exports.setAll = exports.set = exports.schemaFromSelf = exports.schema = exports.remove = exports.redact = exports.merge = exports.isHeaders = exports.has = exports.get = exports.fromInput = exports.empty = exports.currentRedactedNames = exports.HeadersTypeId = void 0;
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var FiberRefs = _interopRequireWildcard(require("effect/FiberRefs"));
var _Function = require("effect/Function");
var _GlobalValue = require("effect/GlobalValue");
var _Inspectable = require("effect/Inspectable");
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Record = _interopRequireWildcard(require("effect/Record"));
var Redacted = _interopRequireWildcard(require("effect/Redacted"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var String = _interopRequireWildcard(require("effect/String"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category type ids
 */
const HeadersTypeId = exports.HeadersTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Headers");
/**
 * @since 1.0.0
 * @category refinements
 */
const isHeaders = u => Predicate.hasProperty(u, HeadersTypeId);
exports.isHeaders = isHeaders;
const Proto = /*#__PURE__*/Object.assign(/*#__PURE__*/Object.create(null), {
  [HeadersTypeId]: HeadersTypeId,
  [_Inspectable.symbolRedactable](fiberRefs) {
    return redact(this, FiberRefs.getOrDefault(fiberRefs, currentRedactedNames));
  }
});
const make = input => Object.assign(Object.create(Proto), input);
/**
 * @since 1.0.0
 * @category schemas
 */
const schemaFromSelf = exports.schemaFromSelf = /*#__PURE__*/Schema.declare(isHeaders, {
  identifier: "Headers",
  equivalence: () => Record.getEquivalence(String.Equivalence)
});
/**
 * @since 1.0.0
 * @category schemas
 */
const schema = exports.schema = /*#__PURE__*/Schema.transform(/*#__PURE__*/Schema.Record({
  key: Schema.String,
  value: Schema.String
}), schemaFromSelf, {
  strict: true,
  decode: record => fromInput(record),
  encode: _Function.identity
});
/**
 * @since 1.0.0
 * @category constructors
 */
const empty = exports.empty = /*#__PURE__*/Object.create(Proto);
/**
 * @since 1.0.0
 * @category constructors
 */
const fromInput = input => {
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
exports.fromInput = fromInput;
const unsafeFromRecord = input => Object.setPrototypeOf(input, Proto);
/**
 * @since 1.0.0
 * @category combinators
 */
exports.unsafeFromRecord = unsafeFromRecord;
const has = exports.has = /*#__PURE__*/(0, _Function.dual)(2, (self, key) => key.toLowerCase() in self);
/**
 * @since 1.0.0
 * @category combinators
 */
const get = exports.get = /*#__PURE__*/(0, _Function.dual)(2, (self, key) => Record.get(self, key.toLowerCase()));
/**
 * @since 1.0.0
 * @category combinators
 */
const set = exports.set = /*#__PURE__*/(0, _Function.dual)(3, (self, key, value) => {
  const out = make(self);
  out[key.toLowerCase()] = value;
  return out;
});
/**
 * @since 1.0.0
 * @category combinators
 */
const setAll = exports.setAll = /*#__PURE__*/(0, _Function.dual)(2, (self, headers) => make({
  ...self,
  ...fromInput(headers)
}));
/**
 * @since 1.0.0
 * @category combinators
 */
const merge = exports.merge = /*#__PURE__*/(0, _Function.dual)(2, (self, headers) => {
  const out = make(self);
  Object.assign(out, headers);
  return out;
});
/**
 * @since 1.0.0
 * @category combinators
 */
const remove = exports.remove = /*#__PURE__*/(0, _Function.dual)(2, (self, key) => {
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
const redact = exports.redact = /*#__PURE__*/(0, _Function.dual)(2, (self, key) => {
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
const currentRedactedNames = exports.currentRedactedNames = /*#__PURE__*/(0, _GlobalValue.globalValue)("@effect/platform/Headers/currentRedactedNames", () => FiberRef.unsafeMake(["authorization", "cookie", "set-cookie", "x-api-key"]));
//# sourceMappingURL=Headers.js.map