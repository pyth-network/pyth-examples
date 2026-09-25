/**
 * @since 1.0.0
 */
import type * as Brand from "effect/Brand";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import type { MachineId } from "./MachineId.js";
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
/**
 * @since 1.0.0
 * @category Models
 */
export type Snowflake = Brand.Branded<bigint, TypeId>;
/**
 * @since 1.0.0
 * @category Models
 */
export declare const Snowflake: (input: string | bigint) => Snowflake;
/**
 * @since 1.0.0
 * @category Models
 */
export declare namespace Snowflake {
    /**
     * @since 1.0.0
     * @category Models
     */
    interface Parts {
        readonly timestamp: number;
        readonly machineId: MachineId;
        readonly sequence: number;
    }
    /**
     * @since 1.0.0
     * @category Models
     */
    interface Generator {
        readonly unsafeNext: () => Snowflake;
        readonly setMachineId: (machineId: MachineId) => Effect.Effect<void>;
    }
}
/**
 * @since 1.0.0
 * @category Schemas
 */
export declare const SnowflakeFromBigInt: Schema.Schema<Snowflake, bigint>;
/**
 * @since 1.0.0
 * @category Schemas
 */
export declare const SnowflakeFromString: Schema.Schema<Snowflake, string>;
/**
 * @since 1.0.0
 * @category Epoch
 */
export declare const constEpochMillis: number;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: (options: {
    readonly machineId: MachineId;
    readonly sequence: number;
    readonly timestamp: number;
}) => Snowflake;
/**
 * @since 1.0.0
 * @category Parts
 */
export declare const timestamp: (snowflake: Snowflake) => number;
/**
 * @since 1.0.0
 * @category Parts
 */
export declare const dateTime: (snowflake: Snowflake) => DateTime.Utc;
/**
 * @since 1.0.0
 * @category Parts
 */
export declare const machineId: (snowflake: Snowflake) => MachineId;
/**
 * @since 1.0.0
 * @category Parts
 */
export declare const sequence: (snowflake: Snowflake) => number;
/**
 * @since 1.0.0
 * @category Parts
 */
export declare const toParts: (snowflake: Snowflake) => Snowflake.Parts;
/**
 * @since 1.0.0
 * @category Generator
 */
export declare const makeGenerator: Effect.Effect<Snowflake.Generator>;
declare const Generator_base: Context.TagClass<Generator, "@effect/cluster/Snowflake/Generator", Snowflake.Generator>;
/**
 * @since 1.0.0
 * @category Generator
 */
export declare class Generator extends Generator_base {
}
/**
 * @since 1.0.0
 * @category Generator
 */
export declare const layerGenerator: Layer.Layer<Generator>;
export {};
//# sourceMappingURL=Snowflake.d.ts.map