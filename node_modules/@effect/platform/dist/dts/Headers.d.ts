/**
 * @since 1.0.0
 */
import * as FiberRef from "effect/FiberRef";
import { type Redactable } from "effect/Inspectable";
import type * as Option from "effect/Option";
import * as Record from "effect/Record";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const HeadersTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type HeadersTypeId = typeof HeadersTypeId;
/**
 * @since 1.0.0
 * @category refinements
 */
export declare const isHeaders: (u: unknown) => u is Headers;
/**
 * @since 1.0.0
 * @category models
 */
export interface Headers extends Redactable {
    readonly [HeadersTypeId]: HeadersTypeId;
    readonly [key: string]: string;
}
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const schemaFromSelf: Schema.Schema<Headers>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare const schema: Schema.Schema<Headers, Record.ReadonlyRecord<string, string>>;
/**
 * @since 1.0.0
 * @category models
 */
export type Input = Record.ReadonlyRecord<string, string | ReadonlyArray<string> | undefined> | Iterable<readonly [string, string]>;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const empty: Headers;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const fromInput: (input?: Input) => Headers;
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const unsafeFromRecord: (input: Record.ReadonlyRecord<string, string>) => Headers;
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const has: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string): (self: Headers) => boolean;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: Headers, key: string): boolean;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const get: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string): (self: Headers) => Option.Option<string>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: Headers, key: string): Option.Option<string>;
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
    (key: string, value: string): (self: Headers) => Headers;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: Headers, key: string, value: string): Headers;
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
    (headers: Input): (self: Headers) => Headers;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: Headers, headers: Input): Headers;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const merge: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (headers: Headers): (self: Headers) => Headers;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: Headers, headers: Headers): Headers;
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
    (key: string | RegExp | ReadonlyArray<string | RegExp>): (self: Headers) => Headers;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: Headers, key: string | RegExp | ReadonlyArray<string | RegExp>): Headers;
};
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const redact: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    (key: string | RegExp | ReadonlyArray<string | RegExp>): (self: Headers) => Record<string, string | Redacted.Redacted>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    (self: Headers, key: string | RegExp | ReadonlyArray<string | RegExp>): Record<string, string | Redacted.Redacted>;
};
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const currentRedactedNames: FiberRef.FiberRef<ReadonlyArray<string | RegExp>>;
//# sourceMappingURL=Headers.d.ts.map