"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeExecutor = exports.TypeId = exports.ProcessTypeId = exports.ProcessId = exports.ExitCode = exports.CommandExecutor = void 0;
var Brand = _interopRequireWildcard(require("effect/Brand"));
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var _Context = require("effect/Context");
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Sink = _interopRequireWildcard(require("effect/Sink"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/CommandExecutor");
/** @internal */
const ProcessTypeId = exports.ProcessTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Process");
/** @internal */
const ExitCode = exports.ExitCode = /*#__PURE__*/Brand.nominal();
/** @internal */
const ProcessId = exports.ProcessId = /*#__PURE__*/Brand.nominal();
/** @internal */
const CommandExecutor = exports.CommandExecutor = /*#__PURE__*/(0, _Context.GenericTag)("@effect/platform/CommandExecutor");
/** @internal */
const makeExecutor = start => {
  const stream = command => Stream.unwrapScoped(Effect.map(start(command), process => process.stdout));
  const streamLines = (command, encoding) => {
    const decoder = new TextDecoder(encoding);
    return Stream.splitLines(Stream.mapChunks(stream(command), Chunk.map(bytes => decoder.decode(bytes))));
  };
  return {
    [TypeId]: TypeId,
    start,
    exitCode: command => Effect.scoped(Effect.flatMap(start(command), process => process.exitCode)),
    stream,
    string: (command, encoding = "utf-8") => {
      const decoder = new TextDecoder(encoding);
      return (0, _Function.pipe)(start(command), Effect.flatMap(process => Stream.run(process.stdout, collectUint8Array)), Effect.map(bytes => decoder.decode(bytes)), Effect.scoped);
    },
    lines: (command, encoding = "utf-8") => {
      return (0, _Function.pipe)(streamLines(command, encoding), Stream.runCollect, Effect.map(Chunk.toArray));
    },
    streamLines
  };
};
exports.makeExecutor = makeExecutor;
const collectUint8Array = /*#__PURE__*/Sink.foldLeftChunks(/*#__PURE__*/new Uint8Array(), (bytes, chunk) => Chunk.reduce(chunk, bytes, (acc, curr) => {
  const newArray = new Uint8Array(acc.length + curr.length);
  newArray.set(acc);
  newArray.set(curr, acc.length);
  return newArray;
}));
//# sourceMappingURL=commandExecutor.js.map