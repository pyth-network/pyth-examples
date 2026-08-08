"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toFile = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Logger = _interopRequireWildcard(require("effect/Logger"));
var FileSystem = _interopRequireWildcard(require("../FileSystem.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const toFile = exports.toFile = /*#__PURE__*/(0, _Function.dual)(args => Logger.isLogger(args[0]), (self, path, options) => Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const logFile = yield* fs.open(path, {
    flag: "a+",
    ...options
  });
  const encoder = new TextEncoder();
  return yield* Logger.batched(self, options?.batchWindow ?? 1000, output => Effect.ignore(logFile.write(encoder.encode(output.join("\n") + "\n"))));
}));
//# sourceMappingURL=platformLogger.js.map