import * as VariantSchema from "@effect/experimental/VariantSchema";
import type { Brand } from "effect/Brand";
import * as DateTime from "effect/DateTime";
import type { DurationInput } from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { Scope } from "effect/Scope";
import { SqlClient } from "./SqlClient.js";
declare const Class: <Self = never>(identifier: string) => <const Fields extends VariantSchema.Struct.Fields>(fields: Fields & VariantSchema.Struct.Validate<Fields, "select" | "insert" | "update" | "json" | "jsonCreate" | "jsonUpdate">, annotations?: Schema.Annotations.Schema<Self, readonly []> | undefined) => [Self] extends [never] ? "Missing `Self` generic - use `class Self extends Class<Self>()({ ... })`" : VariantSchema.Class<Self, Fields, VariantSchema.ExtractFields<"select", Fields, true>, Schema.Struct.Type<VariantSchema.ExtractFields<"select", Fields, true>>, Schema.Struct.Encoded<VariantSchema.ExtractFields<"select", Fields, true>>, Schema.Schema.Context<VariantSchema.ExtractFields<"select", Fields, true>[keyof VariantSchema.ExtractFields<"select", Fields, true>]>, Schema.Struct.Constructor<VariantSchema.ExtractFields<"select", Fields, true>>> & {
    readonly select: Schema.Struct<VariantSchema.ExtractFields<"select", Fields, false> extends infer T ? { [K in keyof T]: VariantSchema.ExtractFields<"select", Fields, false>[K]; } : never>;
    readonly insert: Schema.Struct<VariantSchema.ExtractFields<"insert", Fields, false> extends infer T_1 ? { [K_1 in keyof T_1]: VariantSchema.ExtractFields<"insert", Fields, false>[K_1]; } : never>;
    readonly update: Schema.Struct<VariantSchema.ExtractFields<"update", Fields, false> extends infer T_2 ? { [K_2 in keyof T_2]: VariantSchema.ExtractFields<"update", Fields, false>[K_2]; } : never>;
    readonly json: Schema.Struct<VariantSchema.ExtractFields<"json", Fields, false> extends infer T_3 ? { [K_3 in keyof T_3]: VariantSchema.ExtractFields<"json", Fields, false>[K_3]; } : never>;
    readonly jsonCreate: Schema.Struct<VariantSchema.ExtractFields<"jsonCreate", Fields, false> extends infer T_4 ? { [K_4 in keyof T_4]: VariantSchema.ExtractFields<"jsonCreate", Fields, false>[K_4]; } : never>;
    readonly jsonUpdate: Schema.Struct<VariantSchema.ExtractFields<"jsonUpdate", Fields, false> extends infer T_5 ? { [K_5 in keyof T_5]: VariantSchema.ExtractFields<"jsonUpdate", Fields, false>[K_5]; } : never>;
}, Field: <const A extends VariantSchema.Field.ConfigWithKeys<"select" | "insert" | "update" | "json" | "jsonCreate" | "jsonUpdate">>(config: A & { readonly [K in Exclude<keyof A, "select" | "insert" | "update" | "json" | "jsonCreate" | "jsonUpdate">]: never; }) => VariantSchema.Field<A>, FieldExcept: <const Keys extends readonly ("select" | "insert" | "update" | "json" | "jsonCreate" | "jsonUpdate")[]>(...keys: Keys) => <S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) => VariantSchema.Field<{ readonly [K in Exclude<"select", Keys[number]> | Exclude<"insert", Keys[number]> | Exclude<"update", Keys[number]> | Exclude<"json", Keys[number]> | Exclude<"jsonCreate", Keys[number]> | Exclude<"jsonUpdate", Keys[number]>]: S; }>, FieldOnly: <const Keys extends readonly ("select" | "insert" | "update" | "json" | "jsonCreate" | "jsonUpdate")[]>(...keys: Keys) => <S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) => VariantSchema.Field<{ readonly [K in Keys[number]]: S; }>, Struct: <const A extends VariantSchema.Struct.Fields>(fields: A & VariantSchema.Struct.Validate<A, "select" | "insert" | "update" | "json" | "jsonCreate" | "jsonUpdate">) => VariantSchema.Struct<A>, Union: <const Members extends ReadonlyArray<VariantSchema.Struct<any>>>(...members: Members) => VariantSchema.Union<Members> & VariantSchema.Union.Variants<Members, "select" | "insert" | "update" | "json" | "jsonCreate" | "jsonUpdate">, extract: {
    <V extends "select" | "insert" | "update" | "json" | "jsonCreate" | "jsonUpdate">(variant: V): <A extends VariantSchema.Struct<any>>(self: A) => VariantSchema.Extract<V, A, V extends "select" ? true : false>;
    <V extends "select" | "insert" | "update" | "json" | "jsonCreate" | "jsonUpdate", A extends VariantSchema.Struct<any>>(self: A, variant: V): VariantSchema.Extract<V, A, V extends "select" ? true : false>;
}, fieldEvolve: {
    <Self extends VariantSchema.Field<any> | VariantSchema.Field.ValueAny, const Mapping extends Self extends VariantSchema.Field<infer S extends VariantSchema.Field.Config> ? { readonly [K in keyof S]?: (variant: S[K]) => VariantSchema.Field.ValueAny; } : {
        readonly select?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly insert?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly update?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly json?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly jsonCreate?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly jsonUpdate?: (variant: Self) => VariantSchema.Field.ValueAny;
    }>(f: Mapping): (self: Self) => VariantSchema.Field<Self extends VariantSchema.Field<infer S_1 extends VariantSchema.Field.Config> ? { readonly [K_1 in keyof S_1]: K_1 extends keyof Mapping ? Mapping[K_1] extends (arg: any) => any ? ReturnType<Mapping[K_1]> : S_1[K_1] : S_1[K_1]; } : {
        readonly select: "select" extends infer T ? T extends "select" ? T extends keyof Mapping ? Mapping[T] extends (arg: any) => any ? ReturnType<Mapping[T]> : Self : Self : never : never;
        readonly insert: "insert" extends infer T_1 ? T_1 extends "insert" ? T_1 extends keyof Mapping ? Mapping[T_1] extends (arg: any) => any ? ReturnType<Mapping[T_1]> : Self : Self : never : never;
        readonly update: "update" extends infer T_2 ? T_2 extends "update" ? T_2 extends keyof Mapping ? Mapping[T_2] extends (arg: any) => any ? ReturnType<Mapping[T_2]> : Self : Self : never : never;
        readonly json: "json" extends infer T_3 ? T_3 extends "json" ? T_3 extends keyof Mapping ? Mapping[T_3] extends (arg: any) => any ? ReturnType<Mapping[T_3]> : Self : Self : never : never;
        readonly jsonCreate: "jsonCreate" extends infer T_4 ? T_4 extends "jsonCreate" ? T_4 extends keyof Mapping ? Mapping[T_4] extends (arg: any) => any ? ReturnType<Mapping[T_4]> : Self : Self : never : never;
        readonly jsonUpdate: "jsonUpdate" extends infer T_5 ? T_5 extends "jsonUpdate" ? T_5 extends keyof Mapping ? Mapping[T_5] extends (arg: any) => any ? ReturnType<Mapping[T_5]> : Self : Self : never : never;
    }>;
    <Self extends VariantSchema.Field<any> | VariantSchema.Field.ValueAny, const Mapping_1 extends Self extends VariantSchema.Field<infer S extends VariantSchema.Field.Config> ? { readonly [K in keyof S]?: (variant: S[K]) => VariantSchema.Field.ValueAny; } : {
        readonly select?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly insert?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly update?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly json?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly jsonCreate?: (variant: Self) => VariantSchema.Field.ValueAny;
        readonly jsonUpdate?: (variant: Self) => VariantSchema.Field.ValueAny;
    }>(self: Self, f: Mapping_1): VariantSchema.Field<Self extends VariantSchema.Field<infer S_1 extends VariantSchema.Field.Config> ? { readonly [K_1 in keyof S_1]: K_1 extends keyof Mapping_1 ? Mapping_1[K_1] extends (arg: any) => any ? ReturnType<Mapping_1[K_1]> : S_1[K_1] : S_1[K_1]; } : {
        readonly select: "select" extends infer T ? T extends "select" ? T extends keyof Mapping_1 ? Mapping_1[T] extends (arg: any) => any ? ReturnType<Mapping_1[T]> : Self : Self : never : never;
        readonly insert: "insert" extends infer T_1 ? T_1 extends "insert" ? T_1 extends keyof Mapping_1 ? Mapping_1[T_1] extends (arg: any) => any ? ReturnType<Mapping_1[T_1]> : Self : Self : never : never;
        readonly update: "update" extends infer T_2 ? T_2 extends "update" ? T_2 extends keyof Mapping_1 ? Mapping_1[T_2] extends (arg: any) => any ? ReturnType<Mapping_1[T_2]> : Self : Self : never : never;
        readonly json: "json" extends infer T_3 ? T_3 extends "json" ? T_3 extends keyof Mapping_1 ? Mapping_1[T_3] extends (arg: any) => any ? ReturnType<Mapping_1[T_3]> : Self : Self : never : never;
        readonly jsonCreate: "jsonCreate" extends infer T_4 ? T_4 extends "jsonCreate" ? T_4 extends keyof Mapping_1 ? Mapping_1[T_4] extends (arg: any) => any ? ReturnType<Mapping_1[T_4]> : Self : Self : never : never;
        readonly jsonUpdate: "jsonUpdate" extends infer T_5 ? T_5 extends "jsonUpdate" ? T_5 extends keyof Mapping_1 ? Mapping_1[T_5] extends (arg: any) => any ? ReturnType<Mapping_1[T_5]> : Self : Self : never : never;
    }>;
}, fieldFromKey: {
    <Self extends VariantSchema.Field<any> | VariantSchema.Field.ValueAny, const Mapping_2 extends Self extends VariantSchema.Field<infer S extends VariantSchema.Field.Config> ? { readonly [K in keyof S]?: string; } : {
        readonly select?: string;
        readonly insert?: string;
        readonly update?: string;
        readonly json?: string;
        readonly jsonCreate?: string;
        readonly jsonUpdate?: string;
    }>(mapping: Mapping_2): (self: Self) => VariantSchema.Field<Self extends VariantSchema.Field<infer S_1 extends VariantSchema.Field.Config> ? { readonly [K_1 in keyof S_1]: K_1 extends keyof Mapping_2 ? Mapping_2[K_1] extends string ? VariantSchema.fromKey.Rename<S_1[K_1], Mapping_2[K_1]> : S_1[K_1] : S_1[K_1]; } : {
        readonly select: "select" extends infer T ? T extends "select" ? T extends keyof Mapping_2 ? Mapping_2[T] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_2[T]> : Self : Self : never : never;
        readonly insert: "insert" extends infer T_1 ? T_1 extends "insert" ? T_1 extends keyof Mapping_2 ? Mapping_2[T_1] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_2[T_1]> : Self : Self : never : never;
        readonly update: "update" extends infer T_2 ? T_2 extends "update" ? T_2 extends keyof Mapping_2 ? Mapping_2[T_2] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_2[T_2]> : Self : Self : never : never;
        readonly json: "json" extends infer T_3 ? T_3 extends "json" ? T_3 extends keyof Mapping_2 ? Mapping_2[T_3] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_2[T_3]> : Self : Self : never : never;
        readonly jsonCreate: "jsonCreate" extends infer T_4 ? T_4 extends "jsonCreate" ? T_4 extends keyof Mapping_2 ? Mapping_2[T_4] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_2[T_4]> : Self : Self : never : never;
        readonly jsonUpdate: "jsonUpdate" extends infer T_5 ? T_5 extends "jsonUpdate" ? T_5 extends keyof Mapping_2 ? Mapping_2[T_5] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_2[T_5]> : Self : Self : never : never;
    }>;
    <Self extends VariantSchema.Field<any> | VariantSchema.Field.ValueAny, const Mapping_3 extends Self extends VariantSchema.Field<infer S extends VariantSchema.Field.Config> ? { readonly [K in keyof S]?: string; } : {
        readonly select?: string;
        readonly insert?: string;
        readonly update?: string;
        readonly json?: string;
        readonly jsonCreate?: string;
        readonly jsonUpdate?: string;
    }>(self: Self, mapping: Mapping_3): VariantSchema.Field<Self extends VariantSchema.Field<infer S_1 extends VariantSchema.Field.Config> ? { readonly [K_1 in keyof S_1]: K_1 extends keyof Mapping_3 ? Mapping_3[K_1] extends string ? VariantSchema.fromKey.Rename<S_1[K_1], Mapping_3[K_1]> : S_1[K_1] : S_1[K_1]; } : {
        readonly select: "select" extends infer T ? T extends "select" ? T extends keyof Mapping_3 ? Mapping_3[T] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_3[T]> : Self : Self : never : never;
        readonly insert: "insert" extends infer T_1 ? T_1 extends "insert" ? T_1 extends keyof Mapping_3 ? Mapping_3[T_1] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_3[T_1]> : Self : Self : never : never;
        readonly update: "update" extends infer T_2 ? T_2 extends "update" ? T_2 extends keyof Mapping_3 ? Mapping_3[T_2] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_3[T_2]> : Self : Self : never : never;
        readonly json: "json" extends infer T_3 ? T_3 extends "json" ? T_3 extends keyof Mapping_3 ? Mapping_3[T_3] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_3[T_3]> : Self : Self : never : never;
        readonly jsonCreate: "jsonCreate" extends infer T_4 ? T_4 extends "jsonCreate" ? T_4 extends keyof Mapping_3 ? Mapping_3[T_4] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_3[T_4]> : Self : Self : never : never;
        readonly jsonUpdate: "jsonUpdate" extends infer T_5 ? T_5 extends "jsonUpdate" ? T_5 extends keyof Mapping_3 ? Mapping_3[T_5] extends string ? VariantSchema.fromKey.Rename<Self, Mapping_3[T_5]> : Self : Self : never : never;
    }>;
};
/**
 * @since 1.0.0
 * @category models
 */
