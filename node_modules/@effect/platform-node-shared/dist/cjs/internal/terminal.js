"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.layer = void 0;
var Error = _interopRequireWildcard(require("@effect/platform/Error"));
var Terminal = _interopRequireWildcard(require("@effect/platform/Terminal"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Exit = _interopRequireWildcard(require("effect/Exit"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Mailbox = _interopRequireWildcard(require("effect/Mailbox"));
var Option = _interopRequireWildcard(require("effect/Option"));
var RcRef = _interopRequireWildcard(require("effect/RcRef"));
var readline = _interopRequireWildcard(require("node:readline"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const defaultShouldQuit = input => input.key.ctrl && (input.key.name === "c" || input.key.name === "d");
/** @internal */
const make = exports.make = /*#__PURE__*/Effect.fnUntraced(function* (shouldQuit = defaultShouldQuit) {
  const stdin = process.stdin;
  const stdout = process.stdout;
  // Acquire readline interface with TTY setup/cleanup inside the scope
  const rlRef = yield* RcRef.make({
    acquire: Effect.acquireRelease(Effect.sync(() => {
      const rl = readline.createInterface({
        input: stdin,
        escapeCodeTimeout: 50
      });
      readline.emitKeypressEvents(stdin, rl);
      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }
      return rl;
    }), rl => Effect.sync(() => {
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      rl.close();
    }))
  });
  const columns = Effect.sync(() => stdout.columns ?? 0);
  const readInput = Effect.gen(function* () {
    yield* RcRef.get(rlRef);
    const mailbox = yield* Mailbox.make();
    const handleKeypress = (s, k) => {
      const userInput = {
        input: Option.fromNullable(s),
        key: {
          name: k.name ?? "",
          ctrl: !!k.ctrl,
          meta: !!k.meta,
          shift: !!k.shift
        }
      };
      mailbox.unsafeOffer(userInput);
      if (shouldQuit(userInput)) {
        mailbox.unsafeDone(Exit.void);
      }
    };
    yield* Effect.addFinalizer(() => Effect.sync(() => stdin.off("keypress", handleKeypress)));
    stdin.on("keypress", handleKeypress);
    return mailbox;
  });
  const readLine = RcRef.get(rlRef).pipe(Effect.flatMap(readlineInterface => Effect.async(resume => {
    const onLine = line => resume(Effect.succeed(line));
    readlineInterface.once("line", onLine);
    return Effect.sync(() => readlineInterface.off("line", onLine));
  })), Effect.scoped);
  const display = prompt => Effect.uninterruptible(Effect.async(resume => {
    stdout.write(prompt, err => err ? resume(Effect.fail(new Error.BadArgument({
      module: "Terminal",
      method: "display",
      description: "Failed to write prompt to stdout",
      cause: err
    }))) : resume(Effect.void));
  }));
  return Terminal.Terminal.of({
    columns,
    readInput,
    readLine,
    display
  });
});
/** @internal */
const layer = exports.layer = /*#__PURE__*/Layer.scoped(Terminal.Terminal, /*#__PURE__*/make(defaultShouldQuit));
//# sourceMappingURL=terminal.js.map