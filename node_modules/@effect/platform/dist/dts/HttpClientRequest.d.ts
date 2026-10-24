/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect";
import type { Inspectable } from "effect/Inspectable";
import type * as Option from "effect/Option";
import type { Pipeable } from "effect/Pipeable";
import type { Redacted } from "effect/Redacted";
import type * as Schema from "effect/Schema";
import type { ParseOptions } from "effect/SchemaAST";
import type * as Stream from "effect/Stream";
import type * as PlatformError from "./Error.js";
import type * as FileSystem from "./FileSystem.js";
import type * as Headers from "./Headers.js";
import type * as Body from "./HttpBody.js";
import type { HttpMethod } from "./HttpMethod.js";
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
 * @category models
 */
export interface HttpClientRequest extends Inspectable, Pipeable {
    readonly [TypeId]: TypeId;
    readonly method: HttpMethod;
    readonly url: string;
    readonly urlParams: UrlParams.UrlParams;
    readonly hash: Option.Option<string>;
    readonly headers: Headers.Headers;
    readonly body: Body.HttpBody;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Options {
    readonly method?: HttpMethod | undefined;
    readonly url?: string | URL | undefined;
    readonly urlParams?: UrlParams.Input | undefined;
    readonly hash?: string | undefined;
    readonly headers?: Headers.Input | undefined;
    readonly body?: Body.HttpBody | undefined;
    readonly accept?: string | undefined;
    readonly acceptJson?: boolean | undefined;
}
/**
 * @since 1.0.0
 */
export declare namespace Options {
    /**
     * @since 1.0.0
     * @category models
     */
    interface NoBody extends Omit<Options, "method" | "url" | "body"> {
    }
    /**
     * @since 1.0.0
     * @category models
     */
    interface NoUrl extends Omit<Options, "method" | "url"> {
    }
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <M extends HttpMethod>(method: M) => (url: string | URL, options?: (M extends "GET" | "HEAD" ? Options.NoBody : Options.NoUrl) | undefined) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const get: (url: string | URL, options?: Options.NoBody) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const post: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const patch: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const put: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const del: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const head: (url: string | URL, options?: Options.NoBody) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const options: (url: string | URL, options?: Options.NoUrl) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const modify: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (options: Options): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, options: Options): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setMethod: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (method: HttpMethod): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, method: HttpMethod): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setHeader: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string, value: string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, key: string, value: string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setHeaders: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (input: Headers.Input): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, input: Headers.Input): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const basicAuth: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (username: string | Redacted, password: string | Redacted): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, username: string | Redacted, password: string | Redacted): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bearerToken: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (token: string | Redacted): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, token: string | Redacted): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const accept: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (mediaType: string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, mediaType: string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const acceptJson: (self: HttpClientRequest) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setUrl: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (url: string | URL): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, url: string | URL): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const prependUrl: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (path: string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, path: string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const appendUrl: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (path: string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, path: string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const updateUrl: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (f: (url: string) => string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, f: (url: string) => string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setUrlParam: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string, value: string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, key: string, value: string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setUrlParams: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (input: UrlParams.Input): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, input: UrlParams.Input): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const appendUrlParam: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string, value: string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, key: string, value: string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const appendUrlParams: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (input: UrlParams.Input): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, input: UrlParams.Input): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setHash: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (hash: string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, hash: string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const removeHash: (self: HttpClientRequest) => HttpClientRequest;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const toUrl: (self: HttpClientRequest) => Option.Option<URL>;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setBody: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (body: Body.HttpBody): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, body: Body.HttpBody): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyUint8Array: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (body: Uint8Array, contentType?: string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, body: Uint8Array, contentType?: string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyText: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (body: string, contentType?: string): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, body: string, contentType?: string): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyJson: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (body: unknown): (self: HttpClientRequest) => Effect.Effect<HttpClientRequest, Body.HttpBodyError>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, body: unknown): Effect.Effect<HttpClientRequest, Body.HttpBodyError>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyUnsafeJson: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (body: unknown): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, body: unknown): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const schemaBodyJson: <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => {
    (body: A): (self: HttpClientRequest) => Effect.Effect<HttpClientRequest, Body.HttpBodyError, R>;
    (self: HttpClientRequest, body: A): Effect.Effect<HttpClientRequest, Body.HttpBodyError, R>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyUrlParams: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (input: UrlParams.Input): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, input: UrlParams.Input): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyFormData: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (body: FormData): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, body: FormData): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyFormDataRecord: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (entries: Body.FormDataInput): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, entries: Body.FormDataInput): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyStream: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (body: Stream.Stream<Uint8Array, unknown>, options?: {
        readonly contentType?: string | undefined;
        readonly contentLength?: number | undefined;
    } | undefined): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, body: Stream.Stream<Uint8Array, unknown>, options?: {
        readonly contentType?: string | undefined;
        readonly contentLength?: number | undefined;
    } | undefined): HttpClientRequest;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyFile: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (path: string, options?: FileSystem.StreamOptions & {
        readonly contentType?: string;
    }): (self: HttpClientRequest) => Effect.Effect<HttpClientRequest, PlatformError.PlatformError, FileSystem.FileSystem>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, path: string, options?: FileSystem.StreamOptions & {
        readonly contentType?: string;
    }): Effect.Effect<HttpClientRequest, PlatformError.PlatformError, FileSystem.FileSystem>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const bodyFileWeb: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (file: Body.HttpBody.FileLike): (self: HttpClientRequest) => HttpClientRequest;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpClientRequest, file: Body.HttpBody.FileLike): HttpClientRequest;
};
//# sourceMappingURL=HttpClientRequest.d.ts.map