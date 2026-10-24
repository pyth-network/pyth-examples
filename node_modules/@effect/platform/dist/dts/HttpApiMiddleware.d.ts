/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { Simplify } from "effect/Types";
import type * as HttpApiSecurity from "./HttpApiSecurity.js";
import type * as HttpRouter from "./HttpRouter.js";
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
 * @category type ids
 */
export declare const SecurityTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type SecurityTypeId = typeof SecurityTypeId;
/**
 * @since 1.0.0
 * @category guards
 */
export declare const isSecurity: (u: TagClassAny) => u is TagClassSecurityAny;
/**
 * @since 1.0.0
 * @category models
 */
export interface HttpApiMiddleware<Provides, E> extends Effect.Effect<Provides, E, HttpRouter.HttpRouter.Provided> {
}
/**
 * @since 1.0.0
 * @category models
 */
export type HttpApiMiddlewareSecurity<Security extends Record<string, HttpApiSecurity.HttpApiSecurity>, Provides, E> = {
    readonly [K in keyof Security]: (_: HttpApiSecurity.HttpApiSecurity.Type<Security[K]>) => Effect.Effect<Provides, E, HttpRouter.HttpRouter.Provided>;
};
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpApiMiddleware {
    /**
     * @since 1.0.0
     * @category models
     */
    interface Any {
        readonly [TypeId]: TypeId;
    }
    /**
     * @since 1.0.0
     * @category models
     */
    interface AnyId {
        readonly [TypeId]: {
            readonly provides: any;
        };
    }
    /**
     * @since 1.0.0
     * @category models
     */
    type Provides<A> = A extends {
        readonly [TypeId]: {
            readonly provides: infer P;
        };
    } ? P : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type ExtractProvides<A> = Provides<Only<A>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Error<A> = A extends {
        readonly [TypeId]: {
            readonly failure: infer E;
        };
    } ? E : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type ErrorContext<A> = A extends {
        readonly [TypeId]: {
            readonly failureContext: infer R;
        };
    } ? R : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Only<R> = Extract<R, AnyId>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Without<R> = Exclude<R, AnyId>;
}
/**
 * @since 1.0.0
 * @category models
 */
export type TagClass<Self, Name extends string, Options> = Options extends {
    readonly security: Record<string, HttpApiSecurity.HttpApiSecurity>;
} ? TagClass.BaseSecurity<Self, Name, Options, Simplify<HttpApiMiddlewareSecurity<Options["security"], TagClass.Service<Options>, TagClass.FailureService<Options>>>, Options["security"]> : TagClass.Base<Self, Name, Options, HttpApiMiddleware<TagClass.Service<Options>, TagClass.FailureService<Options>>>;
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace TagClass {
    /**
     * @since 1.0.0
     * @category models
     */
    type Provides<Options> = Options extends {
        readonly provides: Context.Tag<any, any>;
        readonly optional?: false;
    } ? Context.Tag.Identifier<Options["provides"]> : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Service<Options> = Options extends {
        readonly provides: Context.Tag<any, any>;
    } ? Context.Tag.Service<Options["provides"]> : void;
    /**
     * @since 1.0.0
     * @category models
     */
    type FailureSchema<Options> = Options extends {
        readonly failure: Schema.Schema.All;
        readonly optional?: false;
    } ? Options["failure"] : typeof Schema.Never;
    /**
     * @since 1.0.0
     * @category models
     */
    type Failure<Options> = Options extends {
        readonly failure: Schema.Schema<infer _A, infer _I, infer _R>;
        readonly optional?: false;
    } ? _A : never;
    /**
     * @since 1.0.0
     * @category models
     */
    type FailureContext<Options> = Schema.Schema.Context<FailureSchema<Options>>;
    /**
     * @since 1.0.0
     * @category models
     */
    type FailureService<Options> = Optional<Options> extends true ? unknown : Failure<Options>;
    /**
     * @since 1.0.0
     * @category models
     */
    type Optional<Options> = Options extends {
        readonly optional: true;
    } ? true : false;
    /**
     * @since 1.0.0
     * @category models
     */
    interface Base<Self, Name extends string, Options, Service> extends Context.Tag<Self, Service> {
        new (_: never): Context.TagClassShape<Name, Service> & {
            readonly [TypeId]: {
                readonly provides: Provides<Options>;
                readonly failure: Failure<Options>;
                readonly failureContext: FailureContext<Options>;
            };
        };
        readonly [TypeId]: TypeId;
        readonly optional: Optional<Options>;
        readonly failure: FailureSchema<Options>;
        readonly provides: Options extends {
            readonly provides: Context.Tag<any, any>;
        } ? Options["provides"] : undefined;
    }
    /**
     * @since 1.0.0
     * @category models
     */
    interface BaseSecurity<Self, Name extends string, Options, Service, Security extends Record<string, HttpApiSecurity.HttpApiSecurity>> extends Base<Self, Name, Options, Service> {
        readonly [SecurityTypeId]: SecurityTypeId;
        readonly security: Security;
    }
}
/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassAny extends Context.Tag<any, HttpApiMiddleware.Any> {
    readonly [TypeId]: TypeId;
    readonly optional: boolean;
    readonly provides?: Context.Tag<any, any>;
    readonly failure: Schema.Schema.All;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassSecurityAny extends TagClassAny {
    readonly [SecurityTypeId]: SecurityTypeId;
    readonly security: Record<string, HttpApiSecurity.HttpApiSecurity>;
}
/**
 * @since 1.0.0
 * @category tags
 */
export declare const Tag: <Self>() => <const Name extends string, const Options extends {
    readonly optional?: boolean;
    readonly failure?: Schema.Schema.All;
    readonly provides?: Context.Tag<any, any>;
    readonly security?: Record<string, HttpApiSecurity.HttpApiSecurity>;
}>(id: Name, options?: Options | undefined) => TagClass<Self, Name, Options>;
//# sourceMappingURL=HttpApiMiddleware.d.ts.map