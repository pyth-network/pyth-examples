"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runMain = void 0;
var _Runtime = require("@effect/platform/Runtime");
var _Function = require("effect/Function");
/** @internal */
const runMain = exports.runMain = /*#__PURE__*/(0, _Runtime.makeRunMain)(({
  fiber,
  teardown
}) => {
  const keepAlive = setInterval(_Function.constVoid, 2 ** 31 - 1);
  let receivedSignal = false;
  fiber.addObserver(exit => {
    if (!receivedSignal) {
      process.removeListener("SIGINT", onSigint);
      process.removeListener("SIGTERM", onSigint);
    }
    clearInterval(keepAlive);
    teardown(exit, code => {
      if (receivedSignal || code !== 0) {
        process.exit(code);
      }
    });
  });
  function onSigint() {
    receivedSignal = true;
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGTERM", onSigint);
    fiber.unsafeInterruptAsFork(fiber.id());
  }
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigint);
});
//# sourceMappingURL=runtime.js.map