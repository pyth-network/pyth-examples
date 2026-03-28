/**
 * @since 1.0.0
 */
import type { Brand } from "effect/Brand";
import type * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import { type Pipeable } from "effect/Pipeable";
import * as Schema from "effect/Schema";
import type * as AST from "effect/SchemaAST";
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
export interface Struct<in out A extends Field.Fields> extends Pipeable {
    readonly [TypeId]: A;
}
/**
 * @since 1.0.0
 * @category guards
 */
export declare const isStruct: (u: unknown) => u is Struct<any>;
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Struct {
    /**
     * @since 1.0.0
     * @category models
     */
    type Any = {
        readonly [TypeId]: any;
    };
    /**
     * @since 1.0.0
     * @category models
     */
    type Fields = {
        readonly [key: string]: Schema.Schema.All | Schema.PropertySignature.All | Field<any> | Struct<any> | undefined;
    };
    /**
     * @since 1.0.0
     * @category models
     */
    type Validate<A, Variant extends string> = {
        readonly [K in keyof A]: A[K] extends {
            readonly [TypeId]: infer _;
        } ? Validate<A[K], Variant> : A[K] extends Field<infer Config> ? [keyof Config] extends [Variant] ? {} : "field must have valid variants" : {};
    };
}
/**
 * @since 1.0.0
 * @category type ids
 */
export declare const FieldTypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type ids
 */
export type FieldTypeId = typeof FieldTypeId;
/**
 * @since 1.0.0
 * @category models
 */
export interface Field<in out A extends Field.Config> extends Pipeable {
    readonly [FieldTypeId]: FieldTypeId;
    readonly schemas: A;
}
/**
 * @since 1.0.0
 * @category guards
 */
export declare const isField: (u: unknown) => u is Field<any>;
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Field {
    /**
     * @since 1.0.0
     * @category models
     */
    type Any = {
        readonly [FieldTypeId]: FieldTypeId;
    };
    /**
     * @since 1.0.0
     * @category models
     */
    type ValueAny = Schema.Schema.All | Schema.PropertySignature.All;
    /**
     * @since 1.0.0
     * @category models
     */
    type Config = {
        readonly [key: string]: Schema.Schema.All | Schema.PropertySignature.All | undefined;
    };
    /**
     * @since 1.0.0
     * @category models
     */
    type ConfigWithKeys<K extends string> = {
        readonly [P in K]?: Schema.Schema.All | Schema.PropertySignature.All;
    };
    /**
     * @since 1.0.0
     * @category models
     */
    type Fields = {
        readonly [key: string]: Schema.Schema.All | Schema.PropertySignature.All | Field<any> | Struct<any> | undefined;
    };
}
/**
 * @since 1.0.0
 * @category extractors
 */
export type ExtractFields<V extends string, Fields extends Struct.Fields, IsDefault = false> = {
    readonly [K in keyof Fields as [Fields[K]] extends [Field<infer Config>] ? V extends keyof Config ? K : never : K]: [Fields[K]] extends [Struct<infer _>] ? Extract<V, Fields[K], IsDefault> : [Fields[K]] extends [Field<infer Config>] ? [Config[V]] extends [Schema.Schema.All | Schema.PropertySignature.All] ? Config[V] : never : [Fields[K]] extends [Schema.Schema.All | Schema.PropertySignature.All] ? Fields[K] : never;
};
/**
 * @since 1.0.0
 * @category extractors
 */
export type Extract<V extends string, A extends Struct<any>, IsDefault = false> = [A] extends [
    Struct<infer Fields>
] ? IsDefault extends true ? [A] extends [Schema.Schema.Any] ? A : Schema.Struct<Schema.Simplify<ExtractFields<V, Fields>>> : Schema.Struct<Schema.Simplify<ExtractFields<V, Fields>>> : never;
/**
 * @category accessors
 * @since 1.0.0
 */
export declare const fields: <A extends Struct<any>>(self: A) => A[TypeId];
type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
/**
 * @since 1.0.0
 * @category models
 */
