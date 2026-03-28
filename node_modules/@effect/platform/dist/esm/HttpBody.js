import * as Predicate from "effect/Predicate";
import * as internal from "./internal/httpBody.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = internal.TypeId;
/**
 * @since 1.0.0
 * @category refinements
 */
export const isHttpBody = u => Predicate.hasProperty(u, TypeId);
/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId = internal.ErrorTypeId;
/**
 * @since 1.0.0
 * @category errors
 */
export const HttpBodyError = internal.HttpBodyError;
/**
 * @since 1.0.0
 * @category constructors
 */
export const empty = internal.empty;
/**
 * @since 1.0.0
 * @category constructors
 */
export const raw = internal.raw;
/**
 * @since 1.0.0
 * @category constructors
 */
export const uint8Array = internal.uint8Array;
/**
 * @since 1.0.0
 * @category constructors
 */
export const text = internal.text;
/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeJson = internal.unsafeJson;
/**
 * @since 1.0.0
 * @category constructors
 */
export const json = internal.json;
/**
 * @since 1.0.0
 * @category constructors
 */
export const jsonSchema = internal.jsonSchema;
/**
 * @since 1.0.0
 * @category constructors
 */
export const urlParams = internal.urlParams;
/**
 * @since 1.0.0
 * @category FormData
 */
export const formData = internal.formData;
/**
 * @since 1.0.0
 * @category FormData
 */
export const formDataRecord = internal.formDataRecord;
/**
 * @since 1.0.0
 * @category constructors
 */
export const stream = internal.stream;
/**
 * @since 1.0.0
 * @category constructors
 */
export const file = internal.file;
/**
 * @since 1.0.0
 * @category constructors
 */
export const fileInfo = internal.fileInfo;
/**
 * @since 1.0.0
 * @category constructors
 */
export const fileWeb = internal.fileWeb;
//# sourceMappingURL=HttpBody.js.map