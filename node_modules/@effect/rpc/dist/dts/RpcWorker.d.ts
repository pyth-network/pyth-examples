import type { NoSuchElementException } from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { ParseError } from "effect/ParseResult";
import * as Schema from "effect/Schema";
import type { Protocol } from "./RpcServer.js";
declare const InitialMessage_base: Context.TagClass<InitialMessage, "@effect/rpc/RpcWorker/InitialMessage", Effect.Effect<readonly [data: unknown, transfers: readonly Transferable[]], never, never>>;
/**
 * @since 1.0.0
 * @category initial message
 */
export declare class InitialMessage extends InitialMessage_base {
}
/**
 * @since 1.0.0
 * @category initial message
 */
export declare namespace InitialMessage {
    /**
     * @since 1.0.0
     * @category initial message
     */
    interface Encoded {
        readonly _tag: "InitialMessage";
        readonly value: unknown;
    }
}
/**
 * @since 1.0.0
 * @category initial message
 */
export declare const makeInitialMessage: <A, I, R, E, R2>(schema: Schema.Schema<A, I, R>, effect: Effect.Effect<A, E, R2>) => Effect.Effect<readonly [data: unknown, transferables: ReadonlyArray<globalThis.Transferable>], E | ParseError, R | R2>;
/**
 * @since 1.0.0
 * @category initial message
 */
export declare const layerInitialMessage: <A, I, R, R2>(schema: Schema.Schema<A, I, R>, build: Effect.Effect<A, never, R2>) => Layer.Layer<InitialMessage, never, R | R2>;
/**
 * @since 1.0.0
 * @category initial message
 */
export declare const initialMessage: <A, I, R>(schema: Schema.Schema<A, I, R>) => Effect.Effect<A, NoSuchElementException | ParseError, Protocol | R>;
export {};
//# sourceMappingURL=RpcWorker.d.ts.map