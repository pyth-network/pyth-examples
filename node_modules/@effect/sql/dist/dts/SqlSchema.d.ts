/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import type * as Option from "effect/Option";
import type { ParseError } from "effect/ParseResult";
import * as Schema from "effect/Schema";
/**
 * Run a sql query with a request schema and a result schema.
 *
 * @since 1.0.0
 * @category constructor
 */
export declare const findAll: <IR, II, IA, AR, AI, A, R, E>(options: {
    readonly Request: Schema.Schema<IA, II, IR>;
    readonly Result: Schema.Schema<A, AI, AR>;
    readonly execute: (request: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>;
}) => (request: IA) => Effect.Effect<ReadonlyArray<A>, E | ParseError, R | IR | AR>;
declare const void_: <IR, II, IA, R, E>(options: {
    readonly Request: Schema.Schema<IA, II, IR>;
    readonly execute: (request: II) => Effect.Effect<unknown, E, R>;
}) => (request: IA) => Effect.Effect<void, E | ParseError, R | IR>;
export { 
/**
 * Run a sql query with a request schema and discard the result.
 *
 * @since 1.0.0
 * @category constructor
 */
void_ as void };
/**
 * Run a sql query with a request schema and a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
export declare const findOne: <IR, II, IA, AR, AI, A, R, E>(options: {
    readonly Request: Schema.Schema<IA, II, IR>;
    readonly Result: Schema.Schema<A, AI, AR>;
    readonly execute: (request: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>;
}) => (request: IA) => Effect.Effect<Option.Option<A>, E | ParseError, R | IR | AR>;
/**
 * Run a sql query with a request schema and a result schema and return the first result.
 *
 * @since 1.0.0
 * @category constructor
 */
export declare const single: <IR, II, IA, AR, AI, A, R, E>(options: {
    readonly Request: Schema.Schema<IA, II, IR>;
    readonly Result: Schema.Schema<A, AI, AR>;
    readonly execute: (request: II) => Effect.Effect<ReadonlyArray<unknown>, E, R>;
}) => (request: IA) => Effect.Effect<A, E | ParseError | Cause.NoSuchElementException, R | IR | AR>;
//# sourceMappingURL=SqlSchema.d.ts.map