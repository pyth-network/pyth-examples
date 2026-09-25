import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
/** @internal */
export const GeneratorTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Etag/Generator");
/** @internal */
export const tag = /*#__PURE__*/Context.GenericTag("@effect/platform/Etag/Generator");
/** @internal */
export const toString = self => {
  switch (self._tag) {
    case "Weak":
      return `W/"${self.value}"`;
    case "Strong":
      return `"${self.value}"`;
  }
};
const fromFileInfo = info => {
  const mtime = info.mtime._tag === "Some" ? info.mtime.value.getTime().toString(16) : "0";
  return `${info.size.toString(16)}-${mtime}`;
};
const fromFileWeb = file => {
  return `${file.size.toString(16)}-${file.lastModified.toString(16)}`;
};
/** @internal */
export const layer = /*#__PURE__*/Layer.succeed(tag, /*#__PURE__*/tag.of({
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
export const layerWeak = /*#__PURE__*/Layer.succeed(tag, /*#__PURE__*/tag.of({
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