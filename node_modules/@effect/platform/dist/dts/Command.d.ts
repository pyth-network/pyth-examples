/**
 * @since 1.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array";
import type { Effect } from "effect/Effect";
import type { HashMap } from "effect/HashMap";
import type { Inspectable } from "effect/Inspectable";
import type { Option } from "effect/Option";
import type { Pipeable } from "effect/Pipeable";
import type { Scope } from "effect/Scope";
import type { Sink } from "effect/Sink";
import type { Stream } from "effect/Stream";
import type { CommandExecutor, ExitCode, Process } from "./CommandExecutor.js";
import type { PlatformError } from "./Error.js";
/**
 * @since 1.0.0
 */
export declare const CommandTypeId: unique symbol;
/**
 * @since 1.0.0
 */
export type CommandTypeId = typeof CommandTypeId;
/**
 * @since 1.0.0
 * @category models
 */
export type Command = StandardCommand | PipedCommand;
/**
 * @since 1.0.0
 */
export declare namespace Command {
    /**
     * @since 1.0.0
     * @category models
     */
    interface Proto extends Pipeable, Inspectable {
        readonly [CommandTypeId]: CommandTypeId;
        readonly _tag: string;
    }
    /**
     * Configures the pipe that is established between the parent and child
     * processes' `stdin` stream.
     *
     * @since 1.0.0
     * @category models
     */
    type Input = CommandInput;
    /**
     * Configures the pipes that are established between the parent and child
     * processes `stderr` and `stdout` streams.
     *
     * @since 1.0.0
     * @category models
     */
    type Output = CommandOutput;
}
/**
 * Configures the pipe that is established between the parent and child
 * processes' `stdin` stream.
 *
 * Defaults to "pipe"
 *
 * @since 1.0.0
 * @category models
 */
export type CommandInput = "inherit" | "pipe" | Stream<Uint8Array, PlatformError>;
/**
 * Configures the pipes that are established between the parent and child
 * processes `stderr` and `stdout` streams.
 *
 * Defaults to "pipe"
 *
 * @since 1.0.0
 * @category models
 */
export type CommandOutput = "inherit" | "pipe" | Sink<Uint8Array, Uint8Array>;
/**
 * @since 1.0.0
 * @category models
 */
export interface StandardCommand extends Command.Proto {
    readonly _tag: "StandardCommand";
    readonly command: string;
    readonly args: ReadonlyArray<string>;
    readonly env: HashMap<string, string>;
    readonly cwd: Option<string>;
    readonly shell: boolean | string;
    readonly stdin: Command.Input;
    readonly stdout: Command.Output;
    readonly stderr: Command.Output;
    readonly gid: Option<number>;
    readonly uid: Option<number>;
}
/**
 * @since 1.0.0
 * @category models
 */
export interface PipedCommand extends Command.Proto {
    readonly _tag: "PipedCommand";
    readonly left: Command;
    readonly right: Command;
}
/**
 * Returns `true` if the specified value is a `Command`, otherwise returns
 * `false`.
 *
 * @since 1.0.0
 * @category refinements
 */
export declare const isCommand: (u: unknown) => u is Command;
/**
 * Specify the environment variables that will be used when running this command.
 *
 * @since 1.0.0
 * @category combinators
 */
export declare const env: {
    /**
     * Specify the environment variables that will be used when running this command.
     *
     * @since 1.0.0
     * @category combinators
     */
    (environment: Record<string, string | undefined>): (self: Command) => Command;
    /**
     * Specify the environment variables that will be used when running this command.
     *
     * @since 1.0.0
     * @category combinators
     */
    (self: Command, environment: Record<string, string | undefined>): Command;
};
/**
 * Returns the exit code of the command after the process has completed
 * execution.
 *
 * @since 1.0.0
 * @category execution
 */
export declare const exitCode: (self: Command) => Effect<ExitCode, PlatformError, CommandExecutor>;
/**
 * Feed a string to standard input (default encoding of UTF-8).
 *
 * @since 1.0.0
 * @category combinators
 */
export declare const feed: {
    /**
     * Feed a string to standard input (default encoding of UTF-8).
     *
     * @since 1.0.0
     * @category combinators
     */
    (input: string): (self: Command) => Command;
    /**
     * Feed a string to standard input (default encoding of UTF-8).
     *
     * @since 1.0.0
     * @category combinators
     */
    (self: Command, input: string): Command;
};
/**
 * Flatten this command to a non-empty array of standard commands.
 *
 * For a `StandardCommand`, this simply returns a `1` element array
 * For a `PipedCommand`, all commands in the pipe will be extracted out into
 * a array from left to right
 *
 * @since 1.0.0
 * @category combinators
 */
export declare const flatten: (self: Command) => NonEmptyReadonlyArray<StandardCommand>;
/**
 * Runs the command returning the output as an array of lines with the specified
 * encoding.
 *
 * @since 1.0.0
 * @category execution
 */
export declare const lines: (command: Command, encoding?: string) => Effect<Array<string>, PlatformError, CommandExecutor>;
/**
 * Create a command with the specified process name and an optional list of
 * arguments.
 *
 * @since 1.0.0
 * @category constructors
 */
