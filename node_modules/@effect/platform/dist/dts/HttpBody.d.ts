/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect";
import type { Inspectable } from "effect/Inspectable";
import type * as ParseResult from "effect/ParseResult";
import type * as Schema from "effect/Schema";
import type * as Stream_ from "effect/Stream";
import type * as PlatformError from "./Error.js";
import type * as FileSystem from "./FileSystem.js";
import type * as UrlParams from "./UrlParams.js";
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const TypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId;
/**
 * @since 1.0.0
 * @category refinements
 */
export declare const isHttpBody: (u: unknown) => u is HttpBody;
/**
 * @since 1.0.0
 * @category models
 */
export type HttpBody = Empty | Raw | Uint8Array | FormData | Stream;
/**
 * @since 1.0.0
 */
export declare namespace HttpBody {
    /**
     * @since 1.0.0
     * @category models
     */
    interface Proto extends Inspectable {
        readonly [TypeId]: TypeId;
        readonly _tag: string;
        readonly contentType?: string | undefined;
        readonly contentLength?: number | undefined;
    }
    /**
     * @since 1.0.0
     * @category models
     */
    interface FileLike {
        readonly name: string;
        readonly lastModified: number;
        readonly size: number;
        readonly stream: () => unknown;
        readonly type: string;
    }
}
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const ErrorTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId;
/**
 * @since 1.0.0
 * @category errors
 */
export interface HttpBodyError {
    readonly [ErrorTypeId]: ErrorTypeId;
    readonly _tag: "HttpBodyError";
    readonly reason: ErrorReason;
}
/**
 * @since 1.0.0
 * @category errors
 */
export declare const HttpBodyError: (reason: ErrorReason) => HttpBodyError;
/**
 * @since 1.0.0
 * @category errors
 */
export type ErrorReason = {
    readonly _tag: "JsonError";
    readonly error: unknown;
} | {
    readonly _tag: "SchemaError";
    readonly error: ParseResult.ParseError;
};
/**
 * @since 1.0.0
 * @category models
 */
export interface Empty extends HttpBody.Proto {
    readonly _tag: "Empty";
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const empty: Empty;
/**
 * @since 1.0.0
 * @category models
 */
export interface Raw extends HttpBody.Proto {
    readonly _tag: "Raw";
    readonly body: unknown;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const raw: (body: unknown, options?: {
    readonly contentType?: string | undefined;
    readonly contentLength?: number | undefined;
} | undefined) => Raw;
/**
 * @since 1.0.0
 * @category models
 */
export interface Uint8Array extends HttpBody.Proto {
    readonly _tag: "Uint8Array";
    readonly body: globalThis.Uint8Array;
    readonly contentType: string;
    readonly contentLength: number;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const uint8Array: (body: globalThis.Uint8Array, contentType?: string) => Uint8Array;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const text: (body: string, contentType?: string) => Uint8Array;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const unsafeJson: (body: unknown) => Uint8Array;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const json: (body: unknown) => Effect.Effect<Uint8Array, HttpBodyError>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const jsonSchema: <A, I, R>(schema: Schema.Schema<A, I, R>) => (body: A) => Effect.Effect<Uint8Array, HttpBodyError, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const urlParams: (urlParams: UrlParams.UrlParams) => Uint8Array;
/**
 * @since 1.0.0
 * @category models
 */
export interface FormData extends HttpBody.Proto {
    readonly _tag: "FormData";
    readonly formData: globalThis.FormData;
}
/**
 * @since 1.0.0
 * @category FormData
 */
export declare const formData: (body: globalThis.FormData) => FormData;
/**
 * @since 1.0.0
 * @category FormData
 */
export type FormDataInput = Record<string, FormDataCoercible | ReadonlyArray<FormDataCoercible>>;
/**
 * @since 1.0.0
 * @category FormData
 */
export type FormDataCoercible = string | number | boolean | File | Blob | null | undefined;
/**
 * @since 1.0.0
 * @category FormData
 */
export declare const formDataRecord: (entries: FormDataInput) => FormData;
/**
 * @since 1.0.0
 * @category models
 */
export interface Stream extends HttpBody.Proto {
    readonly _tag: "Stream";
    readonly stream: Stream_.Stream<globalThis.Uint8Array, unknown>;
    readonly contentType: string;
    readonly contentLength?: number | undefined;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const stream: (body: Stream_.Stream<globalThis.Uint8Array, unknown>, contentType?: string, contentLength?: number) => Stream;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const file: (path: string, options?: FileSystem.StreamOptions & {
    readonly contentType?: string;
}) => Effect.Effect<Stream, PlatformError.PlatformError, FileSystem.FileSystem>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const fileInfo: (path: string, info: FileSystem.File.Info, options?: FileSystem.StreamOptions & {
    readonly contentType?: string;
}) => Effect.Effect<Stream, PlatformError.PlatformError, FileSystem.FileSystem>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const fileWeb: (file: HttpBody.FileLike) => Stream;
//# sourceMappingURL=HttpBody.d.ts.map