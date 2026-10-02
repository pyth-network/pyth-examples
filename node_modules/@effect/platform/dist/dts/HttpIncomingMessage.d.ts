/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Inspectable from "effect/Inspectable";
import * as Option from "effect/Option";
import type * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import type { ParseOptions } from "effect/SchemaAST";
import type * as Stream from "effect/Stream";
import * as FileSystem from "./FileSystem.js";
import type * as Headers from "./Headers.js";
import * as UrlParams from "./UrlParams.js";
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
export interface HttpIncomingMessage<E> extends Inspectable.Inspectable {
    readonly [TypeId]: TypeId;
    readonly headers: Headers.Headers;
    readonly remoteAddress: Option.Option<string>;
    readonly json: Effect.Effect<unknown, E>;
    readonly text: Effect.Effect<string, E>;
    readonly urlParamsBody: Effect.Effect<UrlParams.UrlParams, E>;
    readonly arrayBuffer: Effect.Effect<ArrayBuffer, E>;
    readonly stream: Stream.Stream<Uint8Array, E>;
}
/**
 * @since 1.0.0
 * @category schema
 */
export declare const schemaBodyJson: <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => <E>(self: HttpIncomingMessage<E>) => Effect.Effect<A, E | ParseResult.ParseError, R>;
/**
 * @since 1.0.0
 * @category schema
 */
export declare const schemaBodyUrlParams: <A, I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => <E>(self: HttpIncomingMessage<E>) => Effect.Effect<A, E | ParseResult.ParseError, R>;
/**
 * @since 1.0.0
 * @category schema
 */
export declare const schemaHeaders: <A, I extends Readonly<Record<string, string | undefined>>, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => <E>(self: HttpIncomingMessage<E>) => Effect.Effect<A, ParseResult.ParseError, R>;
declare const MaxBodySize_base: Context.ReferenceClass<MaxBodySize, "@effect/platform/HttpIncomingMessage/MaxBodySize", Option.Option<FileSystem.Size>>;
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare class MaxBodySize extends MaxBodySize_base {
}
/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare const withMaxBodySize: ((size: Option.Option<FileSystem.SizeInput>) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>) & (<A, E, R>(effect: Effect.Effect<A, E, R>, size: Option.Option<FileSystem.SizeInput>) => Effect.Effect<A, E, R>);
/**
 * @since 1.0.0
 */
export declare const inspect: <E>(self: HttpIncomingMessage<E>, that: object) => object;
export {};
//# sourceMappingURL=HttpIncomingMessage.d.ts.map