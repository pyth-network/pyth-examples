/**
 * @since 1.0.0
 */
import type { NonEmptyArray } from "effect/Array";
import * as Context from "effect/Context";
import * as HttpApi from "./HttpApi.js";
import type { HttpApiGroup } from "./HttpApiGroup.js";
import * as JsonSchema from "./OpenApiJsonSchema.js";
declare const Identifier_base: Context.TagClass<Identifier, "@effect/platform/OpenApi/Identifier", string>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Identifier extends Identifier_base {
}
declare const Title_base: Context.TagClass<Title, "@effect/platform/OpenApi/Title", string>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Title extends Title_base {
}
declare const Version_base: Context.TagClass<Version, "@effect/platform/OpenApi/Version", string>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Version extends Version_base {
}
declare const Description_base: Context.TagClass<Description, "@effect/platform/OpenApi/Description", string>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Description extends Description_base {
}
declare const License_base: Context.TagClass<License, "@effect/platform/OpenApi/License", OpenAPISpecLicense>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class License extends License_base {
}
declare const ExternalDocs_base: Context.TagClass<ExternalDocs, "@effect/platform/OpenApi/ExternalDocs", OpenAPISpecExternalDocs>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class ExternalDocs extends ExternalDocs_base {
}
declare const Servers_base: Context.TagClass<Servers, "@effect/platform/OpenApi/Servers", readonly OpenAPISpecServer[]>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Servers extends Servers_base {
}
declare const Format_base: Context.TagClass<Format, "@effect/platform/OpenApi/Format", string>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Format extends Format_base {
}
declare const Summary_base: Context.TagClass<Summary, "@effect/platform/OpenApi/Summary", string>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Summary extends Summary_base {
}
declare const Deprecated_base: Context.TagClass<Deprecated, "@effect/platform/OpenApi/Deprecated", boolean>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Deprecated extends Deprecated_base {
}
declare const Override_base: Context.TagClass<Override, "@effect/platform/OpenApi/Override", Record<string, unknown>>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Override extends Override_base {
}
declare const Exclude_base: Context.ReferenceClass<Exclude, "@effect/platform/OpenApi/Exclude", boolean>;
/**
 * @since 1.0.0
 * @category annotations
 */
export declare class Exclude extends Exclude_base {
}
declare const Transform_base: Context.TagClass<Transform, "@effect/platform/OpenApi/Transform", (openApiSpec: Record<string, any>) => Record<string, any>>;
/**
 * Transforms the generated OpenAPI specification
 * @since 1.0.0
 * @category annotations
 */
export declare class Transform extends Transform_base {
}
/**
 * @since 1.0.0
 * @category annotations
 */
export declare const annotations: (options: {
    readonly identifier?: string | undefined;
    readonly title?: string | undefined;
    readonly version?: string | undefined;
    readonly description?: string | undefined;
    readonly license?: OpenAPISpecLicense | undefined;
    readonly summary?: string | undefined;
    readonly deprecated?: boolean | undefined;
    readonly externalDocs?: OpenAPISpecExternalDocs | undefined;
    readonly servers?: ReadonlyArray<OpenAPISpecServer> | undefined;
    readonly format?: string | undefined;
    readonly override?: Record<string, unknown> | undefined;
    readonly exclude?: boolean | undefined;
    readonly transform?: ((openApiSpec: Record<string, any>) => Record<string, any>) | undefined;
}) => Context.Context<never>;
/**
 * @since 1.0.0
 * @category models
 */
export type AdditionalPropertiesStrategy = "allow" | "strict";
/**
 * Converts an `HttpApi` instance into an OpenAPI Specification object.
 *
 * **Details**
 *
 * This function takes an `HttpApi` instance, which defines a structured API,
 * and generates an OpenAPI Specification (`OpenAPISpec`). The resulting spec
 * adheres to the OpenAPI 3.1.0 standard and includes detailed metadata such as
 * paths, operations, security schemes, and components. The function processes
 * the API's annotations, middleware, groups, and endpoints to build a complete
 * and accurate representation of the API in OpenAPI format.
 *
 * The function also deduplicates schemas, applies transformations, and
 * integrates annotations like descriptions, summaries, external documentation,
 * and overrides. Cached results are used for better performance when the same
 * `HttpApi` instance is processed multiple times.
 *
 * **Options**
 *
 * - `additionalPropertiesStrategy`: Controls the handling of additional properties. Possible values are:
 *   - `"strict"`: Disallow additional properties (default behavior).
 *   - `"allow"`: Allow additional properties.
 *
 * **Example**
 *
 * ```ts
 * import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
 * import { Schema } from "effect"
 *
 * const api = HttpApi.make("api").add(
 *   HttpApiGroup.make("group").add(
 *     HttpApiEndpoint.get("get", "/items")
 *       .addSuccess(Schema.Array(Schema.String))
 *   )
 * )
 *
 * const spec = OpenApi.fromApi(api)
 *
 * console.log(JSON.stringify(spec, null, 2))
 * // Output: OpenAPI specification in JSON format
 * ```
 *
 * @category constructors
 * @since 1.0.0
 */
