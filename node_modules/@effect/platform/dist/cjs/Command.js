"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.workingDirectory = exports.string = exports.streamLines = exports.stream = exports.stdout = exports.stdin = exports.stderr = exports.start = exports.runInShell = exports.pipeTo = exports.make = exports.lines = exports.isCommand = exports.flatten = exports.feed = exports.exitCode = exports.env = exports.CommandTypeId = void 0;
var internal = _interopRequireWildcard(require("./internal/command.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */
const CommandTypeId = exports.CommandTypeId = internal.CommandTypeId;
/**
 * Returns `true` if the specified value is a `Command`, otherwise returns
 * `false`.
 *
 * @since 1.0.0
 * @category refinements
 */
const isCommand = exports.isCommand = internal.isCommand;
/**
 * Specify the environment variables that will be used when running this command.
 *
 * @since 1.0.0
 * @category combinators
 */
const env = exports.env = internal.env;
/**
 * Returns the exit code of the command after the process has completed
 * execution.
 *
 * @since 1.0.0
 * @category execution
 */
const exitCode = exports.exitCode = internal.exitCode;
/**
 * Feed a string to standard input (default encoding of UTF-8).
 *
 * @since 1.0.0
 * @category combinators
 */
const feed = exports.feed = internal.feed;
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
const flatten = exports.flatten = internal.flatten;
/**
 * Runs the command returning the output as an array of lines with the specified
 * encoding.
 *
 * @since 1.0.0
 * @category execution
 */
const lines = exports.lines = internal.lines;
/**
 * Create a command with the specified process name and an optional list of
 * arguments.
 *
 * @since 1.0.0
 * @category constructors
 */
const make = exports.make = internal.make;
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
const pipeTo = exports.pipeTo = internal.pipeTo;
/**
 * Allows for specifying whether or not a `Command` should be run inside a
 * shell.
 *
 * @since 1.0.0
 * @category combinators
 */
const runInShell = exports.runInShell = internal.runInShell;
/**
 * Start running the command and return a handle to the running process.
 *
 * @since 1.0.0
 * @category execution
 */
const start = exports.start = internal.start;
/**
 * Start running the command and return the output as a `Stream`.
 *
 * @since 1.0.0
 * @category execution
 */
const stream = exports.stream = internal.stream;
/**
 * Runs the command returning the output as an stream of lines with the
 * specified encoding.
 *
 * @since 1.0.0
 * @category execution
 */
const streamLines = exports.streamLines = internal.streamLines;
/**
 * Runs the command returning the entire output as a string with the
 * specified encoding.
 *
 * If an encoding is not specified, the encoding will default to `utf-8`.
 *
 * @since 1.0.0
 * @category execution
 */
const string = exports.string = internal.string;
/**
 * Specify the standard error stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
const stderr = exports.stderr = internal.stderr;
/**
 * Specify the standard input stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
const stdin = exports.stdin = internal.stdin;
/**
 * Specify the standard output stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
const stdout = exports.stdout = internal.stdout;
/**
 * Set the working directory that will be used when this command will be run.
 *
 * For piped commands, the working directory of each command will be set to the
 * specified working directory.
 *
 * @since 1.0.0
 * @category combinators
 */
const workingDirectory = exports.workingDirectory = internal.workingDirectory;
//# sourceMappingURL=Command.js.map