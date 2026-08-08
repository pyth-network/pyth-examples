/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
/**
 * @since 1.0.0
 */
export declare const asyncPauseResume: <A, E = never, R = never>(register: (emit: {
    readonly single: (item: A) => void;
    readonly chunk: (chunk: Chunk.Chunk<A>) => void;
    readonly array: (chunk: ReadonlyArray<A>) => void;
    readonly fail: (error: E) => void;
    readonly end: () => void;
}) => {
    readonly onInterrupt: Effect.Effect<void, never, R>;
    readonly onPause: Effect.Effect<void>;
    readonly onResume: Effect.Effect<void>;
}, bufferSize?: number) => Stream.Stream<A, E, R>;
//# sourceMappingURL=SqlStream.d.ts.map