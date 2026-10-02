"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.xb3 = exports.w3c = exports.toHeaders = exports.fromHeaders = exports.b3 = void 0;
var Option = _interopRequireWildcard(require("effect/Option"));
var Tracer = _interopRequireWildcard(require("effect/Tracer"));
var Headers = _interopRequireWildcard(require("./Headers.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category encoding
 */
const toHeaders = span => Headers.unsafeFromRecord({
  b3: `${span.traceId}-${span.spanId}-${span.sampled ? "1" : "0"}${span.parent._tag === "Some" ? `-${span.parent.value.spanId}` : ""}`,
  traceparent: `00-${span.traceId}-${span.spanId}-${span.sampled ? "01" : "00"}`
});
/**
 * @since 1.0.0
 * @category decoding
 */
exports.toHeaders = toHeaders;
const fromHeaders = headers => {
  let span = w3c(headers);
  if (span._tag === "Some") {
    return span;
  }
  span = b3(headers);
  if (span._tag === "Some") {
    return span;
  }
  return xb3(headers);
};
/**
 * @since 1.0.0
 * @category decoding
 */
exports.fromHeaders = fromHeaders;
const b3 = headers => {
  if (!("b3" in headers)) {
    return Option.none();
  }
  const parts = headers["b3"].split("-");
  if (parts.length < 2) {
    return Option.none();
  }
  return Option.some(Tracer.externalSpan({
    traceId: parts[0],
    spanId: parts[1],
    sampled: parts[2] ? parts[2] === "1" : true
  }));
};
/**
 * @since 1.0.0
 * @category decoding
 */
exports.b3 = b3;
const xb3 = headers => {
  if (!headers["x-b3-traceid"] || !headers["x-b3-spanid"]) {
    return Option.none();
  }
  return Option.some(Tracer.externalSpan({
    traceId: headers["x-b3-traceid"],
    spanId: headers["x-b3-spanid"],
    sampled: headers["x-b3-sampled"] ? headers["x-b3-sampled"] === "1" : true
  }));
};
exports.xb3 = xb3;
const w3cTraceId = /^[0-9a-f]{32}$/i;
const w3cSpanId = /^[0-9a-f]{16}$/i;
/**
 * @since 1.0.0
 * @category decoding
 */
const w3c = headers => {
  if (!headers["traceparent"]) {
    return Option.none();
  }
  const parts = headers["traceparent"].split("-");
  if (parts.length !== 4) {
    return Option.none();
  }
  const [version, traceId, spanId, flags] = parts;
  switch (version) {
    case "00":
      {
        if (w3cTraceId.test(traceId) === false || w3cSpanId.test(spanId) === false) {
          return Option.none();
        }
        return Option.some(Tracer.externalSpan({
          traceId,
          spanId,
          sampled: (parseInt(flags, 16) & 1) === 1
        }));
      }
    default:
      {
        return Option.none();
      }
  }
};
exports.w3c = w3c;
//# sourceMappingURL=HttpTraceContext.js.map