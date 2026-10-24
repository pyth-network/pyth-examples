/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause";
import * as Schema from "effect/Schema";
import type { Simplify } from "effect/Types";
/**
 * @since 1.0.0
 * @category type id
 */
export declare const TypeId: unique symbol;
/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId;
/**
 * @since 1.0.0
 * @category refinements
 */
export declare const isPlatformError: (u: unknown) => u is PlatformError;
/**
 * @since 1.0.0
 * @category error
 */
export declare const TypeIdError: <const TypeId extends symbol, const Tag extends string>(typeId: TypeId, tag: Tag) => new <A extends Record<string, any>>(args: Simplify<A>) => Cause.YieldableError & Record<TypeId, TypeId> & {
    readonly _tag: Tag;
} & Readonly<A>;
/**
 * @since 1.0.0
 * @category Models
 */
export declare const Module: Schema.Literal<["Clipboard", "Command", "FileSystem", "KeyValueStore", "Path", "Stream", "Terminal"]>;
declare const BadArgument_base: Schema.TaggedErrorClass<BadArgument, "BadArgument", {
    readonly _tag: Schema.tag<"BadArgument">;
} & {
    module: Schema.Literal<["Clipboard", "Command", "FileSystem", "KeyValueStore", "Path", "Stream", "Terminal"]>;
    method: typeof Schema.String;
    description: Schema.optional<typeof Schema.String>;
    cause: Schema.optional<typeof Schema.Defect>;
}>;
/**
 * @since 1.0.0
 * @category Models
 */
export declare class BadArgument extends BadArgument_base {
    /**
     * @since 1.0.0
     */
    readonly [TypeId]: typeof TypeId;
    /**
     * @since 1.0.0
     */
    get message(): string;
}
/**
 * @since 1.0.0
 * @category Model
 */
export declare const SystemErrorReason: Schema.Literal<["AlreadyExists", "BadResource", "Busy", "InvalidData", "NotFound", "PermissionDenied", "TimedOut", "UnexpectedEof", "Unknown", "WouldBlock", "WriteZero"]>;
/**
 * @since 1.0.0
 * @category Model
 */
export type SystemErrorReason = typeof SystemErrorReason.Type;
declare const SystemError_base: Schema.TaggedErrorClass<SystemError, "SystemError", {
    readonly _tag: Schema.tag<"SystemError">;
} & {
    reason: Schema.Literal<["AlreadyExists", "BadResource", "Busy", "InvalidData", "NotFound", "PermissionDenied", "TimedOut", "UnexpectedEof", "Unknown", "WouldBlock", "WriteZero"]>;
    module: Schema.Literal<["Clipboard", "Command", "FileSystem", "KeyValueStore", "Path", "Stream", "Terminal"]>;
    method: typeof Schema.String;
    description: Schema.optional<typeof Schema.String>;
    syscall: Schema.optional<typeof Schema.String>;
    pathOrDescriptor: Schema.optional<Schema.Union<[typeof Schema.String, typeof Schema.Number]>>;
    cause: Schema.optional<typeof Schema.Defect>;
}>;
/**
 * @since 1.0.0
 * @category models
 */
export declare class SystemError extends SystemError_base {
    /**
     * @since 1.0.0
     */
    readonly [TypeId]: typeof TypeId;
    /**
     * @since 1.0.0
     */
    get message(): string;
}
/**
 * @since 1.0.0
 * @category Models
 */
export type PlatformError = BadArgument | SystemError;
/**
 * @since 1.0.0
 * @category Models
 */
export declare const PlatformError: Schema.Union<[
    typeof BadArgument,
    typeof SystemError
]>;
export {};
//# sourceMappingURL=Error.d.ts.map