export interface Class<Self, Fields extends Struct.Fields, SchemaFields extends Schema.Struct.Fields, A, I, R, C> extends Schema.Schema<Self, Schema.Simplify<I>, R>, Struct<Schema.Simplify<Fields>> {
    new (props: RequiredKeys<C> extends never ? void | Schema.Simplify<C> : Schema.Simplify<C>, options?: {
        readonly disableValidation?: boolean;
    }): A;
    readonly ast: AST.Transformation;
    make<Args extends Array<any>, X>(this: {
        new (...args: Args): X;
    }, ...args: Args): X;
    annotations(annotations: Schema.Annotations.Schema<Self>): Schema.SchemaClass<Self, I, R>;
    readonly identifier: string;
    readonly fields: Schema.Simplify<SchemaFields>;
}
type ClassFromFields<Self, Fields extends Struct.Fields, SchemaFields extends Schema.Struct.Fields> = Class<Self, Fields, SchemaFields, Schema.Struct.Type<SchemaFields>, Schema.Struct.Encoded<SchemaFields>, Schema.Struct.Context<SchemaFields>, Schema.Struct.Constructor<SchemaFields>>;
type MissingSelfGeneric<Params extends string = ""> = `Missing \`Self\` generic - use \`class Self extends Class<Self>()(${Params}{ ... })\``;
/**
 * @since 1.0.0
 * @category models
 */
export interface Union<Members extends ReadonlyArray<Struct<any>>> extends Schema.Union<{
    readonly [K in keyof Members]: [Members[K]] extends [Schema.Schema.All] ? Members[K] : never;
}> {
}
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Union {
    /**
     * @since 1.0.0
     * @category models
     */
    type Variants<Members extends ReadonlyArray<Struct<any>>, Variants extends string> = {
        readonly [Variant in Variants]: Schema.Union<{
            [K in keyof Members]: Extract<Variant, Members[K]>;
        }>;
    };
}
/**
 * @since 1.0.0
 * @category models
 */
export interface fromKey<S extends Schema.Schema.All, Key extends string> extends Schema.PropertySignature<":", Schema.Schema.Type<S>, Key, ":", Schema.Schema.Encoded<S>, false, Schema.Schema.Context<S>> {
}
/**
 * @since 1.0.0
 * @category models
 */
