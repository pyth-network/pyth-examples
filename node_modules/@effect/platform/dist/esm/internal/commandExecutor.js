import * as Brand from "effect/Brand";
import * as Chunk from "effect/Chunk";
import { GenericTag } from "effect/Context";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/platform/CommandExecutor");
/** @internal */
export const ProcessTypeId = /*#__PURE__*/Symbol.for("@effect/platform/Process");
/** @internal */
export const ExitCode = /*#__PURE__*/Brand.nominal();
/** @internal */
export const ProcessId = /*#__PURE__*/Brand.nominal();
/** @internal */
export const CommandExecutor = /*#__PURE__*/GenericTag("@effect/platform/CommandExecutor");
/** @internal */
export const makeExecutor = start => {
  const stream = command => Stream.unwrapScoped(Effect.map(start(command), process => process.stdout));
  const streamLines = (command, encoding) => {
    const decoder = new TextDecoder(encoding);
    return Stream.splitLines(Stream.mapChunks(stream(command), Chunk.map(bytes => decoder.decode(bytes))));
  };
  return {
    [TypeId]: TypeId,
    start,
    exitCode: command => Effect.scoped(Effect.flatMap(start(command), process => process.exitCode)),
    stream,
    string: (command, encoding = "utf-8") => {
      const decoder = new TextDecoder(encoding);
      return pipe(start(command), Effect.flatMap(process => Stream.run(process.stdout, collectUint8Array)), Effect.map(bytes => decoder.decode(bytes)), Effect.scoped);
    },
    lines: (command, encoding = "utf-8") => {
      return pipe(streamLines(command, encoding), Stream.runCollect, Effect.map(Chunk.toArray));
    },
    streamLines
  };
};
const collectUint8Array = /*#__PURE__*/Sink.foldLeftChunks(/*#__PURE__*/new Uint8Array(), (bytes, chunk) => Chunk.reduce(chunk, bytes, (acc, curr) => {
  const newArray = new Uint8Array(acc.length + curr.length);
  newArray.set(acc);
  newArray.set(curr, acc.length);
  return newArray;
}));
//# sourceMappingURL=commandExecutor.js.map