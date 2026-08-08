"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.layerDotEnvAdd = exports.layerDotEnv = exports.fromDotEnv = void 0;
var ConfigProvider = _interopRequireWildcard(require("effect/ConfigProvider"));
var Context = _interopRequireWildcard(require("effect/Context"));
var DefaultServices = _interopRequireWildcard(require("effect/DefaultServices"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var FileSystem = _interopRequireWildcard(require("../FileSystem.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * dot env ConfigProvider
 *
 * Based on
 * - https://github.com/motdotla/dotenv
 * - https://github.com/motdotla/dotenv-expand
 */
/** @internal */
const fromDotEnv = (path, config) => Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const content = yield* fs.readFileString(path);
  const obj = parseDotEnv(content);
  return ConfigProvider.fromMap(new Map(Object.entries(obj)), Object.assign({}, {
    pathDelim: "_",
    seqDelim: ","
  }, config));
});
/** @internal */
exports.fromDotEnv = fromDotEnv;
const layerDotEnv = path => fromDotEnv(path).pipe(Effect.map(Layer.setConfigProvider), Layer.unwrapEffect);
/** @internal */
exports.layerDotEnv = layerDotEnv;
const layerDotEnvAdd = path => Effect.gen(function* () {
  const dotEnvConfigProvider = yield* Effect.orElseSucceed(fromDotEnv(path), () => null);
  if (dotEnvConfigProvider === null) {
    yield* Effect.logDebug(`File '${path}' not found, skipping dotenv ConfigProvider.`);
    return Layer.empty;
  }
  const currentConfigProvider = yield* FiberRef.get(DefaultServices.currentServices).pipe(Effect.map(services => Context.get(services, ConfigProvider.ConfigProvider)));
  const configProvider = ConfigProvider.orElse(currentConfigProvider, () => dotEnvConfigProvider);
  return Layer.setConfigProvider(configProvider);
}).pipe(Layer.unwrapEffect);
/** @internal */
exports.layerDotEnvAdd = layerDotEnvAdd;
const DOT_ENV_LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
/** @internal */
const parseDotEnv = lines => {
  const obj = {};
  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/gm, "\n");
  let match;
  while ((match = DOT_ENV_LINE.exec(lines)) != null) {
    const key = match[1];
    // Default undefined or null to empty string
    let value = match[2] || "";
    // Remove whitespace
    value = value.trim();
    // Check if double quoted
    const maybeQuote = value[0];
    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");
    // Expand newlines if double quoted
    if (maybeQuote === "\"") {
      value = value.replace(/\\n/g, "\n");
      value = value.replace(/\\r/g, "\r");
    }
    // Add to object
    obj[key] = value;
  }
  return expand(obj);
};
/** @internal */
const expand = parsed => {
  const newParsed = {};
  for (const configKey in parsed) {
    // resolve escape sequences
    newParsed[configKey] = interpolate(parsed[configKey], parsed).replace(/\\\$/g, "$");
  }
  return newParsed;
};
/** @internal */
const interpolate = (envValue, parsed) => {
  // find the last unescaped dollar sign in the
  // value so that we can evaluate it
  const lastUnescapedDollarSignIndex = searchLast(envValue, /(?!(?<=\\))\$/g);
  // If we couldn't match any unescaped dollar sign
  // let's return the string as is
  if (lastUnescapedDollarSignIndex === -1) return envValue;
  // This is the right-most group of variables in the string
  const rightMostGroup = envValue.slice(lastUnescapedDollarSignIndex);
  /**
   * This finds the inner most variable/group divided
   * by variable name and default value (if present)
   * (
   *   (?!(?<=\\))\$        // only match dollar signs that are not escaped
   *   {?                   // optional opening curly brace
   *     ([\w]+)            // match the variable name
   *     (?::-([^}\\]*))?   // match an optional default value
   *   }?                   // optional closing curly brace
   * )
   */
  const matchGroup = /((?!(?<=\\))\${?([\w]+)(?::-([^}\\]*))?}?)/;
  const match = rightMostGroup.match(matchGroup);
  if (match !== null) {
    const [_, group, variableName, defaultValue] = match;
    return interpolate(envValue.replace(group, defaultValue || parsed[variableName] || ""), parsed);
  }
  return envValue;
};
/** @internal */
const searchLast = (str, rgx) => {
  const matches = Array.from(str.matchAll(rgx));
  return matches.length > 0 ? matches.slice(-1)[0].index : -1;
};
//# sourceMappingURL=platformConfigProvider.js.map