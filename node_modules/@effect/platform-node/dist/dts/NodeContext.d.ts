import type * as CommandExecutor from "@effect/platform/CommandExecutor";
import type * as FileSystem from "@effect/platform/FileSystem";
import type * as Path from "@effect/platform/Path";
import type * as Terminal from "@effect/platform/Terminal";
import type * as Worker from "@effect/platform/Worker";
import * as Layer from "effect/Layer";
/**
 * @since 1.0.0
 * @category models
 */
export type NodeContext = CommandExecutor.CommandExecutor | FileSystem.FileSystem | Path.Path | Terminal.Terminal | Worker.WorkerManager;
/**
 * @since 1.0.0
 * @category layer
 */
export declare const layer: Layer.Layer<NodeContext>;
//# sourceMappingURL=NodeContext.d.ts.map