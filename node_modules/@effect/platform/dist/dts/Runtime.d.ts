import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type * as Fiber from "effect/Fiber";
/**
 * @category model
 * @since 1.0.0
 */
export interface Teardown {
    <E, A>(exit: Exit.Exit<E, A>, onExit: (code: number) => void): void;
}
/**
 * @category teardown
 * @since 1.0.0
 */
export declare const defaultTeardown: Teardown;
/**
 * @category model
 * @since 1.0.0
 */
export interface RunMain {
    /**
     * Helps you run a main effect with built-in error handling, logging, and signal management.
     *
     * **Details**
     *
     * This function launches an Effect as the main entry point, setting exit codes
     * based on success or failure, handling interrupts (e.g., Ctrl+C), and optionally
     * logging errors. By default, it logs errors and uses a "pretty" format, but both
     * behaviors can be turned off. You can also provide custom teardown logic to
     * finalize resources or produce different exit codes.
     *
     * **Options**
     *
     * An optional object that can include:
     * - `disableErrorReporting`: Turn off automatic error logging.
     * - `disablePrettyLogger`: Avoid adding the pretty logger.
     * - `teardown`: Provide custom finalization logic.
     *
     * **When to Use**
     *
     * Use this function to run an Effect as your application’s main program, especially
     * when you need structured error handling, log management, interrupt support,
     * or advanced teardown capabilities.
     */
    (options?: {
        readonly disableErrorReporting?: boolean | undefined;
        readonly disablePrettyLogger?: boolean | undefined;
        readonly teardown?: Teardown | undefined;
    }): <E, A>(effect: Effect.Effect<A, E>) => void;
    /**
     * Helps you run a main effect with built-in error handling, logging, and signal management.
     *
     * **Details**
     *
     * This function launches an Effect as the main entry point, setting exit codes
     * based on success or failure, handling interrupts (e.g., Ctrl+C), and optionally
     * logging errors. By default, it logs errors and uses a "pretty" format, but both
     * behaviors can be turned off. You can also provide custom teardown logic to
     * finalize resources or produce different exit codes.
     *
     * **Options**
     *
     * An optional object that can include:
     * - `disableErrorReporting`: Turn off automatic error logging.
     * - `disablePrettyLogger`: Avoid adding the pretty logger.
     * - `teardown`: Provide custom finalization logic.
     *
     * **When to Use**
     *
     * Use this function to run an Effect as your application’s main program, especially
     * when you need structured error handling, log management, interrupt support,
     * or advanced teardown capabilities.
     */
    <E, A>(effect: Effect.Effect<A, E>, options?: {
        readonly disableErrorReporting?: boolean | undefined;
        readonly disablePrettyLogger?: boolean | undefined;
        readonly teardown?: Teardown | undefined;
    }): void;
}
/**
 * @category constructors
 * @since 1.0.0
 */
export declare const makeRunMain: (f: <E, A>(options: {
    readonly fiber: Fiber.RuntimeFiber<A, E>;
    readonly teardown: Teardown;
}) => void) => RunMain;
//# sourceMappingURL=Runtime.d.ts.map