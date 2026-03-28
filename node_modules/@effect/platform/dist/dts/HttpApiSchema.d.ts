/**
 * @since 1.0.0
 */
import type { Brand } from "effect/Brand";
import * as Effect from "effect/Effect";
import type { LazyArg } from "effect/Function";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AST from "effect/SchemaAST";
import type * as FileSystem from "./FileSystem.js";
import type * as Multipart_ from "./Multipart.js";
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const AnnotationMultipart: unique symbol;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const AnnotationMultipartStream: unique symbol;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const AnnotationStatus: unique symbol;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const AnnotationEmptyDecodeable: unique symbol;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const AnnotationEncoding: unique symbol;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const AnnotationParam: unique symbol;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const extractAnnotations: (ast: AST.Annotations) => AST.Annotations;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const getStatus: (ast: AST.AST, defaultStatus: number) => number;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const getEmptyDecodeable: (ast: AST.AST) => boolean;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const getMultipart: (ast: AST.AST) => Multipart_.withLimits.Options | undefined;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const getMultipartStream: (ast: AST.AST) => Multipart_.withLimits.Options | undefined;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const getEncoding: (ast: AST.AST, fallback?: Encoding) => Encoding;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const getParam: (ast: AST.AST | Schema.PropertySignature.AST) => string | undefined;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const annotations: <A>(annotations: Schema.Annotations.Schema<NoInfer<A>> & {
    readonly status?: number | undefined;
}) => Schema.Annotations.Schema<A>;
/**
 * @since 1.0.0
 * @category reflection
 */
export declare const isVoid: (ast: AST.AST) => boolean;
/**
 * @since 1.0.0
 * @category reflection
 */
export declare const getStatusSuccessAST: (ast: AST.AST) => number;
/**
 * @since 1.0.0
 * @category reflection
 */
export declare const getStatusSuccess: <A extends Schema.Schema.Any>(self: A) => number;
/**
 * @since 1.0.0
 * @category reflection
 */
export declare const getStatusErrorAST: (ast: AST.AST) => number;
/**
 * @since 1.0.0
 * @category reflection
 */
export declare const getStatusError: <A extends Schema.Schema.All>(self: A) => number;
/**
 * @since 1.0.0
 */
export declare const UnionUnify: <A extends Schema.Schema.All, B extends Schema.Schema.All>(self: A, that: B) => Schema.Schema<A["Type"] | B["Type"], A["Encoded"] | B["Encoded"], A["Context"] | B["Context"]>;
type Void$ = typeof Schema.Void;
/**
 * @since 1.0.0
 * @category path params
 */
export interface Param<Name extends string, S extends Schema.Schema.Any | Schema.PropertySignature.Any> extends Schema.Schema<Schema.Schema.Type<S>, Schema.Schema.Encoded<S>, Schema.Schema.Context<S>> {
    readonly [AnnotationParam]: {
        readonly name: Name;
        readonly schema: S;
    };
}
/**
 * @since 1.0.0
 * @category path params
 */
export declare const param: {
    /**
     * @since 1.0.0
     * @category path params
     */
    <Name extends string>(name: Name): <S extends Schema.Schema.Any | Schema.PropertySignature.Any>(schema: S & ([Schema.Schema.Encoded<S> & {}] extends [string] ? unknown : "Schema must be encodable to a string")) => Param<Name, S>;
    /**
     * @since 1.0.0
     * @category path params
     */
    <Name extends string, S extends Schema.Schema.Any | Schema.PropertySignature.Any>(name: Name, schema: S & ([Schema.Schema.Encoded<S> & {}] extends [string] ? unknown : "Schema must be encodable to a string")): Param<Name, S>;
};
/**
 * @since 1.0.0
 * @category empty response
 */
export declare const Empty: (status: number) => typeof Schema.Void;
/**
 * @since 1.0.0
 * @category empty response
 */
export interface asEmpty<S extends Schema.Schema.Any> extends Schema.transform<typeof Schema.Void, S> {
}
/**
 * @since 1.0.0
 * @category empty response
 */
export declare const asEmpty: {
    /**
     * @since 1.0.0
     * @category empty response
     */
    <S extends Schema.Schema.Any>(options: {
        readonly status: number;
        readonly decode: LazyArg<Schema.Schema.Type<S>>;
    }): (self: S) => asEmpty<S>;
    /**
     * @since 1.0.0
     * @category empty response
     */
    <S extends Schema.Schema.Any>(self: S, options: {
        readonly status: number;
        readonly decode: LazyArg<Schema.Schema.Type<S>>;
    }): asEmpty<S>;
};
/**
 * @since 1.0.0
 * @category empty response
 */
export interface Created extends Void$ {
    readonly _: unique symbol;
}
/**
 * @since 1.0.0
 * @category empty response
 */
export declare const Created: Created;
/**
 * @since 1.0.0
 * @category empty response
 */
