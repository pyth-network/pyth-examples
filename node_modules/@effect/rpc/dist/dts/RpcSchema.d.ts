import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AST from "effect/SchemaAST";
import * as Stream_ from "effect/Stream";
/**
 * @since 1.0.0
 * @category Stream
 */
export declare const StreamSchemaId: unique symbol;
/**
 * @since 1.0.0
 * @category Stream
 */
export declare const isStreamSchema: (schema: Schema.Schema.All) => schema is Stream<any, any>;
/**
 * @since 1.0.0
 * @category Stream
 */
export declare const isStreamSerializable: (schema: Schema.WithResult.Any) => boolean;
/**
 * @since 1.0.0
 * @category Stream
 */
export declare const getStreamSchemas: (ast: AST.AST) => Option.Option<{
    readonly success: Schema.Schema.Any;
    readonly failure: Schema.Schema.All;
}>;
/**
 * @since 1.0.0
 * @category Stream
 */
export interface Stream<A extends Schema.Schema.Any, E extends Schema.Schema.All> extends Schema.Schema<Stream_.Stream<A["Type"], E["Type"]>, Stream_.Stream<A["Encoded"], E["Encoded"]>, A["Context"] | E["Context"]> {
    readonly success: A;
    readonly failure: E;
}
/**
 * @since 1.0.0
 * @category Stream
 */
export declare const Stream: <A extends Schema.Schema.Any, E extends Schema.Schema.All>({ failure, success }: {
    readonly failure: E;
    readonly success: A;
}) => Stream<A, E>;
//# sourceMappingURL=RpcSchema.d.ts.map