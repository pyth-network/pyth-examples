/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect";
import type { Inspectable } from "effect/Inspectable";
import type * as Runtime from "effect/Runtime";
import type * as Schema from "effect/Schema";
import type { ParseOptions } from "effect/SchemaAST";
import type * as Stream from "effect/Stream";
import type { Cookie, Cookies, CookiesError } from "./Cookies.js";
import type * as PlatformError from "./Error.js";
import type * as FileSystem from "./FileSystem.js";
import type * as Headers from "./Headers.js";
import type * as Body from "./HttpBody.js";
import type * as Platform from "./HttpPlatform.js";
import type { Respondable } from "./HttpServerRespondable.js";
import type * as Template from "./Template.js";
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
export interface HttpServerResponse extends Effect.Effect<HttpServerResponse>, Inspectable, Respondable {
    readonly [TypeId]: TypeId;
    readonly status: number;
    readonly statusText?: string | undefined;
    readonly headers: Headers.Headers;
    readonly cookies: Cookies;
    readonly body: Body.HttpBody;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface Options {
    readonly status?: number | undefined;
    readonly statusText?: string | undefined;
    readonly headers?: Headers.Input | undefined;
    readonly cookies?: Cookies | undefined;
    readonly contentType?: string | undefined;
    readonly contentLength?: number | undefined;
}
/**
 * @since 1.0.0
 */
export declare namespace Options {
    /**
     * @since 1.0.0
     * @category models
     */
    interface WithContent extends Omit<Options, "contentType" | "contentLength"> {
    }
    /**
     * @since 1.0.0
     * @category models
     */
    interface WithContentType extends Omit<Options, "contentLength"> {
    }
}
/**
 * @since 1.0.0
 */
export declare const isServerResponse: (u: unknown) => u is HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const empty: (options?: Options.WithContent | undefined) => HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const redirect: (location: string | URL, options?: Options.WithContentType | undefined) => HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const uint8Array: (body: Uint8Array, options?: Options.WithContentType | undefined) => HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const text: (body: string, options?: Options.WithContentType | undefined) => HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const html: {
    /**
     * @since 1.0.0
     * @category constructors
     */
    <A extends ReadonlyArray<Template.Interpolated>>(strings: TemplateStringsArray, ...args: A): Effect.Effect<HttpServerResponse, Template.Interpolated.Error<A[number]>, Template.Interpolated.Context<A[number]>>;
    /**
     * @since 1.0.0
     * @category constructors
     */
    (html: string): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const htmlStream: <A extends ReadonlyArray<Template.InterpolatedWithStream>>(strings: TemplateStringsArray, ...args: A) => Effect.Effect<HttpServerResponse, never, Template.Interpolated.Context<A[number]>>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const json: (body: unknown, options?: Options.WithContentType | undefined) => Effect.Effect<HttpServerResponse, Body.HttpBodyError>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const schemaJson: <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => (body: A, options?: Options.WithContent | undefined) => Effect.Effect<HttpServerResponse, Body.HttpBodyError, R>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const unsafeJson: (body: unknown, options?: Options.WithContentType | undefined) => HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const urlParams: (body: UrlParams.Input, options?: Options.WithContentType | undefined) => HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const raw: (body: unknown, options?: Options | undefined) => HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const formData: (body: FormData, options?: Options.WithContent | undefined) => HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const stream: <E>(body: Stream.Stream<Uint8Array, E, never>, options?: Options | undefined) => HttpServerResponse;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const file: (path: string, options?: (Options & FileSystem.StreamOptions) | undefined) => Effect.Effect<HttpServerResponse, PlatformError.PlatformError, Platform.HttpPlatform>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const fileWeb: (file: Body.HttpBody.FileLike, options?: (Options.WithContent & FileSystem.StreamOptions) | undefined) => Effect.Effect<HttpServerResponse, never, Platform.HttpPlatform>;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setHeader: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string, value: string): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, key: string, value: string): HttpServerResponse;
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
    (input: Headers.Input): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, input: Headers.Input): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const removeCookie: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (name: string): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, name: string): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const expireCookie: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (name: string, options?: Omit<Cookie["options"], "expires" | "maxAge">): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, name: string, options?: Omit<Cookie["options"], "expires" | "maxAge">): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const replaceCookies: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (cookies: Cookies): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, cookies: Cookies): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setCookie: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (name: string, value: string, options?: Cookie["options"]): (self: HttpServerResponse) => Effect.Effect<HttpServerResponse, CookiesError>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, name: string, value: string, options?: Cookie["options"]): Effect.Effect<HttpServerResponse, CookiesError>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const unsafeSetCookie: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (name: string, value: string, options?: Cookie["options"]): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, name: string, value: string, options?: Cookie["options"]): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const updateCookies: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (f: (cookies: Cookies) => Cookies): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, f: (cookies: Cookies) => Cookies): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const mergeCookies: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (cookies: Cookies): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, cookies: Cookies): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setCookies: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (cookies: Iterable<readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
    ]>): (self: HttpServerResponse) => Effect.Effect<HttpServerResponse, CookiesError, never>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, cookies: Iterable<readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
    ]>): Effect.Effect<HttpServerResponse, CookiesError, never>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const unsafeSetCookies: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (cookies: Iterable<readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
    ]>): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, cookies: Iterable<readonly [
        name: string,
        value: string,
        options?: Cookie["options"]
    ]>): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setBody: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (body: Body.HttpBody): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, body: Body.HttpBody): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setStatus: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (status: number, statusText?: string | undefined): (self: HttpServerResponse) => HttpServerResponse;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: HttpServerResponse, status: number, statusText?: string | undefined): HttpServerResponse;
};
/**
 * @since 1.0.0
 * @category conversions
 */
export declare const toWeb: (response: HttpServerResponse, options?: {
    readonly withoutBody?: boolean | undefined;
    readonly runtime?: Runtime.Runtime<never> | undefined;
}) => Response;
//# sourceMappingURL=HttpServerResponse.d.ts.map