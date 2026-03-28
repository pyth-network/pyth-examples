import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatusStarted = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("Started"),
  startTime: Schema.BigInt
});
/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatusEnded = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("Ended"),
  startTime: Schema.BigInt,
  endTime: Schema.BigInt
});
/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatus = /*#__PURE__*/Schema.Union(SpanStatusStarted, SpanStatusEnded);
/**
 * @since 1.0.0
 * @category schemas
 */
export const ExternalSpan = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("ExternalSpan"),
  spanId: Schema.String,
  traceId: Schema.String,
  sampled: Schema.Boolean
});
/**
 * @since 1.0.0
 * @category schemas
 */
export const Span = /*#__PURE__*/Schema.Struct({
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
export const SpanEvent = /*#__PURE__*/Schema.Struct({
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
export const ParentSpan = /*#__PURE__*/Schema.Union(Span, ExternalSpan);
/**
 * @since 1.0.0
 * @category schemas
 */
export const Ping = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("Ping")
});
/**
 * @since 1.0.0
 * @category schemas
 */
export const Pong = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("Pong")
});
/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricsRequest = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("MetricsRequest")
});
/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricLabel = /*#__PURE__*/Schema.Struct({
  key: Schema.String,
  value: Schema.String
});
/**
 * @since 1.0.0
 * @category schemas
 */
export const metric = (tag, state) => Schema.Struct({
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
export const Counter = /*#__PURE__*/metric("Counter", /*#__PURE__*/Schema.Struct({
  count: /*#__PURE__*/Schema.Union(Schema.Number, Schema.BigInt)
}));
/**
 * @since 1.0.0
 * @category schemas
 */
export const Frequency = /*#__PURE__*/metric("Frequency", /*#__PURE__*/Schema.Struct({
  occurrences: /*#__PURE__*/Schema.Record({
    key: Schema.String,
    value: Schema.Number
  })
}));
/**
 * @since 1.0.0
 * @category schemas
 */
export const Gauge = /*#__PURE__*/metric("Gauge", /*#__PURE__*/Schema.Struct({
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
export const Histogram = /*#__PURE__*/metric("Histogram", /*#__PURE__*/Schema.Struct({
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
export const Summary = /*#__PURE__*/metric("Summary", /*#__PURE__*/Schema.Struct({
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
export const Metric = /*#__PURE__*/Schema.Union(Counter, Frequency, Gauge, Histogram, Summary);
/**
 * @since 1.0.0
 * @category schemas
 */
export const MetricsSnapshot = /*#__PURE__*/Schema.Struct({
  _tag: /*#__PURE__*/Schema.Literal("MetricsSnapshot"),
  metrics: /*#__PURE__*/Schema.Array(Metric)
});
/**
 * @since 1.0.0
 * @category schemas
 */
export const Request = /*#__PURE__*/Schema.Union(Ping, Span, SpanEvent, MetricsSnapshot);
/**
 * @since 1.0.0
 * @category schemas
 */
export const Response = /*#__PURE__*/Schema.Union(Pong, MetricsRequest);
//# sourceMappingURL=Domain.js.map