export type Any = Schema.Schema.Any & {
    readonly fields: Schema.Struct.Fields;
    readonly insert: Schema.Schema.Any;
    readonly update: Schema.Schema.Any;
    readonly json: Schema.Schema.Any;
    readonly jsonCreate: Schema.Schema.Any;
    readonly jsonUpdate: Schema.Schema.Any;
};
/**
 * @since 1.0.0
 * @category models
 */
export type AnyNoContext = Schema.Schema.AnyNoContext & {
    readonly fields: Schema.Struct.Fields;
    readonly insert: Schema.Schema.AnyNoContext;
    readonly update: Schema.Schema.AnyNoContext;
    readonly json: Schema.Schema.AnyNoContext;
    readonly jsonCreate: Schema.Schema.AnyNoContext;
    readonly jsonUpdate: Schema.Schema.AnyNoContext;
};
/**
 * @since 1.0.0
 * @category models
 */
export type VariantsDatabase = "select" | "insert" | "update";
/**
 * @since 1.0.0
 * @category models
 */
export type VariantsJson = "json" | "jsonCreate" | "jsonUpdate";
export { 
/**
 * A base class used for creating domain model schemas.
 *
 * It supports common variants for database and JSON apis.
 *
 * @since 1.0.0
 * @category constructors
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { Model } from "@effect/sql"
 *
 * export const GroupId = Schema.Number.pipe(Schema.brand("GroupId"))
 *
 * export class Group extends Model.Class<Group>("Group")({
 *   id: Model.Generated(GroupId),
 *   name: Schema.NonEmptyTrimmedString,
 *   createdAt: Model.DateTimeInsertFromDate,
 *   updatedAt: Model.DateTimeUpdateFromDate
 * }) {}
 *
 * // schema used for selects
 * Group
 *
 * // schema used for inserts
 * Group.insert
 *
 * // schema used for updates
 * Group.update
 *
 * // schema used for json api
 * Group.json
 * Group.jsonCreate
 * Group.jsonUpdate
 *
 * // you can also turn them into classes
 * class GroupJson extends Schema.Class<GroupJson>("GroupJson")(Group.json) {
 *   get upperName() {
 *     return this.name.toUpperCase()
 *   }
 * }
 * ```
 */
Class, 
/**
 * @since 1.0.0
 * @category extraction
 */
extract, 
/**
 * @since 1.0.0
 * @category fields
 */
Field, 
/**
 * @since 1.0.0
 * @category fields
 */
fieldEvolve, 
/**
 * @since 1.0.0
 * @category fields
 */
FieldExcept, 
/**
 * @since 1.0.0
 * @category fields
 */
fieldFromKey, 
/**
 * @since 1.0.0
 * @category fields
 */
FieldOnly, 
/**
 * @since 1.0.0
 * @category constructors
 */
Struct, 
/**
 * @since 1.0.0
 * @category constructors
 */
Union };
/**
 * @since 1.0.0
 * @category fields
 */