export declare namespace fromKey {
    /**
     * @since 1.0.0
     */
    type Rename<S, Key extends string> = S extends Schema.PropertySignature<infer _TypeToken, infer _Type, infer _Key, infer _EncodedToken, infer _Encoded, infer _HasDefault, infer _R> ? Schema.PropertySignature<_TypeToken, _Type, Key, _EncodedToken, _Encoded, _HasDefault, _R> : S extends Schema.Schema.All ? fromKey<S, Key> : never;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: <const Variants extends ReadonlyArray<string>, const Default extends Variants[number]>(options: {
    readonly variants: Variants;
    readonly defaultVariant: Default;
}) => {
    readonly Struct: <const A extends Struct.Fields>(fields: A & Struct.Validate<A, Variants[number]>) => Struct<A>;
    readonly Field: <const A extends Field.ConfigWithKeys<Variants[number]>>(config: A & { readonly [K in Exclude<keyof A, Variants[number]>]: never; }) => Field<A>;
    readonly FieldOnly: <const Keys extends ReadonlyArray<Variants[number]>>(...keys: Keys) => <S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) => Field<{ readonly [K in Keys[number]]: S; }>;
    readonly FieldExcept: <const Keys extends ReadonlyArray<Variants[number]>>(...keys: Keys) => <S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) => Field<{ readonly [K in Exclude<Variants[number], Keys[number]>]: S; }>;
    readonly fieldEvolve: {
        <Self extends Field<any> | Field.ValueAny, const Mapping extends (Self extends Field<infer S> ? { readonly [K in keyof S]?: (variant: S[K]) => Field.ValueAny; } : { readonly [K in Variants[number]]?: (variant: Self) => Field.ValueAny; })>(f: Mapping): (self: Self) => Field<Self extends Field<infer S> ? { readonly [K in keyof S]: K extends keyof Mapping ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : S[K] : S[K]; } : { readonly [K in Variants[number]]: K extends keyof Mapping ? Mapping[K] extends (arg: any) => any ? ReturnType<Mapping[K]> : Self : Self; }>;
        <Self extends Field<any> | Field.ValueAny, const Mapping_1 extends (Self extends Field<infer S> ? { readonly [K in keyof S]?: (variant: S[K]) => Field.ValueAny; } : { readonly [K in Variants[number]]?: (variant: Self) => Field.ValueAny; })>(self: Self, f: Mapping_1): Field<Self extends Field<infer S> ? { readonly [K in keyof S]: K extends keyof Mapping_1 ? Mapping_1[K] extends (arg: any) => any ? ReturnType<Mapping_1[K]> : S[K] : S[K]; } : { readonly [K in Variants[number]]: K extends keyof Mapping_1 ? Mapping_1[K] extends (arg: any) => any ? ReturnType<Mapping_1[K]> : Self : Self; }>;
    };
    readonly fieldFromKey: {
        <Self extends Field<any> | Field.ValueAny, const Mapping_2 extends (Self extends Field<infer S> ? { readonly [K in keyof S]?: string; } : { readonly [K in Variants[number]]?: string; })>(mapping: Mapping_2): (self: Self) => Field<Self extends Field<infer S> ? { readonly [K in keyof S]: K extends keyof Mapping_2 ? Mapping_2[K] extends string ? fromKey.Rename<S[K], Mapping_2[K]> : S[K] : S[K]; } : { readonly [K in Variants[number]]: K extends keyof Mapping_2 ? Mapping_2[K] extends string ? fromKey.Rename<Self, Mapping_2[K]> : Self : Self; }>;
        <Self extends Field<any> | Field.ValueAny, const Mapping_3 extends (Self extends Field<infer S> ? { readonly [K in keyof S]?: string; } : { readonly [K in Variants[number]]?: string; })>(self: Self, mapping: Mapping_3): Field<Self extends Field<infer S> ? { readonly [K in keyof S]: K extends keyof Mapping_3 ? Mapping_3[K] extends string ? fromKey.Rename<S[K], Mapping_3[K]> : S[K] : S[K]; } : { readonly [K in Variants[number]]: K extends keyof Mapping_3 ? Mapping_3[K] extends string ? fromKey.Rename<Self, Mapping_3[K]> : Self : Self; }>;
    };
    readonly Class: <Self = never>(identifier: string) => <const Fields extends Struct.Fields>(fields: Fields & Struct.Validate<Fields, Variants[number]>, annotations?: Schema.Annotations.Schema<Self>) => [Self] extends [never] ? MissingSelfGeneric : ClassFromFields<Self, Fields, ExtractFields<Default, Fields, true>> & { readonly [V in Variants[number]]: Extract<V, Struct<Fields>>; };
    readonly Union: <const Members extends ReadonlyArray<Struct<any>>>(...members: Members) => Union<Members> & Union.Variants<Members, Variants[number]>;
    readonly extract: {
        <V extends Variants[number]>(variant: V): <A extends Struct<any>>(self: A) => Extract<V, A, V extends Default ? true : false>;
        <V extends Variants[number], A extends Struct<any>>(self: A, variant: V): Extract<V, A, V extends Default ? true : false>;
    };
};
/**
 * @since 1.0.0
 * @category overrideable
 */
export declare const Override: <A>(value: A) => A & Brand<"Override">;
/**
 * @since 1.0.0
 * @category overrideable
 */
export interface Overrideable<To, From, R = never> extends Schema.PropertySignature<":", (To & Brand<"Override">) | undefined, never, ":", From, true, R> {
}
/**
 * @since 1.0.0
 * @category overrideable
 */
export declare const Overrideable: <From, IFrom, RFrom, To, ITo, R>(from: Schema.Schema<From, IFrom, RFrom>, to: Schema.Schema<To, ITo>, options: {
    readonly generate: (_: Option.Option<ITo>) => Effect.Effect<From, ParseResult.ParseIssue, R>;
    readonly decode?: Schema.Schema<ITo, From>;
    readonly constructorDefault?: () => To;
}) => Overrideable<To, IFrom, RFrom | R>;
export {};
//# sourceMappingURL=VariantSchema.d.ts.map