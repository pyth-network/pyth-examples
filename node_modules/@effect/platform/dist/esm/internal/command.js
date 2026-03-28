import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import { dual } from "effect/Function";
import * as HashMap from "effect/HashMap";
import * as Inspectable from "effect/Inspectable";
import * as Option from "effect/Option";
import { pipeArguments } from "effect/Pipeable";
import * as Stream from "effect/Stream";
import * as commandExecutor from "./commandExecutor.js";
/** @internal */
export const CommandTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Command");
/** @internal */
export const isCommand = u => typeof u === "object" && u != null && CommandTypeId in u;
/** @internal */
export const env = /*#__PURE__*/dual(2, (self, environment) => {
  switch (self._tag) {
    case "StandardCommand":
      {
        return makeStandard({
          ...self,
          env: HashMap.union(self.env, HashMap.fromIterable(Object.entries(environment).filter(([v]) => v !== undefined)))
        });
      }
    case "PipedCommand":
      {
        return pipeTo(env(self.left, environment), env(self.right, environment));
      }
  }
});
/** @internal */
export const exitCode = self => Effect.flatMap(commandExecutor.CommandExecutor, executor => executor.exitCode(self));
/** @internal */
export const feed = /*#__PURE__*/dual(2, (self, input) => stdin(self, Stream.fromChunk(Chunk.of(new TextEncoder().encode(input)))));
/** @internal */
export const flatten = self => Array.from(flattenLoop(self));
/** @internal */
const flattenLoop = self => {
  switch (self._tag) {
    case "StandardCommand":
      {
        return Chunk.of(self);
      }
    case "PipedCommand":
      {
        return Chunk.appendAll(flattenLoop(self.left), flattenLoop(self.right));
      }
  }
};
/** @internal */
export const runInShell = /*#__PURE__*/dual(2, (self, shell) => {
  switch (self._tag) {
    case "StandardCommand":
      {
        return makeStandard({
          ...self,
          shell
        });
      }
    case "PipedCommand":
      {
        return pipeTo(runInShell(self.left, shell), runInShell(self.right, shell));
      }
  }
});
/** @internal */
export const lines = (command, encoding = "utf-8") => Effect.flatMap(commandExecutor.CommandExecutor, executor => executor.lines(command, encoding));
const Proto = {
  [CommandTypeId]: CommandTypeId,
  pipe() {
    return pipeArguments(this, arguments);
  },
  ...Inspectable.BaseProto
};
const StandardProto = {
  ...Proto,
  _tag: "StandardCommand",
  toJSON() {
    return {
      _id: "@effect/platform/Command",
      _tag: this._tag,
      command: this.command,
      args: this.args,
      env: Object.fromEntries(this.env),
      cwd: this.cwd.toJSON(),
      shell: this.shell,
      gid: this.gid.toJSON(),
      uid: this.uid.toJSON()
    };
  }
};
const makeStandard = options => Object.assign(Object.create(StandardProto), options);
const PipedProto = {
  ...Proto,
  _tag: "PipedCommand",
  toJSON() {
    return {
      _id: "@effect/platform/Command",
      _tag: this._tag,
      left: this.left.toJSON(),
      right: this.right.toJSON()
    };
  }
};
const makePiped = options => Object.assign(Object.create(PipedProto), options);
/** @internal */
export const make = (command, ...args) => makeStandard({
  command,
  args,
  env: HashMap.empty(),
  cwd: Option.none(),
  shell: false,
  stdin: "pipe",
  stdout: "pipe",
  stderr: "pipe",
  gid: Option.none(),
  uid: Option.none()
});
/** @internal */
export const pipeTo = /*#__PURE__*/dual(2, (self, into) => makePiped({
  left: self,
  right: into
}));
/** @internal */
export const stderr = /*#__PURE__*/dual(2, (self, output) => {
  switch (self._tag) {
    case "StandardCommand":
      {
        return makeStandard({
          ...self,
          stderr: output
        });
      }
    // For piped commands it only makes sense to provide `stderr` for the
    // right-most command as the rest will be piped in.
    case "PipedCommand":
      {
        return makePiped({
          ...self,
          right: stderr(self.right, output)
        });
      }
  }
});
/** @internal */
export const stdin = /*#__PURE__*/dual(2, (self, input) => {
  switch (self._tag) {
    case "StandardCommand":
      {
        return makeStandard({
          ...self,
          stdin: input
        });
      }
    // For piped commands it only makes sense to provide `stdin` for the
    // left-most command as the rest will be piped in.
    case "PipedCommand":
      {
        return makePiped({
          ...self,
          left: stdin(self.left, input)
        });
      }
  }
});
/** @internal */
export const stdout = /*#__PURE__*/dual(2, (self, output) => {
  switch (self._tag) {
    case "StandardCommand":
      {
        return makeStandard({
          ...self,
          stdout: output
        });
      }
    // For piped commands it only makes sense to provide `stderr` for the
    // right-most command as the rest will be piped in.
    case "PipedCommand":
      {
        return makePiped({
          ...self,
          right: stdout(self.right, output)
        });
      }
  }
});
/** @internal */
export const start = command => Effect.flatMap(commandExecutor.CommandExecutor, executor => executor.start(command));
/** @internal */
export const stream = command => Stream.flatMap(commandExecutor.CommandExecutor, executor => executor.stream(command));
/** @internal */
export const streamLines = (command, encoding) => Stream.flatMap(commandExecutor.CommandExecutor, executor => executor.streamLines(command, encoding));
/** @internal */
export const string = /*#__PURE__*/dual(args => isCommand(args[0]), (command, encoding) => Effect.flatMap(commandExecutor.CommandExecutor, executor => executor.string(command, encoding)));
/** @internal */
export const workingDirectory = /*#__PURE__*/dual(2, (self, cwd) => {
  switch (self._tag) {
    case "StandardCommand":
      {
        return makeStandard({
          ...self,
          cwd: Option.some(cwd)
        });
      }
    case "PipedCommand":
      {
        return pipeTo(workingDirectory(self.left, cwd), workingDirectory(self.right, cwd));
      }
  }
});
//# sourceMappingURL=command.js.map