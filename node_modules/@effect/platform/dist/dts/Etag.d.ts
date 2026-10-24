/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { Layer } from "effect/Layer";
import type * as FileSystem from "./FileSystem.js";
import type * as Body from "./HttpBody.js";
/**
 * @since 1.0.0
 * @category models
 */
export type Etag = Weak | Strong;
/**
 * @since 1.0.0
 * @category models
 */
export interface Weak {
    readonly _tag: "Weak";
    readonly value: string;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Strong {
    readonly _tag: "Strong";
    readonly value: string;
}
/**
 * @since 1.0.0
 * @category convertions
 */
export declare const toString: (self: Etag) => string;
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const GeneratorTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type GeneratorTypeId = typeof GeneratorTypeId;
/**
 * @since 1.0.0
 * @category models
 */
export interface Generator {
    readonly [GeneratorTypeId]: GeneratorTypeId;
    readonly fromFileInfo: (info: FileSystem.File.Info) => Effect.Effect<Etag>;
    readonly fromFileWeb: (file: Body.HttpBody.FileLike) => Effect.Effect<Etag>;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const Generator: Context.Tag<Generator, Generator>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: Layer<Generator>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerWeak: Layer<Generator>;
//# sourceMappingURL=Etag.d.ts.map