export declare const fields: <A extends VariantSchema.Struct<any>>(self: A) => A[VariantSchema.TypeId];
/**
 * @since 1.0.0
 * @category overrideable
 */
export declare const Override: <A>(value: A) => A & Brand<"Override">;
/**
 * @since 1.0.0
 * @category generated
 */
export interface Generated<S extends Schema.Schema.All | Schema.PropertySignature.All> extends VariantSchema.Field<{
    readonly select: S;
    readonly update: S;
    readonly json: S;
}> {
}
/**
 * A field that represents a column that is generated by the database.
 *
 * It is available for selection and update, but not for insertion.
 *
 * @since 1.0.0
 * @category generated
 */
export declare const Generated: <S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) => Generated<S>;
/**
 * @since 1.0.0
 * @category generated
 */
export interface GeneratedByApp<S extends Schema.Schema.All | Schema.PropertySignature.All> extends VariantSchema.Field<{
    readonly select: S;
    readonly insert: S;
    readonly update: S;
    readonly json: S;
}> {
}
/**
 * A field that represents a column that is generated by the application.
 *
 * It is required by the database, but not by the JSON variants.
 *
 * @since 1.0.0
 * @category generated
 */
export declare const GeneratedByApp: <S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) => GeneratedByApp<S>;
/**
 * @since 1.0.0
 * @category sensitive
 */
