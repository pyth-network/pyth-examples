"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toString = exports.tag = exports.layerWeak = exports.layer = exports.GeneratorTypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const GeneratorTypeId = exports.GeneratorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Etag/Generator");
/** @internal */
const tag = exports.tag = /*#__PURE__*/Context.GenericTag("@effect/platform/Etag/Generator");
/** @internal */
const toString = self => {
  switch (self._tag) {
    case "Weak":
      return `W/"${self.value}"`;
    case "Strong":
      return `"${self.value}"`;
  }
};
exports.toString = toString;
const fromFileInfo = info => {
  const mtime = info.mtime._tag === "Some" ? info.mtime.value.getTime().toString(16) : "0";
  return `${info.size.toString(16)}-${mtime}`;
};
const fromFileWeb = file => {
  return `${file.size.toString(16)}-${file.lastModified.toString(16)}`;
};
/** @internal */
const layer = exports.layer = /*#__PURE__*/Layer.succeed(tag, /*#__PURE__*/tag.of({
  [GeneratorTypeId]: GeneratorTypeId,
  fromFileInfo(info) {
    return Effect.sync(() => ({
      _tag: "Strong",
      value: fromFileInfo(info)
    }));
  },
  fromFileWeb(file) {
    return Effect.sync(() => ({
      _tag: "Strong",
      value: fromFileWeb(file)
    }));
  }
}));
/** @internal */
const layerWeak = exports.layerWeak = /*#__PURE__*/Layer.succeed(tag, /*#__PURE__*/tag.of({
  [GeneratorTypeId]: GeneratorTypeId,
  fromFileInfo(info) {
    return Effect.sync(() => ({
      _tag: "Weak",
      value: fromFileInfo(info)
    }));
  },
  fromFileWeb(file) {
    return Effect.sync(() => ({
      _tag: "Weak",
      value: fromFileWeb(file)
    }));
  }
}));
//# sourceMappingURL=etag.js.map