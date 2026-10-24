/**
 * @since 1.0.0
 */
import * as Brand from "effect/Brand";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as internal from "./internal/fileSystem.js";
/**
 * @since 1.0.0
 * @category sizes
 */
export const Size = internal.Size;
/**
 * @since 1.0.0
 * @category sizes
 */
export const KiB = internal.KiB;
/**
 * @since 1.0.0
 * @category sizes
 */
export const MiB = internal.MiB;
/**
 * @since 1.0.0
 * @category sizes
 */
export const GiB = internal.GiB;
/**
 * @since 1.0.0
 * @category sizes
 */
export const TiB = internal.TiB;
/**
 * @since 1.0.0
 * @category sizes
 */
export const PiB = internal.PiB;
/**
 * @since 1.0.0
 * @category tag
 */
export const FileSystem = internal.tag;
/**
 * @since 1.0.0
 * @category constructor
 */
export const make = internal.make;
/**
 * Create a no-op file system that can be used for testing.
 *
 * @since 1.0.0
 * @category constructor
 */
export const makeNoop = internal.makeNoop;
/**
 * Create a no-op file system that can be used for testing.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerNoop = internal.layerNoop;
/**
 * @since 1.0.0
 * @category type id
 */
export const FileTypeId = /*#__PURE__*/Symbol.for("@effect/platform/FileSystem/File");
/**
 * @since 1.0.0
 * @category guard
 */
export const isFile = u => typeof u === "object" && u !== null && FileTypeId in u;
/**
 * @since 1.0.0
 * @category constructor
 */
export const FileDescriptor = /*#__PURE__*/Brand.nominal();
/**
 * @since 1.0.0
 * @category constructor
 */
export const WatchEventCreate = /*#__PURE__*/Data.tagged("Create");
/**
 * @since 1.0.0
 * @category constructor
 */
export const WatchEventUpdate = /*#__PURE__*/Data.tagged("Update");
/**
 * @since 1.0.0
 * @category constructor
 */
export const WatchEventRemove = /*#__PURE__*/Data.tagged("Remove");
/**
 * @since 1.0.0
 * @category file watcher
 */
export class WatchBackend extends /*#__PURE__*/Context.Tag("@effect/platform/FileSystem/WatchBackend")() {}
//# sourceMappingURL=FileSystem.js.map