import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { ParseError } from "effect/ParseResult";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import * as Schema from "effect/Schema";
import * as Tracer from "effect/Tracer";
import type * as Types from "effect/Types";
import { ResultLengthMismatch } from "./SqlError.js";
/**
 * @since 1.0.0
 * @category requests
 */
export interface SqlRequest<T extends string, A, E> extends Request.Request<A, E | ParseError> {
    readonly _tag: T;
    readonly spanLink: Tracer.SpanLink;
    readonly input: unknown;
    readonly encoded: unknown;
}
/**
 * @since 1.0.0
 * @category resolvers
 */
export interface SqlResolver<T extends string, I, A, E, R> extends RequestResolver.RequestResolver<SqlRequest<T, A, E>> {
    readonly execute: (input: I) => Effect.Effect<A, E | ParseError, R>;
    readonly makeExecute: (resolver: RequestResolver.RequestResolver<SqlRequest<T, A, E>>) => (input: I) => Effect.Effect<A, E | ParseError, R>;
    readonly cachePopulate: (id: I, result: A) => Effect.Effect<void>;
    readonly cacheInvalidate: (id: I) => Effect.Effect<void>;
    readonly request: (input: I) => Effect.Effect<SqlRequest<T, A, E>, ParseError, R>;
}
/**
 * Create a resolver for a sql query with a request schema and a result schema.
 *
 * The request schema is used to validate the input of the query.
 * The result schema is used to validate the output of the query.
 *
 * Results are mapped to the requests in order, so the length of the results must match the length of the requests.
 *
 * @since 1.0.0
 * @category resolvers
 */
export declare const ordered: <T extends string, I, II, RI, A, IA, _, E, RA = never, R = never>(tag: T, options: {
    readonly Request: Schema.Schema<I, II, RI>;
    readonly Result: Schema.Schema<A, IA>;
    readonly execute: (requests: Array<Types.NoInfer<II>>) => Effect.Effect<ReadonlyArray<_>, E>;
    readonly withContext?: false;
} | {
    readonly Request: Schema.Schema<I, II, RI>;
    readonly Result: Schema.Schema<A, IA, RA>;
    readonly execute: (requests: Array<Types.NoInfer<II>>) => Effect.Effect<ReadonlyArray<_>, E, R>;
    readonly withContext: true;
}) => Effect.Effect<SqlResolver<T, I, A, E | ResultLengthMismatch, RI>, never, RA | R>;
/**
 * Create a resolver the can return multiple results for a single request.
 *
 * Results are grouped by a common key extracted from the request and result.
 *
 * @since 1.0.0
 * @category resolvers
 */
export declare const grouped: <T extends string, I, II, K, RI, A, IA, Row, E, RA = never, R = never>(tag: T, options: {
    readonly Request: Schema.Schema<I, II, RI>;
    readonly RequestGroupKey: (request: Types.NoInfer<I>) => K;
    readonly Result: Schema.Schema<A, IA>;
    readonly ResultGroupKey: (result: Types.NoInfer<A>, row: Types.NoInfer<Row>) => K;
    readonly execute: (requests: Array<Types.NoInfer<II>>) => Effect.Effect<ReadonlyArray<Row>, E>;
    readonly withContext?: false;
} | {
    readonly Request: Schema.Schema<I, II, RI>;
    readonly RequestGroupKey: (request: Types.NoInfer<I>) => K;
    readonly Result: Schema.Schema<A, IA, RA>;
    readonly ResultGroupKey: (result: Types.NoInfer<A>, row: Types.NoInfer<Row>) => K;
    readonly execute: (requests: Array<Types.NoInfer<II>>) => Effect.Effect<ReadonlyArray<Row>, E, R>;
    readonly withContext: true;
}) => Effect.Effect<SqlResolver<T, I, Array<A>, E, RI>, never, RA | R>;
/**
 * Create a resolver that resolves results by id.
 *
 * @since 1.0.0
 * @category resolvers
 */
export declare const findById: <T extends string, I, II, RI, A, IA, Row, E, RA = never, R = never>(tag: T, options: {
    readonly Id: Schema.Schema<I, II, RI>;
    readonly Result: Schema.Schema<A, IA>;
    readonly ResultId: (result: Types.NoInfer<A>, row: Types.NoInfer<Row>) => I;
    readonly execute: (requests: Array<Types.NoInfer<II>>) => Effect.Effect<ReadonlyArray<Row>, E>;
    readonly withContext?: false;
} | {
    readonly Id: Schema.Schema<I, II, RI>;
    readonly Result: Schema.Schema<A, IA, RA>;
    readonly ResultId: (result: Types.NoInfer<A>, row: Types.NoInfer<Row>) => I;
    readonly execute: (requests: Array<Types.NoInfer<II>>) => Effect.Effect<ReadonlyArray<Row>, E, R>;
    readonly withContext: true;
}) => Effect.Effect<SqlResolver<T, I, Option.Option<A>, E, RI>, never, RA | R>;
declare const void_: <T extends string, I, II, RI, E, R = never>(tag: T, options: {
    readonly Request: Schema.Schema<I, II, RI>;
    readonly execute: (requests: Array<Types.NoInfer<II>>) => Effect.Effect<ReadonlyArray<unknown>, E>;
    readonly withContext?: false;
} | {
    readonly Request: Schema.Schema<I, II, RI>;
    readonly execute: (requests: Array<Types.NoInfer<II>>) => Effect.Effect<unknown, E, R>;
    readonly withContext: true;
}) => Effect.Effect<SqlResolver<T, I, void, E, RI>, never, R>;
export { 
/**
 * Create a resolver that performs side effects.
 *
 * @since 1.0.0
 * @category resolvers
 */
void_ as void };
//# sourceMappingURL=SqlResolver.d.ts.map