import type { Terminal, UserInput } from "@effect/platform/Terminal";
import type { Effect } from "effect/Effect";
import type { Layer } from "effect/Layer";
import type { Scope } from "effect/Scope";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: (shouldQuit?: (input: UserInput) => boolean) => Effect<Terminal, never, Scope>;
/**
 * @since 1.0.0
 * @category layer
 */
export declare const layer: Layer<Terminal>;
//# sourceMappingURL=NodeTerminal.d.ts.map