export interface Accepted extends Void$ {
    readonly _: unique symbol;
}
/**
 * @since 1.0.0
 * @category empty response
 */
export declare const Accepted: Accepted;
/**
 * @since 1.0.0
 * @category empty response
 */
export interface NoContent extends Void$ {
    readonly _: unique symbol;
}
/**
 * @since 1.0.0
 * @category empty response
 */
export declare const NoContent: NoContent;
/**
 * @since 1.0.0
 * @category multipart
 */
export declare const MultipartTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category multipart
 */
export type MultipartTypeId = typeof MultipartTypeId;
/**
 * @since 1.0.0
 * @category multipart
 */
export interface Multipart<S extends Schema.Schema.Any> extends Schema.Schema<Schema.Schema.Type<S> & Brand<MultipartTypeId>, Schema.Schema.Encoded<S>, Schema.Schema.Context<S>> {
}
/**
 * @since 1.0.0
 * @category multipart
 */
export declare const Multipart: <S extends Schema.Schema.Any>(self: S, options?: {
    readonly maxParts?: Option.Option<number> | undefined;
    readonly maxFieldSize?: FileSystem.SizeInput | undefined;
    readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined;
    readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined;
    readonly fieldMimeTypes?: ReadonlyArray<string> | undefined;
}) => Multipart<S>;
/**
 * @since 1.0.0
 * @category multipart
 */
export declare const MultipartStreamTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category multipart
 */
export type MultipartStreamTypeId = typeof MultipartStreamTypeId;
/**
 * @since 1.0.0
 * @category multipart
 */
export interface MultipartStream<S extends Schema.Schema.Any> extends Schema.Schema<Schema.Schema.Type<S> & Brand<MultipartStreamTypeId>, Schema.Schema.Encoded<S>, Schema.Schema.Context<S>> {
}
/**
 * @since 1.0.0
 * @category multipart
 */
export declare const MultipartStream: <S extends Schema.Schema.Any>(self: S, options?: {
    readonly maxParts?: Option.Option<number> | undefined;
    readonly maxFieldSize?: FileSystem.SizeInput | undefined;
    readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined;
    readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined;
    readonly fieldMimeTypes?: ReadonlyArray<string> | undefined;
}) => MultipartStream<S>;
/**
 * @since 1.0.0
 * @category encoding
 */
export interface Encoding {
    readonly kind: "Json" | "UrlParams" | "Uint8Array" | "Text";
    readonly contentType: string;
}
/**
 * @since 1.0.0
 * @category encoding
 */
export declare namespace Encoding {
    /**
     * @since 1.0.0
     * @category encoding
     */
    type Validate<A extends Schema.Schema.Any, Kind extends Encoding["kind"]> = Kind extends "Json" ? {} : Kind extends "UrlParams" ? [A["Encoded"]] extends [Readonly<Record<string, string | undefined>>] ? {} : `'UrlParams' kind can only be encoded to 'Record<string, string | undefined>'` : Kind extends "Uint8Array" ? [
        A["Encoded"]
    ] extends [Uint8Array] ? {} : `'Uint8Array' kind can only be encoded to 'Uint8Array'` : Kind extends "Text" ? [A["Encoded"]] extends [string] ? {} : `'Text' kind can only be encoded to 'string'` : never;
}
/**
 * @since 1.0.0
 * @category encoding
 */
export declare const withEncoding: {
    /**
     * @since 1.0.0
     * @category encoding
     */
    <A extends Schema.Schema.Any, Kind extends Encoding["kind"]>(options: {
        readonly kind: Kind;
        readonly contentType?: string | undefined;
    } & Encoding.Validate<A, Kind>): (self: A) => A;
    /**
     * @since 1.0.0
     * @category encoding
     */
    <A extends Schema.Schema.Any, Kind extends Encoding["kind"]>(self: A, options: {
        readonly kind: Kind;
        readonly contentType?: string | undefined;
    } & Encoding.Validate<A, Kind>): A;
};
/**
 * @since 1.0.0
 * @category encoding
 */
export declare const Text: (options?: {
    readonly contentType?: string;
}) => typeof Schema.String;
/**
 * @since 1.0.0
 * @category encoding
 */
export declare const Uint8Array: (options?: {
    readonly contentType?: string;
}) => typeof Schema.Uint8ArrayFromSelf;
/**
 * @since 1.0.0
 */
export declare const deunionize: (schemas: Set<Schema.Schema.Any>, schema: Schema.Schema.Any) => void;
/**
 * @since 1.0.0
 * @category empty errors
 */
export interface EmptyErrorClass<Self, Tag> extends Schema.Schema<Self, void> {
    new (_: void): {
        readonly _tag: Tag;
    } & Effect.Effect<never, Self>;
}
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare const EmptyError: <Self>() => <const Tag extends string>(options: {
    readonly tag: Tag;
    readonly status: number;
}) => EmptyErrorClass<Self, Tag>;
export {};
//# sourceMappingURL=HttpApiSchema.d.ts.map