/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array";
import type * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as Option from "effect/Option";
import type * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import type { ParseOptions } from "effect/SchemaAST";
/**
 * @since 1.0.0
 * @category models
 */
export interface UrlParams extends ReadonlyArray<readonly [string, string]> {
}
/**
 * @since 1.0.0
 * @category models
 */
export type Input = CoercibleRecord | Iterable<readonly [string, Coercible]> | URLSearchParams;
/**
 * @since 1.0.0
 * @category models
 */
export type Coercible = string | number | bigint | boolean | null | undefined;
/**
 * @since 1.0.0
 * @category models
 */
export interface CoercibleRecord {
    readonly [key: string]: Coercible | ReadonlyArray<Coercible> | CoercibleRecord;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const fromInput: (input: Input) => UrlParams;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const schemaFromSelf: Schema.Schema<UrlParams>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const empty: UrlParams;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const getAll: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string): (self: UrlParams) => ReadonlyArray<string>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: UrlParams, key: string): ReadonlyArray<string>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const getFirst: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string): (self: UrlParams) => Option.Option<string>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: UrlParams, key: string): Option.Option<string>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const getLast: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string): (self: UrlParams) => Option.Option<string>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: UrlParams, key: string): Option.Option<string>;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const set: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string, value: Coercible): (self: UrlParams) => UrlParams;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: UrlParams, key: string, value: Coercible): UrlParams;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const setAll: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (input: Input): (self: UrlParams) => UrlParams;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: UrlParams, input: Input): UrlParams;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const append: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string, value: Coercible): (self: UrlParams) => UrlParams;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: UrlParams, key: string, value: Coercible): UrlParams;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const appendAll: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (input: Input): (self: UrlParams) => UrlParams;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: UrlParams, input: Input): UrlParams;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const remove: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string): (self: UrlParams) => UrlParams;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: UrlParams, key: string): UrlParams;
};
/**
 * @since 1.0.0
 * @category conversions
 */
export declare const makeUrl: (url: string, params: UrlParams, hash: Option.Option<string>) => Either.Either<URL, Error>;
/**
 * @since 1.0.0
 * @category conversions
 */
export declare const toString: (self: UrlParams) => string;
/**
 * Builds a `Record` containing all the key-value pairs in the given `UrlParams`
 * as `string` (if only one value for a key) or a `NonEmptyArray<string>`
 * (when more than one value for a key)
 *
 * **Example**
 *
 * ```ts
 * import * as assert from "node:assert"
 * import { UrlParams } from "@effect/platform"
 *
 * const urlParams = UrlParams.fromInput({ a: 1, b: true, c: "string", e: [1, 2, 3] })
 * const result = UrlParams.toRecord(urlParams)
 *
 * assert.deepStrictEqual(
 *   result,
 *   { "a": "1", "b": "true", "c": "string", "e": ["1", "2", "3"] }
 * )
 * ```
 *
 * @since 1.0.0
 * @category conversions
 */
export declare const toRecord: (self: UrlParams) => Record<string, string | Arr.NonEmptyArray<string>>;
/**
 * @since 1.0.0
 * @category schema
 */
export declare const schemaJson: <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => {
    (field: string): (self: UrlParams) => Effect.Effect<A, ParseResult.ParseError, R>;
    (self: UrlParams, field: string): Effect.Effect<A, ParseResult.ParseError, R>;
};
/**
 * Extract schema from all key-value pairs in the given `UrlParams`.
 *
 * **Example**
 *
 * ```ts
 * import * as assert from "node:assert"
 * import { Effect, Schema } from "effect"
 * import { UrlParams } from "@effect/platform"
 *
 * Effect.gen(function* () {
 *   const urlParams = UrlParams.fromInput({ "a": [10, "string"], "b": false })
 *   const result = yield* UrlParams.schemaStruct(Schema.Struct({
 *     a: Schema.Tuple(Schema.NumberFromString, Schema.String),
 *     b: Schema.BooleanFromString
 *   }))(urlParams)
 *
 *   assert.deepStrictEqual(result, {
 *     a: [10, "string"],
 *     b: false
 *   })
 * })
 * ```
 *
 * @since 1.0.0
 * @category schema
 */
export declare const schemaStruct: <A, I extends Record<string, string | ReadonlyArray<string> | undefined>, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => (self: UrlParams) => Effect.Effect<A, ParseResult.ParseError, R>;
/**
 * @since 1.0.0
 * @category schema
 */
export declare const schemaFromString: Schema.Schema<UrlParams, string>;
/**
 * @since 1.0.0
 * @category schema
 */
export declare const schemaRecord: <A, I extends Record<string, string | ReadonlyArray<string> | undefined>, R>(schema: Schema.Schema<A, I, R>) => Schema.Schema<A, UrlParams, R>;
/**
 * @since 1.0.0
 * @category schema
 */
export declare const schemaParse: <A, I extends Record<string, string | ReadonlyArray<string> | undefined>, R>(schema: Schema.Schema<A, I, R>) => Schema.Schema<A, string, R>;
//# sourceMappingURL=UrlParams.d.ts.map