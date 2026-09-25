/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const WorkerErrorTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type WorkerErrorTypeId = typeof WorkerErrorTypeId;
/**
 * @since 1.0.0
 * @category predicates
 */
export declare const isWorkerError: (u: unknown) => u is WorkerError;
declare const WorkerError_base: Schema.TaggedErrorClass<WorkerError, "WorkerError", {
    readonly _tag: Schema.tag<"WorkerError">;
} & {
    reason: Schema.Literal<["spawn", "decode", "send", "unknown", "encode"]>;
    cause: typeof Schema.Defect;
}>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class WorkerError extends WorkerError_base {
    /**
     * @since 1.0.0
     */
    readonly [WorkerErrorTypeId]: WorkerErrorTypeId;
    /**
     * @since 1.0.0
     */
    static readonly Cause: Schema.Schema<Cause.Cause<WorkerError>, Schema.CauseEncoded<WorkerErrorFrom, unknown>>;
    /**
     * @since 1.0.0
     */
    static readonly encodeCause: (a: Cause.Cause<WorkerError>) => Schema.CauseEncoded<WorkerErrorFrom, unknown>;
    /**
     * @since 1.0.0
     */
    static readonly decodeCause: (u: Schema.CauseEncoded<WorkerErrorFrom, unknown>) => Cause.Cause<WorkerError>;
    /**
     * @since 1.0.0
     */
    get message(): string;
}
/**
 * @since 1.0.0
 * @category errors
 */
export interface WorkerErrorFrom {
    readonly _tag: "WorkerError";
    readonly reason: "spawn" | "decode" | "send" | "unknown" | "encode";
    readonly cause: unknown;
}
export {};
//# sourceMappingURL=WorkerError.d.ts.map