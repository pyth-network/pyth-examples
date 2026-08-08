import * as KeyValueStore from "@effect/platform/KeyValueStore";
import * as Layer from "effect/Layer";
import * as FileSystem from "./NodeFileSystem.js";
import * as Path from "./NodePath.js";
/**
 * @since 1.0.0
 * @category layers
 */
export const layerFileSystem = directory => Layer.provide(KeyValueStore.layerFileSystem(directory), Layer.merge(FileSystem.layer, Path.layer));
//# sourceMappingURL=NodeKeyValueStore.js.map