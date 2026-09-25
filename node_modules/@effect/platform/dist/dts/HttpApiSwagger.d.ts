import * as Layer from "effect/Layer";
import { Api } from "./HttpApi.js";
import type * as HttpApi from "./HttpApi.js";
import * as HttpLayerRouter from "./HttpLayerRouter.js";
/**
 * Exported layer mounting Swagger/OpenAPI documentation UI.
 *
 * @param options.path  Optional mount path (default "/docs").
 *
 * @since 1.0.0
 * @category layers
 */
export declare const layer: (options?: {
    readonly path?: `/${string}` | undefined;
}) => Layer.Layer<never, never, Api>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerHttpLayerRouter: (options: {
    readonly api: HttpApi.HttpApi.Any;
    readonly path: `/${string}`;
}) => Layer.Layer<never, never, HttpLayerRouter.HttpRouter>;
//# sourceMappingURL=HttpApiSwagger.d.ts.map