export declare const make: (command: string, ...args: Array<string>) => Command;
/**
 * Pipe one command to another command from left to right.
 *
 * Conceptually, the equivalent of piping one shell command to another:
 *
 * ```sh
 * command1 | command2
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export declare const pipeTo: {
    /**
     * Pipe one command to another command from left to right.
     *
     * Conceptually, the equivalent of piping one shell command to another:
     *
     * ```sh
     * command1 | command2
     * ```
     *
     * @since 1.0.0
     * @category combinators
     */
    (into: Command): (self: Command) => Command;
    /**
     * Pipe one command to another command from left to right.
     *
     * Conceptually, the equivalent of piping one shell command to another:
     *
     * ```sh
     * command1 | command2
     * ```
     *
     * @since 1.0.0
     * @category combinators
     */
    (self: Command, into: Command): Command;
};
/**
 * Allows for specifying whether or not a `Command` should be run inside a
 * shell.
 *
 * @since 1.0.0
 * @category combinators
 */
export declare const runInShell: {
    /**
     * Allows for specifying whether or not a `Command` should be run inside a
     * shell.
     *
     * @since 1.0.0
     * @category combinators
     */
    (shell: string | boolean): (self: Command) => Command;
    /**
     * Allows for specifying whether or not a `Command` should be run inside a
     * shell.
     *
     * @since 1.0.0
     * @category combinators
     */
    (self: Command, shell: string | boolean): Command;
};
/**
 * Start running the command and return a handle to the running process.
 *
 * @since 1.0.0
 * @category execution
 */
export declare const start: (command: Command) => Effect<Process, PlatformError, CommandExecutor | Scope>;
/**
 * Start running the command and return the output as a `Stream`.
 *
 * @since 1.0.0
 * @category execution
 */
export declare const stream: (command: Command) => Stream<Uint8Array, PlatformError, CommandExecutor>;
/**
 * Runs the command returning the output as an stream of lines with the
 * specified encoding.
 *
 * @since 1.0.0
 * @category execution
 */
export declare const streamLines: (command: Command, encoding?: string) => Stream<string, PlatformError, CommandExecutor>;
/**
 * Runs the command returning the entire output as a string with the
 * specified encoding.
 *
 * If an encoding is not specified, the encoding will default to `utf-8`.
 *
 * @since 1.0.0
 * @category execution
 */
export declare const string: {
    /**
     * Runs the command returning the entire output as a string with the
     * specified encoding.
     *
     * If an encoding is not specified, the encoding will default to `utf-8`.
     *
     * @since 1.0.0
     * @category execution
     */
    (encoding?: string): (command: Command) => Effect<string, PlatformError, CommandExecutor>;
    /**
     * Runs the command returning the entire output as a string with the
     * specified encoding.
     *
     * If an encoding is not specified, the encoding will default to `utf-8`.
     *
     * @since 1.0.0
     * @category execution
     */
    (command: Command, encoding?: string): Effect<string, PlatformError, CommandExecutor>;
};
/**
 * Specify the standard error stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
export declare const stderr: {
    /**
     * Specify the standard error stream for a command.
     *
     * @since 1.0.0
     * @category combinators
     */
    (stderr: Command.Output): (self: Command) => Command;
    /**
     * Specify the standard error stream for a command.
     *
     * @since 1.0.0
     * @category combinators
     */
    (self: Command, stderr: Command.Output): Command;
};
/**
 * Specify the standard input stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
export declare const stdin: {
    /**
     * Specify the standard input stream for a command.
     *
     * @since 1.0.0
     * @category combinators
     */
    (stdin: Command.Input): (self: Command) => Command;
    /**
     * Specify the standard input stream for a command.
     *
     * @since 1.0.0
     * @category combinators
     */
    (self: Command, stdin: Command.Input): Command;
};
/**
 * Specify the standard output stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
export declare const stdout: {
    /**
     * Specify the standard output stream for a command.
     *
     * @since 1.0.0
     * @category combinators
     */
    (stdout: Command.Output): (self: Command) => Command;
    /**
     * Specify the standard output stream for a command.
     *
     * @since 1.0.0
     * @category combinators
     */
    (self: Command, stdout: Command.Output): Command;
};
/**
 * Set the working directory that will be used when this command will be run.
 *
 * For piped commands, the working directory of each command will be set to the
 * specified working directory.
 *
 * @since 1.0.0
 * @category combinators
 */
export declare const workingDirectory: {
    /**
     * Set the working directory that will be used when this command will be run.
     *
     * For piped commands, the working directory of each command will be set to the
     * specified working directory.
     *
     * @since 1.0.0
     * @category combinators
     */
    (cwd: string): (self: Command) => Command;
    /**
     * Set the working directory that will be used when this command will be run.
     *
     * For piped commands, the working directory of each command will be set to the
     * specified working directory.
     *
     * @since 1.0.0
     * @category combinators
     */
    (self: Command, cwd: string): Command;
};
//# sourceMappingURL=Command.d.ts.map