export declare const fromApi: <Id extends string, Groups extends HttpApiGroup.Any, E, R>(api: HttpApi.HttpApi<Id, Groups, E, R>, options?: {
    readonly additionalPropertiesStrategy?: AdditionalPropertiesStrategy | undefined;
} | undefined) => OpenAPISpec;
/**
 * This model describes the OpenAPI specification (version 3.1.0) returned by
 * {@link fromApi}. It is not intended to describe the entire OpenAPI
 * specification, only the output of `fromApi`.
 *
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpec {
    openapi: "3.1.0";
    info: OpenAPISpecInfo;
    paths: OpenAPISpecPaths;
    components: OpenAPIComponents;
    security: Array<OpenAPISecurityRequirement>;
    tags: Array<OpenAPISpecTag>;
    servers?: Array<OpenAPISpecServer>;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecInfo {
    title: string;
    version: string;
    description?: string;
    license?: OpenAPISpecLicense;
    summary?: string;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecTag {
    name: string;
    description?: string;
    externalDocs?: OpenAPISpecExternalDocs;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecExternalDocs {
    url: string;
    description?: string;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecLicense {
    name: string;
    url?: string;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecServer {
    url: string;
    description?: string;
    variables?: Record<string, OpenAPISpecServerVariable>;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecServerVariable {
    default: string;
    enum?: NonEmptyArray<string>;
    description?: string;
}
/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISpecPaths = Record<string, OpenAPISpecPathItem>;
/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISpecMethodName = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace";
/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISpecPathItem = {
    [K in OpenAPISpecMethodName]?: OpenAPISpecOperation;
};
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecParameter {
    name: string;
    in: "query" | "header" | "path" | "cookie";
    schema: JsonSchema.JsonSchema;
    required: boolean;
    description?: string;
}
/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISpecResponses = Record<number, OpenApiSpecResponse>;
/**
 * @category models
 * @since 1.0.0
 */
export type OpenApiSpecContentType = "application/json" | "application/xml" | "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain";
/**
 * @category models
 * @since 1.0.0
 */
export type OpenApiSpecContent = {
    [K in OpenApiSpecContentType]?: OpenApiSpecMediaType;
};
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenApiSpecResponse {
    description: string;
    content?: OpenApiSpecContent;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenApiSpecMediaType {
    schema: JsonSchema.JsonSchema;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecRequestBody {
    content: OpenApiSpecContent;
    required: true;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPIComponents {
    schemas: Record<string, JsonSchema.JsonSchema>;
    securitySchemes: Record<string, OpenAPISecurityScheme>;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPIHTTPSecurityScheme {
    readonly type: "http";
    scheme: "bearer" | "basic" | string;
    description?: string;
    bearerFormat?: string;
}
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPIApiKeySecurityScheme {
    readonly type: "apiKey";
    name: string;
    in: "query" | "header" | "cookie";
    description?: string;
}
/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISecurityScheme = OpenAPIHTTPSecurityScheme | OpenAPIApiKeySecurityScheme;
/**
 * @category models
 * @since 1.0.0
 */
export type OpenAPISecurityRequirement = Record<string, Array<string>>;
/**
 * @category models
 * @since 1.0.0
 */
export interface OpenAPISpecOperation {
    operationId: string;
    parameters: Array<OpenAPISpecParameter>;
    responses: OpenAPISpecResponses;
    /** Always contains at least the title annotation or the group identifier */
    tags: NonEmptyArray<string>;
    security: Array<OpenAPISecurityRequirement>;
    requestBody?: OpenAPISpecRequestBody;
    description?: string;
    summary?: string;
    deprecated?: boolean;
    externalDocs?: OpenAPISpecExternalDocs;
}
export {};
//# sourceMappingURL=OpenApi.d.ts.map