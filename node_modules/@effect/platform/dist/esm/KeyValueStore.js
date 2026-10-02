import * as internal from "./internal/keyValueStore.js";
/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category tags
 */
export const KeyValueStore = internal.keyValueStoreTag;
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make;
/**
 * @since 1.0.0
 * @category constructors
 */
export const makeStringOnly = internal.makeStringOnly;
/**
 * @since 1.0.0
 * @category combinators
 */
export const prefix = internal.prefix;
/**
 * @since 1.0.0
 * @category layers
 */
export const layerMemory = internal.layerMemory;
/**
 * @since 1.0.0
 * @category layers
 */
export const layerFileSystem = internal.layerFileSystem;
/**
 * @since 1.0.0
 * @category type id
 */
export const SchemaStoreTypeId = internal.SchemaStoreTypeId;
/**
 * @since 1.0.0
 * @category layers
 */
export const layerSchema = internal.layerSchema;
/**
 * Creates an KeyValueStorage from an instance of the `Storage` api.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
 *
 * @since 1.0.0
 * @category layers
 */
export const layerStorage = internal.layerStorage;
//# sourceMappingURL=KeyValueStore.js.map