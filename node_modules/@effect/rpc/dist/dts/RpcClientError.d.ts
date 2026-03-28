/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category Symbols
 */
export declare const TypeId: unique symbol;
/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId;
declare const RpcClientError_base: Schema.TaggedErrorClass<RpcClientError, "RpcClientError", {
    readonly _tag: Schema.tag<"RpcClientError">;
} & {
    reason: Schema.Literal<["Protocol", "Unknown"]>;
    message: typeof Schema.String;
    cause: Schema.optional<typeof Schema.Defect>;
}>;
/**
 * @since 1.0.0
 * @category Errors
 */
export declare class RpcClientError extends RpcClientError_base {
    /**
     * @since 1.0.0
     */
    readonly [TypeId]: TypeId;
}
export {};
//# sourceMappingURL=RpcClientError.d.ts.map