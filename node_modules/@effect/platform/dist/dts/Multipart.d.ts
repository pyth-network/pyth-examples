import * as Channel from "effect/Channel";
import * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Inspectable from "effect/Inspectable";
import * as Option from "effect/Option";
import type * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import type { ParseOptions } from "effect/SchemaAST";
import type * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as MP from "multipasta";
import * as FileSystem from "./FileSystem.js";
import * as Path from "./Path.js";
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
 * @category models
 */
export type Part = Field | File;
/**
 * @since 1.0.0
 */
export declare namespace Part {
    /**
     * @since 1.0.0
     * @category models
     */
    interface Proto extends Inspectable.Inspectable {
        readonly [TypeId]: TypeId;
        readonly _tag: string;
    }
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Field extends Part.Proto {
    readonly _tag: "Field";
    readonly key: string;
    readonly contentType: string;
    readonly value: string;
}
/**
 * @since 1.0.0
 * @category Guards
 */
export declare const isPart: (u: unknown) => u is Part;
/**
 * @since 1.0.0
 * @category Guards
 */
export declare const isField: (u: unknown) => u is Field;
/**
 * @since 1.0.0
 * @category models
 */
export interface File extends Part.Proto {
    readonly _tag: "File";
    readonly key: string;
    readonly name: string;
    readonly contentType: string;
    readonly content: Stream.Stream<Uint8Array, MultipartError>;
    readonly contentEffect: Effect.Effect<Uint8Array, MultipartError>;
}
/**
 * @since 1.0.0
 * @category Guards
 */
export declare const isFile: (u: unknown) => u is File;
/**
 * @since 1.0.0
 * @category models
 */
export interface PersistedFile extends Part.Proto {
    readonly _tag: "PersistedFile";
    readonly key: string;
    readonly name: string;
    readonly contentType: string;
    readonly path: string;
}
/**
 * @since 1.0.0
 * @category Guards
 */
export declare const isPersistedFile: (u: unknown) => u is PersistedFile;
/**
 * @since 1.0.0
 * @category models
 */
export interface Persisted {
    readonly [key: string]: ReadonlyArray<PersistedFile> | ReadonlyArray<string> | string;
}
/**
 * @since 1.0.0
 * @category Errors
 */
export declare const ErrorTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category Errors
 */
export type ErrorTypeId = typeof ErrorTypeId;
declare const MultipartError_base: Schema.TaggedErrorClass<MultipartError, "MultipartError", {
    readonly _tag: Schema.tag<"MultipartError">;
} & {
    reason: Schema.Literal<["FileTooLarge", "FieldTooLarge", "BodyTooLarge", "TooManyParts", "InternalError", "Parse"]>;
    cause: typeof Schema.Defect;
}>;
/**
 * @since 1.0.0
 * @category Errors
 */
export declare class MultipartError extends MultipartError_base {
    /**
     * @since 1.0.0
     */
    readonly [ErrorTypeId]: ErrorTypeId;
    /**
     * @since 1.0.0
     */
    get message(): string;
}
/**
 * @since 1.0.0
 * @category Schemas
 */
export declare const FileSchema: Schema.Schema<PersistedFile>;
/**
 * @since 1.0.0
 * @category Schemas
 */
export declare const FilesSchema: Schema.Schema<ReadonlyArray<PersistedFile>>;
/**
 * @since 1.0.0
 * @category Schemas
 */
export declare const SingleFileSchema: Schema.transform<Schema.Schema<ReadonlyArray<PersistedFile>>, Schema.Schema<PersistedFile>>;
/**
 * @since 1.0.0
 * @category Schemas
 */
export declare const schemaPersisted: <A, I extends Partial<Persisted>, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => (persisted: Persisted) => Effect.Effect<A, ParseResult.ParseError, R>;
/**
 * @since 1.0.0
 * @category Schemas
 */
export declare const schemaJson: <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => {
    (field: string): (persisted: Persisted) => Effect.Effect<A, ParseResult.ParseError, R>;
    (persisted: Persisted, field: string): Effect.Effect<A, ParseResult.ParseError, R>;
};
/**
 * @since 1.0.0
 * @category Config
 */
export declare const makeConfig: (headers: Record<string, string>) => Effect.Effect<MP.BaseConfig>;
/**
 * @since 1.0.0
 * @category Parsers
 */
export declare const makeChannel: <IE>(headers: Record<string, string>, bufferSize?: number) => Channel.Channel<Chunk.Chunk<Part>, Chunk.Chunk<Uint8Array>, MultipartError | IE, IE, unknown, unknown>;
/**
 * @since 1.0.0
 */
export declare const collectUint8Array: Channel.Channel<never, Chunk.Chunk<Uint8Array<ArrayBufferLike>>, unknown, unknown, Uint8Array<ArrayBufferLike>, unknown, never>;
/**
 * @since 1.0.0
 * @category Conversions
 */
export declare const toPersisted: (stream: Stream.Stream<Part, MultipartError>, writeFile?: (path: string, file: File) => Effect.Effect<void, MultipartError, FileSystem.FileSystem>) => Effect.Effect<Persisted, MultipartError, FileSystem.FileSystem | Path.Path | Scope.Scope>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withLimits: {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    (options: {
        readonly maxParts?: Option.Option<number> | undefined;
        readonly maxFieldSize?: FileSystem.SizeInput | undefined;
        readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly fieldMimeTypes?: ReadonlyArray<string> | undefined;
    }): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, options: {
        readonly maxParts?: Option.Option<number> | undefined;
        readonly maxFieldSize?: FileSystem.SizeInput | undefined;
        readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly fieldMimeTypes?: ReadonlyArray<string> | undefined;
    }): Effect.Effect<A, E, R>;
};
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withLimitsStream: {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    (options: {
        readonly maxParts?: Option.Option<number> | undefined;
        readonly maxFieldSize?: FileSystem.SizeInput | undefined;
        readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly fieldMimeTypes?: ReadonlyArray<string> | undefined;
    }): <A, E, R>(stream: Stream.Stream<A, E, R>) => Stream.Stream<A, E, R>;
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    <A, E, R>(stream: Stream.Stream<A, E, R>, options: {
        readonly maxParts?: Option.Option<number> | undefined;
        readonly maxFieldSize?: FileSystem.SizeInput | undefined;
        readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly fieldMimeTypes?: ReadonlyArray<string> | undefined;
    }): Stream.Stream<A, E, R>;
};
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare namespace withLimits {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    type Options = {
        readonly maxParts?: Option.Option<number> | undefined;
        readonly maxFieldSize?: FileSystem.SizeInput | undefined;
        readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined;
        readonly fieldMimeTypes?: ReadonlyArray<string> | undefined;
    };
}
declare const MaxParts_base: Context.ReferenceClass<MaxParts, "@effect/platform/Multipart/MaxParts", Option.Option<number>>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare class MaxParts extends MaxParts_base {
}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withMaxParts: {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    (count: Option.Option<number>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, count: Option.Option<number>): Effect.Effect<A, E, R>;
};
declare const MaxFieldSize_base: Context.ReferenceClass<MaxFieldSize, "@effect/platform/Multipart/MaxFieldSize", FileSystem.Size>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare class MaxFieldSize extends MaxFieldSize_base {
}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withMaxFieldSize: {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    (size: FileSystem.SizeInput): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, size: FileSystem.SizeInput): Effect.Effect<A, E, R>;
};
declare const MaxFileSize_base: Context.ReferenceClass<MaxFileSize, "@effect/platform/Multipart/MaxFileSize", Option.Option<FileSystem.Size>>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare class MaxFileSize extends MaxFileSize_base {
}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withMaxFileSize: {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    (size: Option.Option<FileSystem.SizeInput>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, size: Option.Option<FileSystem.SizeInput>): Effect.Effect<A, E, R>;
};
declare const FieldMimeTypes_base: Context.ReferenceClass<FieldMimeTypes, "@effect/platform/Multipart/FieldMimeTypes", Chunk.Chunk<string>>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare class FieldMimeTypes extends FieldMimeTypes_base {
}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withFieldMimeTypes: {
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    (mimeTypes: ReadonlyArray<string>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    /**
     * @since 1.0.0
     * @category fiber refs
     */
    <A, E, R>(effect: Effect.Effect<A, E, R>, mimeTypes: ReadonlyArray<string>): Effect.Effect<A, E, R>;
};
export {};
//# sourceMappingURL=Multipart.d.ts.map