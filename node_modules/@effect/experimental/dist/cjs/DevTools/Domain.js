"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.metric = exports.Summary = exports.SpanStatusStarted = exports.SpanStatusEnded = exports.SpanStatus = exports.SpanEvent = exports.Span = exports.Response = exports.Request = exports.Pong = exports.Ping = exports.ParentSpan = exports.MetricsSnapshot = exports.MetricsRequest = exports.MetricLabel = exports.Metric = exports.Histogram = exports.Gauge = exports.Frequency = exports.ExternalSpan = exports.Counter = void 0;
var Schema = _interopRequireWildcard(require("effect/Schema"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category schemas
 */
const SpanStatusStarted = exports.SpanStatusStarted = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("Started"),
  startTime: Schema.BigInt
});
/**
 * @since 1.0.0
 * @category schemas
 */
const SpanStatusEnded = exports.SpanStatusEnded = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("Ended"),
  startTime: Schema.BigInt,
  endTime: Schema.BigInt
});
/**
 * @since 1.0.0
 * @category schemas
 */
const SpanStatus = exports.SpanStatus = /*#__PURE__*/Schema.Union(SpanStatusStarted, SpanStatusEnded);
/**
 * @since 1.0.0
 * @category schemas
 */
const ExternalSpan = exports.ExternalSpan = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("ExternalSpan"),
  spanId: Schema.String,
  traceId: Schema.String,
  sampled: Schema.Boolean
});
/**
 * @since 1.0.0
 * @category schemas
 */
const Span = exports.Span = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("Span"),
  spanId: Schema.String,
  traceId: Schema.String,
  name: Schema.String,
  sampled: Schema.Boolean,
  attributes: /*#__PURE__*/Schema.ReadonlyMap({
    key: Schema.String,
    value: Schema.Unknown
  }),
  status: SpanStatus,
  parent: /*#__PURE__*/Schema.Option(/*#__PURE__*/Schema.suspend(() => ParentSpan)
  // add a title annotation to avoid "Cannot access 'ParentSpan' before initialization" error during module initialization
  .annotations({
    title: "ParentSpan"
  }))
});
/**
 * @since 1.0.0
 * @category schemas
 */
const SpanEvent = exports.SpanEvent = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("SpanEvent"),
  traceId: Schema.String,
  spanId: Schema.String,
  name: Schema.String,
  startTime: Schema.BigInt,
  attributes: /*#__PURE__*/Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  })
});
/**
 * @since 1.0.0
 * @category schemas
 */
const ParentSpan = exports.ParentSpan = /*#__PURE__*/Schema.Union(Span, ExternalSpan);
/**
 * @since 1.0.0
 * @category schemas
 */
const Ping = exports.Ping = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("Ping")
});
/**
 * @since 1.0.0
 * @category schemas
 */
const Pong = exports.Pong = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("Pong")
});
/**
 * @since 1.0.0
 * @category schemas
 */
const MetricsRequest = exports.MetricsRequest = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("MetricsRequest")
});
/**
 * @since 1.0.0
 * @category schemas
 */
const MetricLabel = exports.MetricLabel = /*#__PURE__*/Schema.Struct({
  key: Schema.String,
  value: Schema.String
});
/**
 * @since 1.0.0
 * @category schemas
 */
const metric = (tag, state) => Schema.Struct({
  _tag: Schema.Literal(tag),
  name: Schema.String,
  description: Schema.optionalWith(Schema.String, {
    as: "Option"
  }),
  tags: Schema.Array(MetricLabel),
  state
});
/**
 * @since 1.0.0
 * @category schemas
 */
exports.metric = metric;
const Counter = exports.Counter = /*#__PURE__*/metric("Counter", /*#__PURE__*/Schema.Struct({
  count: /*#__PURE__*/Schema.Union(Schema.Number, Schema.BigInt)
}));
/**
 * @since 1.0.0
 * @category schemas
 */
const Frequency = exports.Frequency = /*#__PURE__*/metric("Frequency", /*#__PURE__*/Schema.Struct({
  occurrences: /*#__PURE__*/Schema.Record({
    key: Schema.String,
    value: Schema.Number
  })
}));
/**
 * @since 1.0.0
 * @category schemas
 */
const Gauge = exports.Gauge = /*#__PURE__*/metric("Gauge", /*#__PURE__*/Schema.Struct({
  value: /*#__PURE__*/Schema.Union(Schema.Number, Schema.BigInt)
}));
const numberOrInfinity = /*#__PURE__*/Schema.transform(/*#__PURE__*/Schema.Union(Schema.Number, Schema.Null), Schema.Number, {
  strict: true,
  decode: i => i === null ? Number.POSITIVE_INFINITY : i,
  encode: i => Number.isFinite(i) ? i : null
});
/**
 * @since 1.0.0
 * @category schemas
 */
const Histogram = exports.Histogram = /*#__PURE__*/metric("Histogram", /*#__PURE__*/Schema.Struct({
  buckets: /*#__PURE__*/Schema.Array(/*#__PURE__*/Schema.Tuple(numberOrInfinity, Schema.Number)),
  count: Schema.Number,
  min: Schema.Number,
  max: Schema.Number,
  sum: Schema.Number
}));
/**
 * @since 1.0.0
 * @category schemas
 */
const Summary = exports.Summary = /*#__PURE__*/metric("Summary", /*#__PURE__*/Schema.Struct({
  error: Schema.Number,
  quantiles: /*#__PURE__*/Schema.Array(/*#__PURE__*/Schema.Tuple(Schema.Number, /*#__PURE__*/Schema.Option(Schema.Number))),
  count: Schema.Number,
  min: Schema.Number,
  max: Schema.Number,
  sum: Schema.Number
}));
/**
 * @since 1.0.0
 * @category schemas
 */
const Metric = exports.Metric = /*#__PURE__*/Schema.Union(Counter, Frequency, Gauge, Histogram, Summary);
/**
 * @since 1.0.0
 * @category schemas
 */
const MetricsSnapshot = exports.MetricsSnapshot = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("MetricsSnapshot"),
  metrics: /*#__PURE__*/Schema.Array(Metric)
});
/**
 * @since 1.0.0
 * @category schemas
 */
const Request = exports.Request = /*#__PURE__*/Schema.Union(Ping, Span, SpanEvent, MetricsSnapshot);
/**
 * @since 1.0.0
 * @category schemas
 */
const Response = exports.Response = /*#__PURE__*/Schema.Union(Pong, MetricsRequest);
//# sourceMappingURL=Domain.js.map