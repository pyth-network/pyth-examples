"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.effectify = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const effectify = (fn, onError, onSyncError) => (...args) => Effect.async(resume => {
  try {
    fn(...args, (err, result) => {
      if (err) {
        resume(Effect.fail(onError ? onError(err, args) : err));
      } else {
        resume(Effect.succeed(result));
      }
    });
  } catch (err) {
    resume(onSyncError ? Effect.fail(onSyncError(err, args)) : Effect.die(err));
  }
});
exports.effectify = effectify;
//# sourceMappingURL=effectify.js.map