import * as Channel from "effect/Channel";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Sink from "effect/Sink";
import { writeInput } from "./stream.js";
/** @internal */
export const fromWritable = (evaluate, onError, options) => Sink.fromChannel(fromWritableChannel(evaluate, onError, options));
/** @internal */
export const fromWritableChannel = (writable, onError, options) => Channel.flatMap(Effect.zip(Effect.sync(() => writable()), Deferred.make()), ([writable, deferred]) => Channel.embedInput(writableOutput(writable, deferred, onError), writeInput(writable, cause => Deferred.failCause(deferred, cause), options, Deferred.complete(deferred, Effect.void))));
const writableOutput = (writable, deferred, onError) => Effect.suspend(() => {
  function handleError(err) {
    Deferred.unsafeDone(deferred, Effect.fail(onError(err)));
  }
  writable.on("error", handleError);
  return Effect.ensuring(Deferred.await(deferred), Effect.sync(() => {
    writable.removeListener("error", handleError);
  }));
});
//# sourceMappingURL=sink.js.map