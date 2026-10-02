"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromWritableChannel = exports.fromWritable = void 0;
var Channel = _interopRequireWildcard(require("effect/Channel"));
var Deferred = _interopRequireWildcard(require("effect/Deferred"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Sink = _interopRequireWildcard(require("effect/Sink"));
var _stream = require("./stream.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const fromWritable = (evaluate, onError, options) => Sink.fromChannel(fromWritableChannel(evaluate, onError, options));
/** @internal */
exports.fromWritable = fromWritable;
const fromWritableChannel = (writable, onError, options) => Channel.flatMap(Effect.zip(Effect.sync(() => writable()), Deferred.make()), ([writable, deferred]) => Channel.embedInput(writableOutput(writable, deferred, onError), (0, _stream.writeInput)(writable, cause => Deferred.failCause(deferred, cause), options, Deferred.complete(deferred, Effect.void))));
exports.fromWritableChannel = fromWritableChannel;
const writableOutput = (writable, deferred, onError) => Effect.suspend(() => {
  function handleError(err) {
    Deferred.unsafeDone(deferred, Effect.fail(onError(err)));
  }
  writable.on("error", handleError);
  return Effect.ensuring(Deferred.await(deferred), Effect.sync(() => {
    writable.removeListener("error", handleError);
  }));
});
//# sourceMappingURL=sink.js.map