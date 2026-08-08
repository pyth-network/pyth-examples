"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withRun = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const withRun = () => f => Effect.suspend(() => {
  const semaphore = Effect.unsafeMakeSemaphore(1);
  let buffer = [];
  let write = (...args) => Effect.contextWith(context => {
    buffer.push([args, context]);
  });
  return Effect.map(f((...args) => write(...args)), a => ({
    ...a,
    run(f) {
      return semaphore.withPermits(1)(Effect.gen(function* () {
        const prev = write;
        write = f;
        for (const [args, context] of buffer) {
          yield* Effect.provide(write(...args), context);
        }
        buffer = [];
        return yield* Effect.onExit(Effect.never, () => {
          write = prev;
          return Effect.void;
        });
      }));
    }
  }));
});
exports.withRun = withRun;
//# sourceMappingURL=utils.js.map