export interface Sensitive<S extends Schema.Schema.All | Schema.PropertySignature.All> extends VariantSchema.Field<{
    readonly select: S;
    readonly insert: S;
    readonly update: S;
}> {
}
/**
 * A field that represents a sensitive value that should not be exposed in the
 * JSON variants.
 *
 * @since 1.0.0
 * @category sensitive
 */
export declare const Sensitive: <S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) => Sensitive<S>;
/**
 * Convert a field to one that is optional for all variants.
 *
 * For the database variants, it will accept `null`able values.
 * For the JSON variants, it will also accept missing keys.
 *
 * @since 1.0.0
 * @category optional
 */
export interface FieldOption<S extends Schema.Schema.Any> extends VariantSchema.Field<{
    readonly select: Schema.OptionFromNullOr<S>;
    readonly insert: Schema.OptionFromNullOr<S>;
    readonly update: Schema.OptionFromNullOr<S>;
    readonly json: Schema.optionalWith<S, {
        as: "Option";
    }>;
    readonly jsonCreate: Schema.optionalWith<S, {
        as: "Option";
        nullable: true;
    }>;
    readonly jsonUpdate: Schema.optionalWith<S, {
        as: "Option";
        nullable: true;
    }>;
}> {
}
/**
 * Convert a field to one that is optional for all variants.
 *
 * For the database variants, it will accept `null`able values.
 * For the JSON variants, it will also accept missing keys.
 *
 * @since 1.0.0
 * @category optional
 */
