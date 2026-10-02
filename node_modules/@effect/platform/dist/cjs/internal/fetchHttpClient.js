"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.requestInitTagKey = exports.layer = exports.fetchTagKey = void 0;
var Effect = _interopRequireWildcard(require("effect/Effect"));
var FiberRef = _interopRequireWildcard(require("effect/FiberRef"));
var Stream = _interopRequireWildcard(require("effect/Stream"));
var Headers = _interopRequireWildcard(require("../Headers.js"));
var Error = _interopRequireWildcard(require("../HttpClientError.js"));
var client = _interopRequireWildcard(require("./httpClient.js"));
var internalResponse = _interopRequireWildcard(require("./httpClientResponse.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/** @internal */
const fetchTagKey = exports.fetchTagKey = "@effect/platform/FetchHttpClient/Fetch";
/** @internal */
const requestInitTagKey = exports.requestInitTagKey = "@effect/platform/FetchHttpClient/FetchOptions";
const fetch = /*#__PURE__*/client.make((request, url, signal, fiber) => {
  const context = fiber.getFiberRef(FiberRef.currentContext);
  const fetch = context.unsafeMap.get(fetchTagKey) ?? globalThis.fetch;
  const options = context.unsafeMap.get(requestInitTagKey) ?? {};
  const headers = options.headers ? Headers.merge(Headers.fromInput(options.headers), request.headers) : request.headers;
  const send = body => Effect.map(Effect.tryPromise({
    try: () => fetch(url, {
      ...options,
      method: request.method,
      headers,
      body,
      duplex: request.body._tag === "Stream" ? "half" : undefined,
      signal
    }),
    catch: cause => new Error.RequestError({
      request,
      reason: "Transport",
      cause
    })
  }), response => internalResponse.fromWeb(request, response));
  switch (request.body._tag) {
    case "Raw":
    case "Uint8Array":
      return send(request.body.body);
    case "FormData":
      return send(request.body.formData);
    case "Stream":
      return Effect.flatMap(Stream.toReadableStreamEffect(request.body.stream), send);
  }
  return send(undefined);
});
/** @internal */
const layer = exports.layer = /*#__PURE__*/client.layerMergedContext(/*#__PURE__*/Effect.succeed(fetch));
//# sourceMappingURL=fetchHttpClient.js.map