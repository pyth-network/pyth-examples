import * as internal from "./internal/workerRunner.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const PlatformRunnerTypeId = internal.PlatformRunnerTypeId;
/**
 * @since 1.0.0
 * @category tags
 */
export const PlatformRunner = internal.PlatformRunner;
/**
 * The worker close latch is used by platform runners to signal that the worker
 * has been closed.
 *
 * @since 1.0.0
 * @category CloseLatch
 */
export const CloseLatch = internal.CloseLatch;
/**
 * @since 1.0.0
 * @category CloseLatch
 */
export const layerCloseLatch = internal.layerCloseLatch;
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make;
/**
 * @since 1.0.0
 * @category layers
 */
export const layer = internal.layer;
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeSerialized = internal.makeSerialized;
/**
 * @since 1.0.0
 * @category layers
 */
export const layerSerialized = internal.layerSerialized;
/**
 * Launch the specified layer, interrupting the fiber when the CloseLatch is
 * triggered.
 *
 * @since 1.0.0
 * @category Execution
 */
export const launch = internal.launch;
//# sourceMappingURL=WorkerRunner.js.map