export declare const FieldOption: <Field extends VariantSchema.Field<any> | Schema.Schema.Any>(self: Field) => Field extends Schema.Schema.Any ? FieldOption<Field> : Field extends VariantSchema.Field<infer S> ? VariantSchema.Field<{
    readonly [K in keyof S]: S[K] extends Schema.Schema.Any ? K extends VariantsDatabase ? Schema.OptionFromNullOr<S[K]> : Schema.optionalWith<S[K], {
        as: "Option";
        nullable: true;
    }> : never;
}> : never;
/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeFromDate extends Schema.transform<typeof Schema.ValidDateFromSelf, typeof Schema.DateTimeUtcFromSelf> {
}
/**
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeFromDate: DateTimeFromDate;
/**
 * @since 1.0.0
 * @category date & time
 */
export interface Date extends Schema.transformOrFail<typeof Schema.String, typeof Schema.DateTimeUtcFromSelf> {
}
/**
 * A schema for a `DateTime.Utc` that is serialized as a date string in the
 * format `YYYY-MM-DD`.
 *
 * @since 1.0.0
 * @category date & time
 */
export declare const Date: Date;
/**
 * @since 1.0.0
 * @category date & time
 */
export declare const DateWithNow: VariantSchema.Overrideable<DateTime.Utc, string, never>;
/**
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeWithNow: VariantSchema.Overrideable<DateTime.Utc, string, never>;
/**
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeFromDateWithNow: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date, never>;
/**
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeFromNumberWithNow: VariantSchema.Overrideable<DateTime.Utc, number, never>;
/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeInsert extends VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtc;
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, string>;
    readonly json: typeof Schema.DateTimeUtc;
}> {
}
/**
 * A field that represents a date-time value that is inserted as the current
 * `DateTime.Utc`. It is serialized as a string for the database.
 *
 * It is omitted from updates and is available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeInsert: DateTimeInsert;
/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeInsertFromDate extends VariantSchema.Field<{
    readonly select: DateTimeFromDate;
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>;
    readonly json: typeof Schema.DateTimeUtc;
}> {
}
/**
 * A field that represents a date-time value that is inserted as the current
 * `DateTime.Utc`. It is serialized as a `Date` for the database.
 *
 * It is omitted from updates and is available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeInsertFromDate: DateTimeInsertFromDate;
/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeInsertFromNumber extends VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtcFromNumber;
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, number>;
    readonly json: typeof Schema.DateTimeUtcFromNumber;
}> {
}
/**
 * A field that represents a date-time value that is inserted as the current
 * `DateTime.Utc`. It is serialized as a `number`.
 *
 * It is omitted from updates and is available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeInsertFromNumber: DateTimeInsertFromNumber;
/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeUpdate extends VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtc;
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, string>;
    readonly update: VariantSchema.Overrideable<DateTime.Utc, string>;
    readonly json: typeof Schema.DateTimeUtc;
}> {
}
/**
 * A field that represents a date-time value that is updated as the current
 * `DateTime.Utc`. It is serialized as a string for the database.
 *
 * It is set to the current `DateTime.Utc` on updates and inserts and is
 * available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeUpdate: DateTimeUpdate;
/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeUpdateFromDate extends VariantSchema.Field<{
    readonly select: DateTimeFromDate;
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>;
    readonly update: VariantSchema.Overrideable<DateTime.Utc, globalThis.Date>;
    readonly json: typeof Schema.DateTimeUtc;
}> {
}
/**
 * A field that represents a date-time value that is updated as the current
 * `DateTime.Utc`. It is serialized as a `Date` for the database.
 *
 * It is set to the current `DateTime.Utc` on updates and inserts and is
 * available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeUpdateFromDate: DateTimeUpdateFromDate;
/**
 * @since 1.0.0
 * @category date & time
 */
