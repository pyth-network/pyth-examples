import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import type * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Persistence from "./Persistence.js";
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const dataLoader: ((options: {
    readonly window: Duration.DurationInput;
    readonly maxBatchSize?: number;
}) => <A extends Request.Request<any, any>>(self: RequestResolver.RequestResolver<A, never>) => Effect.Effect<RequestResolver.RequestResolver<A, never>, never, Scope.Scope>) & (<A extends Request.Request<any, any>>(self: RequestResolver.RequestResolver<A, never>, options: {
    readonly window: Duration.DurationInput;
    readonly maxBatchSize?: number;
}) => Effect.Effect<RequestResolver.RequestResolver<A, never>, never, Scope.Scope>);
/**
 * @since 1.0.0
 * @category model
 */
export interface PersistedRequest<R, IE, E, IA, A> extends Request.Request<A, E>, Schema.WithResult<A, IA, E, IE, R> {
}
/**
 * @since 1.0.0
 * @category model
 */
export declare namespace PersistedRequest {
    /**
     * @since 1.0.0
     * @category model
     */
    type Any = PersistedRequest<any, any, any, any, any> | PersistedRequest<any, never, never, any, any>;
}
/**
 * @since 1.0.0
 * @category combinators
 */
export declare const persisted: {
    /**
     * @since 1.0.0
     * @category combinators
     */
    <Req extends PersistedRequest.Any>(options: {
        readonly storeId: string;
        readonly timeToLive: (...args: Persistence.ResultPersistence.TimeToLiveArgs<Req>) => Duration.DurationInput;
    }): (self: RequestResolver.RequestResolver<Req, never>) => Effect.Effect<RequestResolver.RequestResolver<Req, Schema.WithResult.Context<Req>>, never, Persistence.ResultPersistence | Scope.Scope>;
    /**
     * @since 1.0.0
     * @category combinators
     */
    <Req extends PersistedRequest.Any>(self: RequestResolver.RequestResolver<Req, never>, options: {
        readonly storeId: string;
        readonly timeToLive: (...args: Persistence.ResultPersistence.TimeToLiveArgs<Req>) => Duration.DurationInput;
    }): Effect.Effect<RequestResolver.RequestResolver<Req, Schema.WithResult.Context<Req>>, never, Persistence.ResultPersistence | Scope.Scope>;
};
//# sourceMappingURL=RequestResolver.d.ts.map