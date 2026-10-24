/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import * as HttpApiSchema from "./HttpApiSchema.js";
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
declare const Issue_base: Schema.Struct<{
    _tag: Schema.propertySignature<Schema.Literal<["Pointer", "Unexpected", "Missing", "Composite", "Refinement", "Transformation", "Type", "Forbidden"]>>;
    path: Schema.propertySignature<Schema.Array$<typeof Schema.PropertyKey>>;
    message: Schema.propertySignature<typeof Schema.String>;
}>;
/**
 * @since 1.0.0
 * @category schemas
 */
export declare class Issue extends Issue_base {
}
declare const HttpApiDecodeError_base: Schema.TaggedErrorClass<HttpApiDecodeError, "HttpApiDecodeError", {
    readonly _tag: Schema.tag<"HttpApiDecodeError">;
} & {
    issues: Schema.Array$<typeof Issue>;
    message: typeof Schema.String;
}>;
/**
 * @since 1.0.0
 * @category errors
 */
export declare class HttpApiDecodeError extends HttpApiDecodeError_base {
    /**
     * @since 1.0.0
     */
    static fromParseError(error: ParseResult.ParseError): Effect.Effect<HttpApiDecodeError>;
    /**
     * @since 1.0.0
     */
    static refailParseError(error: ParseResult.ParseError): Effect.Effect<never, HttpApiDecodeError>;
}
declare const BadRequest_base: HttpApiSchema.EmptyErrorClass<BadRequest, "BadRequest">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class BadRequest extends BadRequest_base {
}
declare const Unauthorized_base: HttpApiSchema.EmptyErrorClass<Unauthorized, "Unauthorized">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class Unauthorized extends Unauthorized_base {
}
declare const Forbidden_base: HttpApiSchema.EmptyErrorClass<Forbidden, "Forbidden">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class Forbidden extends Forbidden_base {
}
declare const NotFound_base: HttpApiSchema.EmptyErrorClass<NotFound, "NotFound">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class NotFound extends NotFound_base {
}
declare const MethodNotAllowed_base: HttpApiSchema.EmptyErrorClass<MethodNotAllowed, "MethodNotAllowed">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class MethodNotAllowed extends MethodNotAllowed_base {
}
declare const NotAcceptable_base: HttpApiSchema.EmptyErrorClass<NotAcceptable, "NotAcceptable">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class NotAcceptable extends NotAcceptable_base {
}
declare const RequestTimeout_base: HttpApiSchema.EmptyErrorClass<RequestTimeout, "RequestTimeout">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class RequestTimeout extends RequestTimeout_base {
}
declare const Conflict_base: HttpApiSchema.EmptyErrorClass<Conflict, "Conflict">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class Conflict extends Conflict_base {
}
declare const Gone_base: HttpApiSchema.EmptyErrorClass<Gone, "Gone">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class Gone extends Gone_base {
}
declare const InternalServerError_base: HttpApiSchema.EmptyErrorClass<InternalServerError, "InternalServerError">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class InternalServerError extends InternalServerError_base {
}
declare const NotImplemented_base: HttpApiSchema.EmptyErrorClass<NotImplemented, "NotImplemented">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class NotImplemented extends NotImplemented_base {
}
declare const ServiceUnavailable_base: HttpApiSchema.EmptyErrorClass<ServiceUnavailable, "ServiceUnavailable">;
/**
 * @since 1.0.0
 * @category empty errors
 */
export declare class ServiceUnavailable extends ServiceUnavailable_base {
}
export {};
//# sourceMappingURL=HttpApiError.d.ts.map