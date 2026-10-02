"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = make;
exports.stream = stream;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Option = _interopRequireWildcard(require("effect/Option"));
var Predicate = _interopRequireWildcard(require("effect/Predicate"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @category constructors
 * @since 1.0.0
 */
function make(strings, ...args) {
  const argsLength = args.length;
  const values = new Array(argsLength);
  const effects = [];
  for (let i = 0; i < argsLength; i++) {
    const arg = args[i];
    if (Option.isOption(arg)) {
      values[i] = arg._tag === "Some" ? primitiveToString(arg.value) : "";
    } else if (isSuccess(arg)) {
      values[i] = primitiveToString(arg.effect_instruction_i0);
    } else if (Effect.isEffect(arg)) {
      effects.push([i, arg]);
    } else {
      values[i] = primitiveToString(arg);
    }
  }
  if (effects.length === 0) {
    return Effect.succeed(consolidate(strings, values));
  }
  return Effect.map(Effect.forEach(effects, ([index, effect]) => Effect.tap(effect, value => {
    values[index] = primitiveToString(value);
  }), {
    concurrency: "inherit",
    discard: true
  }), _ => consolidate(strings, values));
}
/**
 * @category constructors
 * @since 1.0.0
 */
function stream(strings, ...args) {
  const chunks = [];
  let buffer = "";
  for (let i = 0, len = args.length; i < len; i++) {
    buffer += strings[i];
    const arg = args[i];
    if (Option.isOption(arg)) {
      buffer += arg._tag === "Some" ? primitiveToString(arg.value) : "";
    } else if (isSuccess(arg)) {
      buffer += primitiveToString(arg.effect_instruction_i0);
    } else if (Predicate.hasProperty(arg, Stream.StreamTypeId)) {
      if (buffer.length > 0) {
        chunks.push(buffer);
        buffer = "";
      }
      if (Effect.isEffect(arg)) {
        chunks.push(Effect.map(arg, primitiveToString));
      } else {
        chunks.push(Stream.map(arg, primitiveToString));
      }
    } else {
      buffer += primitiveToString(arg);
    }
  }
  buffer += strings[strings.length - 1];
  if (buffer.length > 0) {
    chunks.push(buffer);
    buffer = "";
  }
  return Stream.flatMap(Stream.fromIterable(chunks), chunk => typeof chunk === "string" ? Stream.succeed(chunk) : chunk, {
    concurrency: "unbounded"
  });
}
function primitiveToString(value) {
  if (Array.isArray(value)) {
    return value.map(primitiveToString).join("");
  }
  switch (typeof value) {
    case "string":
      {
        return value;
      }
    case "number":
    case "bigint":
      {
        return value.toString();
      }
    case "boolean":
      {
        return value ? "true" : "false";
      }
    default:
      {
        return "";
      }
  }
}
function consolidate(strings, values) {
  let out = "";
  for (let i = 0, len = values.length; i < len; i++) {
    out += strings[i];
    out += values[i];
  }
  return out + strings[strings.length - 1];
}
function isSuccess(u) {
  return Effect.isEffect(u) && u._op === "Success";
}
//# sourceMappingURL=Template.js.map