export interface DateTimeUpdateFromNumber extends VariantSchema.Field<{
    readonly select: typeof Schema.DateTimeUtcFromNumber;
    readonly insert: VariantSchema.Overrideable<DateTime.Utc, number>;
    readonly update: VariantSchema.Overrideable<DateTime.Utc, number>;
    readonly json: typeof Schema.DateTimeUtcFromNumber;
}> {
}
/**
 * A field that represents a date-time value that is updated as the current
 * `DateTime.Utc`. It is serialized as a `number`.
 *
 * It is set to the current `DateTime.Utc` on updates and inserts and is
 * available for selection.
 *
 * @since 1.0.0
 * @category date & time
 */
export declare const DateTimeUpdateFromNumber: DateTimeUpdateFromNumber;
/**
 * @since 1.0.0
 * @category json
 */
export interface JsonFromString<S extends Schema.Schema.All | Schema.PropertySignature.All> extends VariantSchema.Field<{
    readonly select: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>;
    readonly insert: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>;
    readonly update: Schema.Schema<Schema.Schema.Type<S>, string, Schema.Schema.Context<S>>;
    readonly json: S;
    readonly jsonCreate: S;
    readonly jsonUpdate: S;
}> {
}
/**
 * A field that represents a JSON value stored as text in the database.
 *
 * The "json" variants will use the object schema directly.
 *
 * @since 1.0.0
 * @category json
 */
