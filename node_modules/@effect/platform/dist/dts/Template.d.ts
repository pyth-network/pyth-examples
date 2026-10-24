/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
/**
 * @category models
 * @since 1.0.0
 */
export type PrimitiveValue = string | number | bigint | boolean | null | undefined;
/**
 * @category models
 * @since 1.0.0
 */
export type Primitive = PrimitiveValue | ReadonlyArray<PrimitiveValue>;
/**
 * @category models
 * @since 1.0.0
 */
export type Interpolated = Primitive | Option.Option<Primitive> | Effect.Effect<Primitive, any, any>;
/**
 * @category models
 * @since 1.0.0
 */
export type InterpolatedWithStream = Interpolated | Stream.Stream<Primitive, any, any>;
/**
 * @category models
 * @since 1.0.0
 */
export declare namespace Interpolated {
    /**
     * @category models
     * @since 1.0.0
     */
    type Context<A> = A extends infer T ? T extends Option.Option<infer _> ? never : T extends Stream.Stream<infer _A, infer _E, infer R> ? R : never : never;
    /**
     * @category models
     * @since 1.0.0
     */
    type Error<A> = A extends infer T ? T extends Option.Option<infer _> ? never : T extends Stream.Stream<infer _A, infer E, infer _R> ? E : never : never;
}
/**
 * @category constructors
 * @since 1.0.0
 */
export declare function make<A extends ReadonlyArray<Interpolated>>(strings: TemplateStringsArray, ...args: A): Effect.Effect<string, Interpolated.Error<A[number]>, Interpolated.Context<A[number]>>;
/**
 * @category constructors
 * @since 1.0.0
 */
export declare function stream<A extends ReadonlyArray<InterpolatedWithStream>>(strings: TemplateStringsArray, ...args: A): Stream.Stream<string, Interpolated.Error<A[number]>, Interpolated.Context<A[number]>>;
//# sourceMappingURL=Template.d.ts.map