/**
 * @since 1.0.0
 */
import type { Option } from "effect/Option";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const SpanStatusStarted: Schema.Struct<{
    _tag: Schema.Literal<["Started"]>;
    startTime: typeof Schema.BigInt;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const SpanStatusEnded: Schema.Struct<{
    _tag: Schema.Literal<["Ended"]>;
    startTime: typeof Schema.BigInt;
    endTime: typeof Schema.BigInt;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const SpanStatus: Schema.Union<[Schema.Struct<{
    _tag: Schema.Literal<["Started"]>;
    startTime: typeof Schema.BigInt;
}>, Schema.Struct<{
    _tag: Schema.Literal<["Ended"]>;
    startTime: typeof Schema.BigInt;
    endTime: typeof Schema.BigInt;
}>]>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const ExternalSpan: Schema.Struct<{
    _tag: Schema.Literal<["ExternalSpan"]>;
    spanId: typeof Schema.String;
    traceId: typeof Schema.String;
    sampled: typeof Schema.Boolean;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export interface ExternalSpanFrom extends Schema.Schema.Encoded<typeof ExternalSpan> {
}
/**
 * @since 1.0.0
 * @category schemas
 */
export interface ExternalSpan extends Schema.Schema.Type<typeof ExternalSpan> {
}
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Span: Schema.Schema<Span, SpanFrom>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const SpanEvent: Schema.Schema<SpanEvent, {
    readonly _tag: "SpanEvent";
    readonly spanId: string;
    readonly traceId: string;
    readonly name: string;
    readonly attributes: {
        readonly [x: string]: unknown;
    };
    readonly startTime: string;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const ParentSpan: Schema.Union<[Schema.Schema<Span, SpanFrom, never>, Schema.Struct<{
    _tag: Schema.Literal<["ExternalSpan"]>;
    spanId: typeof Schema.String;
    traceId: typeof Schema.String;
    sampled: typeof Schema.Boolean;
}>]>;
/**
 * @since 1.0.0
 * @category schemas
 */
export type ParentSpanFrom = SpanFrom | ExternalSpanFrom;
/**
 * @since 1.0.0
 * @category schemas
 */
export type ParentSpan = Span | ExternalSpan;
/**
 * @since 1.0.0
 * @category schemas
 */
export interface SpanFrom {
    readonly _tag: "Span";
    readonly spanId: string;
    readonly traceId: string;
    readonly name: string;
    readonly sampled: boolean;
    readonly attributes: ReadonlyArray<readonly [string, unknown]>;
    readonly parent: Schema.OptionEncoded<ParentSpanFrom>;
    readonly status: {
        readonly _tag: "Started";
        readonly startTime: string;
    } | {
        readonly _tag: "Ended";
        readonly startTime: string;
        readonly endTime: string;
    };
}
/**
 * @since 1.0.0
 * @category schemas
 */
export interface Span {
    readonly _tag: "Span";
    readonly spanId: string;
    readonly traceId: string;
    readonly name: string;
    readonly sampled: boolean;
    readonly attributes: ReadonlyMap<string, unknown>;
    readonly parent: Option<ParentSpan>;
    readonly status: {
        readonly _tag: "Started";
        readonly startTime: bigint;
    } | {
        readonly _tag: "Ended";
        readonly startTime: bigint;
        readonly endTime: bigint;
    };
}
/**
 * @since 1.0.0
 * @category schemas
 */
export interface SpanEvent {
    readonly _tag: "SpanEvent";
    readonly spanId: string;
    readonly traceId: string;
    readonly name: string;
    readonly attributes: {
        readonly [x: string]: unknown;
    };
    readonly startTime: bigint;
}
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Ping: Schema.Struct<{
    _tag: Schema.Literal<["Ping"]>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Pong: Schema.Struct<{
    _tag: Schema.Literal<["Pong"]>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const MetricsRequest: Schema.Struct<{
    _tag: Schema.Literal<["MetricsRequest"]>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const MetricLabel: Schema.Struct<{
    key: typeof Schema.String;
    value: typeof Schema.String;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const metric: <Tag extends string, S, IS, R>(tag: Tag, state: Schema.Schema<S, IS, R>) => Schema.Struct<{
    _tag: Schema.Literal<[Tag]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<S, IS, R>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Counter: Schema.Struct<{
    _tag: Schema.Literal<["Counter"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly count: number | bigint;
    }, {
        readonly count: string | number;
    }, never>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Frequency: Schema.Struct<{
    _tag: Schema.Literal<["Frequency"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly occurrences: {
            readonly [x: string]: number;
        };
    }, {
        readonly occurrences: {
            readonly [x: string]: number;
        };
    }, never>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Gauge: Schema.Struct<{
    _tag: Schema.Literal<["Gauge"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly value: number | bigint;
    }, {
        readonly value: string | number;
    }, never>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Histogram: Schema.Struct<{
    _tag: Schema.Literal<["Histogram"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly count: number;
        readonly buckets: readonly (readonly [number, number])[];
        readonly min: number;
        readonly max: number;
        readonly sum: number;
    }, {
        readonly count: number;
        readonly buckets: readonly (readonly [number | null, number])[];
        readonly min: number;
        readonly max: number;
        readonly sum: number;
    }, never>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Summary: Schema.Struct<{
    _tag: Schema.Literal<["Summary"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly count: number;
        readonly min: number;
        readonly max: number;
        readonly sum: number;
        readonly error: number;
        readonly quantiles: readonly (readonly [number, Option<number>])[];
    }, {
        readonly count: number;
        readonly min: number;
        readonly max: number;
        readonly sum: number;
        readonly error: number;
        readonly quantiles: readonly (readonly [number, {
            readonly _tag: "None";
        } | {
            readonly _tag: "Some";
            readonly value: number;
        }])[];
    }, never>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Metric: Schema.Union<[Schema.Struct<{
    _tag: Schema.Literal<["Counter"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly count: number | bigint;
    }, {
        readonly count: string | number;
    }, never>;
}>, Schema.Struct<{
    _tag: Schema.Literal<["Frequency"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly occurrences: {
            readonly [x: string]: number;
        };
    }, {
        readonly occurrences: {
            readonly [x: string]: number;
        };
    }, never>;
}>, Schema.Struct<{
    _tag: Schema.Literal<["Gauge"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly value: number | bigint;
    }, {
        readonly value: string | number;
    }, never>;
}>, Schema.Struct<{
    _tag: Schema.Literal<["Histogram"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly count: number;
        readonly buckets: readonly (readonly [number, number])[];
        readonly min: number;
        readonly max: number;
        readonly sum: number;
    }, {
        readonly count: number;
        readonly buckets: readonly (readonly [number | null, number])[];
        readonly min: number;
        readonly max: number;
        readonly sum: number;
    }, never>;
}>, Schema.Struct<{
    _tag: Schema.Literal<["Summary"]>;
    name: typeof Schema.String;
    description: Schema.optionalWith<typeof Schema.String, {
        as: "Option";
    }>;
    tags: Schema.Array$<Schema.Struct<{
        key: typeof Schema.String;
        value: typeof Schema.String;
    }>>;
    state: Schema.Schema<{
        readonly count: number;
        readonly min: number;
        readonly max: number;
        readonly sum: number;
        readonly error: number;
        readonly quantiles: readonly (readonly [number, Option<number>])[];
    }, {
        readonly count: number;
        readonly min: number;
        readonly max: number;
        readonly sum: number;
        readonly error: number;
        readonly quantiles: readonly (readonly [number, {
            readonly _tag: "None";
        } | {
            readonly _tag: "Some";
            readonly value: number;
        }])[];
    }, never>;
}>]>;
/**
 * @since 1.0.0
 * @category schemas
 */
export type Metric = Schema.Schema.Type<typeof Metric>;
/**
 * @since 1.0.0
 * @category schemas
 */
export type MetricFrom = Schema.Schema.Encoded<typeof Metric>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const MetricsSnapshot: Schema.Struct<{
    _tag: Schema.Literal<["MetricsSnapshot"]>;
    metrics: Schema.Array$<Schema.Union<[Schema.Struct<{
        _tag: Schema.Literal<["Counter"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly count: number | bigint;
        }, {
            readonly count: string | number;
        }, never>;
    }>, Schema.Struct<{
        _tag: Schema.Literal<["Frequency"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly occurrences: {
                readonly [x: string]: number;
            };
        }, {
            readonly occurrences: {
                readonly [x: string]: number;
            };
        }, never>;
    }>, Schema.Struct<{
        _tag: Schema.Literal<["Gauge"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly value: number | bigint;
        }, {
            readonly value: string | number;
        }, never>;
    }>, Schema.Struct<{
        _tag: Schema.Literal<["Histogram"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly count: number;
            readonly buckets: readonly (readonly [number, number])[];
            readonly min: number;
            readonly max: number;
            readonly sum: number;
        }, {
            readonly count: number;
            readonly buckets: readonly (readonly [number | null, number])[];
            readonly min: number;
            readonly max: number;
            readonly sum: number;
        }, never>;
    }>, Schema.Struct<{
        _tag: Schema.Literal<["Summary"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly count: number;
            readonly min: number;
            readonly max: number;
            readonly sum: number;
            readonly error: number;
            readonly quantiles: readonly (readonly [number, Option<number>])[];
        }, {
            readonly count: number;
            readonly min: number;
            readonly max: number;
            readonly sum: number;
            readonly error: number;
            readonly quantiles: readonly (readonly [number, {
                readonly _tag: "None";
            } | {
                readonly _tag: "Some";
                readonly value: number;
            }])[];
        }, never>;
    }>]>>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export type MetricsSnapshot = Schema.Schema.Type<typeof MetricsSnapshot>;
/**
 * @since 1.0.0
 * @category schemas
 */
export type MetricsSnapshotFrom = Schema.Schema.Encoded<typeof MetricsSnapshot>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Request: Schema.Union<[Schema.Struct<{
    _tag: Schema.Literal<["Ping"]>;
}>, Schema.Schema<Span, SpanFrom, never>, Schema.Schema<SpanEvent, {
    readonly _tag: "SpanEvent";
    readonly spanId: string;
    readonly traceId: string;
    readonly name: string;
    readonly attributes: {
        readonly [x: string]: unknown;
    };
    readonly startTime: string;
}, never>, Schema.Struct<{
    _tag: Schema.Literal<["MetricsSnapshot"]>;
    metrics: Schema.Array$<Schema.Union<[Schema.Struct<{
        _tag: Schema.Literal<["Counter"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly count: number | bigint;
        }, {
            readonly count: string | number;
        }, never>;
    }>, Schema.Struct<{
        _tag: Schema.Literal<["Frequency"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly occurrences: {
                readonly [x: string]: number;
            };
        }, {
            readonly occurrences: {
                readonly [x: string]: number;
            };
        }, never>;
    }>, Schema.Struct<{
        _tag: Schema.Literal<["Gauge"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly value: number | bigint;
        }, {
            readonly value: string | number;
        }, never>;
    }>, Schema.Struct<{
        _tag: Schema.Literal<["Histogram"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly count: number;
            readonly buckets: readonly (readonly [number, number])[];
            readonly min: number;
            readonly max: number;
            readonly sum: number;
        }, {
            readonly count: number;
            readonly buckets: readonly (readonly [number | null, number])[];
            readonly min: number;
            readonly max: number;
            readonly sum: number;
        }, never>;
    }>, Schema.Struct<{
        _tag: Schema.Literal<["Summary"]>;
        name: typeof Schema.String;
        description: Schema.optionalWith<typeof Schema.String, {
            as: "Option";
        }>;
        tags: Schema.Array$<Schema.Struct<{
            key: typeof Schema.String;
            value: typeof Schema.String;
        }>>;
        state: Schema.Schema<{
            readonly count: number;
            readonly min: number;
            readonly max: number;
            readonly sum: number;
            readonly error: number;
            readonly quantiles: readonly (readonly [number, Option<number>])[];
        }, {
            readonly count: number;
            readonly min: number;
            readonly max: number;
            readonly sum: number;
            readonly error: number;
            readonly quantiles: readonly (readonly [number, {
                readonly _tag: "None";
            } | {
                readonly _tag: "Some";
                readonly value: number;
            }])[];
        }, never>;
    }>]>>;
}>]>;
/**
 * @since 1.0.0
 * @category schemas
 */
export type Request = Schema.Schema.Type<typeof Request>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare namespace Request {
    /**
     * @since 1.0.0
     * @category schemas
     */
    type WithoutPing = Exclude<Request, {
        readonly _tag: "Ping";
    }>;
}
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const Response: Schema.Union<[Schema.Struct<{
    _tag: Schema.Literal<["Pong"]>;
}>, Schema.Struct<{
    _tag: Schema.Literal<["MetricsRequest"]>;
}>]>;
/**
 * @since 1.0.0
 * @category schemas
 */
export type Response = Schema.Schema.Type<typeof Response>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare namespace Response {
    /**
     * @since 1.0.0
     * @category schemas
     */
    type WithoutPong = Exclude<Response, {
        readonly _tag: "Pong";
    }>;
}
//# sourceMappingURL=Domain.d.ts.map