export declare const JsonFromString: <S extends Schema.Schema.All | Schema.PropertySignature.All>(schema: S) => JsonFromString<S>;
/**
 * @since 1.0.0
 * @category uuid
 */
export interface UuidV4Insert<B extends string | symbol> extends VariantSchema.Field<{
    readonly select: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>;
    readonly insert: VariantSchema.Overrideable<Uint8Array & Brand<B>, Uint8Array>;
    readonly update: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>;
    readonly json: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>;
}> {
}
/**
 * @since 1.0.0
 * @category uuid
 */
export declare const UuidV4WithGenerate: <B extends string | symbol>(schema: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>) => VariantSchema.Overrideable<Uint8Array & Brand<B>, Uint8Array>;
/**
 * A field that represents a binary UUID v4 that is generated on inserts.
 *
 * @since 1.0.0
 * @category uuid
 */
export declare const UuidV4Insert: <const B extends string | symbol>(schema: Schema.brand<typeof Schema.Uint8ArrayFromSelf, B>) => UuidV4Insert<B>;
declare const BooleanFromNumber_base: Schema.transform<Schema.Literal<[0, 1]>, typeof Schema.Boolean>;
/**
 * A boolean parsed from 0 or 1
 *
 * @since 1.0.0
 * @category uuid
 */
export declare class BooleanFromNumber extends BooleanFromNumber_base {
}
/**
 * Create a simple CRUD repository from a model.
 *
 * @since 1.0.0
 * @category repository
 */
export declare const makeRepository: <S extends Any, Id extends (keyof S["Type"]) & (keyof S["update"]["Type"]) & (keyof S["fields"])>(Model: S, options: {
    readonly tableName: string;
    readonly spanPrefix: string;
    readonly idColumn: Id;
}) => Effect.Effect<{
    readonly insert: (insert: S["insert"]["Type"]) => Effect.Effect<S["Type"], never, S["Context"] | S["insert"]["Context"]>;
    readonly insertVoid: (insert: S["insert"]["Type"]) => Effect.Effect<void, never, S["Context"] | S["insert"]["Context"]>;
    readonly update: (update: S["update"]["Type"]) => Effect.Effect<S["Type"], never, S["Context"] | S["update"]["Context"]>;
    readonly updateVoid: (update: S["update"]["Type"]) => Effect.Effect<void, never, S["Context"] | S["update"]["Context"]>;
    readonly findById: (id: Schema.Schema.Type<S["fields"][Id]>) => Effect.Effect<Option.Option<S["Type"]>, never, S["Context"] | Schema.Schema.Context<S["fields"][Id]>>;
    readonly delete: (id: Schema.Schema.Type<S["fields"][Id]>) => Effect.Effect<void, never, Schema.Schema.Context<S["fields"][Id]>>;
}, never, SqlClient>;
/**
 * Create some simple data loaders from a model.
 *
 * @since 1.0.0
 * @category repository
 */
export declare const makeDataLoaders: <S extends AnyNoContext, Id extends (keyof S["Type"]) & (keyof S["update"]["Type"]) & (keyof S["fields"])>(Model: S, options: {
    readonly tableName: string;
    readonly spanPrefix: string;
    readonly idColumn: Id;
    readonly window: DurationInput;
    readonly maxBatchSize?: number | undefined;
}) => Effect.Effect<{
    readonly insert: (insert: S["insert"]["Type"]) => Effect.Effect<S["Type"]>;
    readonly insertVoid: (insert: S["insert"]["Type"]) => Effect.Effect<void>;
    readonly findById: (id: Schema.Schema.Type<S["fields"][Id]>) => Effect.Effect<Option.Option<S["Type"]>>;
    readonly delete: (id: Schema.Schema.Type<S["fields"][Id]>) => Effect.Effect<void>;
}, never, SqlClient | Scope>;
//# sourceMappingURL=Model.d.ts.map