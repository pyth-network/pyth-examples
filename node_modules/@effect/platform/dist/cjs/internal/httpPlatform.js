"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tag = exports.make = exports.layer = exports.TypeId = void 0;
var Context = _interopRequireWildcard(require("effect/Context"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var Etag = _interopRequireWildcard(require("../Etag.js"));
var FileSystem = _interopRequireWildcard(require("../FileSystem.js"));
var Headers = _interopRequireWildcard(require("../Headers.js"));
var serverResponse = _interopRequireWildcard(require("./httpServerResponse.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const TypeId = exports.TypeId = /*#__PURE__*/Symbol.for("@effect/platform/HttpPlatform");
/** @internal */
const tag = exports.tag = /*#__PURE__*/Context.GenericTag("@effect/platform/HttpPlatform");
/** @internal */
const make = impl => Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const etagGen = yield* Etag.Generator;
  return tag.of({
    [TypeId]: TypeId,
    fileResponse(path, options) {
      return (0, _Function.pipe)(Effect.bindTo(fs.stat(path), "info"), Effect.bind("etag", ({
        info
      }) => etagGen.fromFileInfo(info)), Effect.map(({
        etag,
        info
      }) => {
        const start = Number(options?.offset ?? 0);
        const end = options?.bytesToRead !== undefined ? start + Number(options.bytesToRead) : undefined;
        const headers = Headers.set(options?.headers ? Headers.fromInput(options.headers) : Headers.empty, "etag", Etag.toString(etag));
        if (info.mtime._tag === "Some") {
          ;
          headers["last-modified"] = info.mtime.value.toUTCString();
        }
        const contentLength = end !== undefined ? end - start : Number(info.size) - start;
        return impl.fileResponse(path, options?.status ?? 200, options?.statusText, headers, start, end, contentLength);
      }));
    },
    fileWebResponse(file, options) {
      return Effect.map(etagGen.fromFileWeb(file), etag => {
        const headers = Headers.merge(options?.headers ? Headers.fromInput(options.headers) : Headers.empty, Headers.unsafeFromRecord({
          etag: Etag.toString(etag),
          "last-modified": new Date(file.lastModified).toUTCString()
        }));
        return impl.fileWebResponse(file, options?.status ?? 200, options?.statusText, headers, options);
      });
    }
  });
});
/** @internal */
exports.make = make;
const layer = exports.layer = /*#__PURE__*/Layer.effect(tag, Effect.flatMap(FileSystem.FileSystem, fs => make({
  fileResponse(path, status, statusText, headers, start, end, contentLength) {
    return serverResponse.stream(fs.stream(path, {
      offset: start,
      bytesToRead: end !== undefined ? end - start : undefined
    }), {
      contentLength,
      headers,
      status,
      statusText
    });
  },
  fileWebResponse(file, status, statusText, headers, _options) {
    return serverResponse.stream(Stream.fromReadableStream(() => file.stream(), _Function.identity), {
      headers,
      status,
      statusText
    });
  }
}))).pipe(/*#__PURE__*/Layer.provide(Etag.layerWeak));
//# sourceMappingURL=httpPlatform.js.map