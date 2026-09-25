/**
 * @since 1.0.0
 */
import type * as Etag from "@effect/platform/Etag";
import type * as FileSystem from "@effect/platform/FileSystem";
import type * as Platform from "@effect/platform/HttpPlatform";
import type * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: Effect.Effect<Platform.HttpPlatform, never, FileSystem.FileSystem | Etag.Generator>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: Layer.Layer<Platform.HttpPlatform>;
//# sourceMappingURL=NodeHttpPlatform.d.ts.map