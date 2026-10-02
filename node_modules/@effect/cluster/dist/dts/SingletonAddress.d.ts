/**
 * @since 1.0.0
 */
import * as Equal from "effect/Equal";
import * as Hash from "effect/Hash";
import * as Schema from "effect/Schema";
import { ShardId } from "./ShardId.js";
/**
 * @since 1.0.0
 * @category Address
 */
export declare const TypeId: unique symbol;
/**
 * @since 1.0.0
 * @category Address
 */
export type TypeId = typeof TypeId;
declare const SingletonAddress_base: Schema.Class<SingletonAddress, {
    shardId: typeof ShardId;
    name: typeof Schema.NonEmptyTrimmedString;
}, Schema.Struct.Encoded<{
    shardId: typeof ShardId;
    name: typeof Schema.NonEmptyTrimmedString;
}>, never, {
    readonly shardId: ShardId;
} & {
    readonly name: string;
}, {}, {}>;
/**
 * Represents the unique address of an singleton within the cluster.
 *
 * @since 1.0.0
 * @category Address
 */
export declare class SingletonAddress extends SingletonAddress_base {
    /**
     * @since 1.0.0
     */
    readonly [TypeId]: symbol;
    /**
     * @since 1.0.0
     */
    [Hash.symbol](): number;
    /**
     * @since 1.0.0
     */
    [Equal.symbol](that: SingletonAddress): boolean;
}
export {};
//# sourceMappingURL=SingletonAddress.d.ts.map