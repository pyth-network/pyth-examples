"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.layer = void 0;
var EtagImpl = _interopRequireWildcard(require("@effect/platform/Etag"));
var Headers = _interopRequireWildcard(require("@effect/platform/Headers"));
var Platform = _interopRequireWildcard(require("@effect/platform/HttpPlatform"));
var ServerResponse = _interopRequireWildcard(require("@effect/platform/HttpServerResponse"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var _mime = _interopRequireDefault(require("mime"));
var Fs = _interopRequireWildcard(require("node:fs"));
var _nodeStream = require("node:stream");
var FileSystem = _interopRequireWildcard(require("../NodeFileSystem.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const make = exports.make = /*#__PURE__*/Platform.make({
  fileResponse(path, status, statusText, headers, start, end, contentLength) {
    const stream = Fs.createReadStream(path, {
      start,
      end
    });
    return ServerResponse.raw(stream, {
      headers: {
        ...headers,
        "content-type": headers["content-type"] ?? _mime.default.getType(path) ?? "application/octet-stream",
        "content-length": contentLength.toString()
      },
      status,
      statusText
    });
  },
  fileWebResponse(file, status, statusText, headers, _options) {
    return ServerResponse.raw(_nodeStream.Readable.fromWeb(file.stream()), {
      headers: Headers.merge(headers, Headers.unsafeFromRecord({
        "content-type": headers["content-type"] ?? _mime.default.getType(file.name) ?? "application/octet-stream",
        "content-length": file.size.toString()
      })),
      status,
      statusText
    });
  }
});
/** @internal */
const layer = exports.layer = /*#__PURE__*/(0, _Function.pipe)(/*#__PURE__*/Layer.effect(Platform.HttpPlatform, make), /*#__PURE__*/Layer.provide(FileSystem.layer), /*#__PURE__*/Layer.provide(EtagImpl.layer));
//# sourceMappingURL=httpPlatform.js.map