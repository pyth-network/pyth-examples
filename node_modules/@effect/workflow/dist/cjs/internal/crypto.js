"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeHashDigest = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const makeHashDigest = original => Effect.map(Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(original))), buffer => {
  const data = new Uint8Array(buffer);
  let hexString = "";
  for (let i = 0; i < 16; i++) {
    hexString += data[i].toString(16).padStart(2, "0");
  }
  return hexString;
});
exports.makeHashDigest = makeHashDigest;
//# sourceMappingURL=crypto.js.map