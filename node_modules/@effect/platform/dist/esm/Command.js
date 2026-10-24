import * as internal from "./internal/command.js";
/**
 * @since 1.0.0
 */
export const CommandTypeId = internal.CommandTypeId;
/**
 * Returns `true` if the specified value is a `Command`, otherwise returns
 * `false`.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isCommand = internal.isCommand;
/**
 * Specify the environment variables that will be used when running this command.
 *
 * @since 1.0.0
 * @category combinators
 */
export const env = internal.env;
/**
 * Returns the exit code of the command after the process has completed
 * execution.
 *
 * @since 1.0.0
 * @category execution
 */
export const exitCode = internal.exitCode;
/**
 * Feed a string to standard input (default encoding of UTF-8).
 *
 * @since 1.0.0
 * @category combinators
 */
export const feed = internal.feed;
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
export const flatten = internal.flatten;
/**
 * Runs the command returning the output as an array of lines with the specified
 * encoding.
 *
 * @since 1.0.0
 * @category execution
 */
export const lines = internal.lines;
/**
 * Create a command with the specified process name and an optional list of
 * arguments.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = internal.make;
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
export const pipeTo = internal.pipeTo;
/**
 * Allows for specifying whether or not a `Command` should be run inside a
 * shell.
 *
 * @since 1.0.0
 * @category combinators
 */
export const runInShell = internal.runInShell;
/**
 * Start running the command and return a handle to the running process.
 *
 * @since 1.0.0
 * @category execution
 */
export const start = internal.start;
/**
 * Start running the command and return the output as a `Stream`.
 *
 * @since 1.0.0
 * @category execution
 */
export const stream = internal.stream;
/**
 * Runs the command returning the output as an stream of lines with the
 * specified encoding.
 *
 * @since 1.0.0
 * @category execution
 */
export const streamLines = internal.streamLines;
/**
 * Runs the command returning the entire output as a string with the
 * specified encoding.
 *
 * If an encoding is not specified, the encoding will default to `utf-8`.
 *
 * @since 1.0.0
 * @category execution
 */
export const string = internal.string;
/**
 * Specify the standard error stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
export const stderr = internal.stderr;
/**
 * Specify the standard input stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
export const stdin = internal.stdin;
/**
 * Specify the standard output stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
export const stdout = internal.stdout;
/**
 * Set the working directory that will be used when this command will be run.
 *
 * For piped commands, the working directory of each command will be set to the
 * specified working directory.
 *
 * @since 1.0.0
 * @category combinators
 */
export const workingDirectory = internal.workingDirectory;
//# sourceMappingURL=Command.js.map