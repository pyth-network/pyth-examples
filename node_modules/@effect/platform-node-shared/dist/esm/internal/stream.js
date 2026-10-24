import { SystemError } from "@effect/platform/Error";
import * as Cause from "effect/Cause";
import * as Channel from "effect/Channel";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import { dual } from "effect/Function";
import * as MutableRef from "effect/MutableRef";
import * as Runtime from "effect/Runtime";
import * as Stream from "effect/Stream";
import { Readable } from "node:stream";
/** @internal */
export const fromReadable = (evaluate, onError, options) => Stream.fromChannel(fromReadableChannel(evaluate, onError, options));
/** @internal */
export const toString = (readable, options) => {
  const maxBytesNumber = options.maxBytes ? Number(options.maxBytes) : undefined;
  return Effect.acquireUseRelease(Effect.sync(() => {
    const stream = readable();
    stream.setEncoding(options.encoding ?? "utf8");
    return stream;
  }), stream => Effect.async(resume => {
    let string = "";
    let bytes = 0;
    stream.once("error", err => {
      resume(Effect.fail(options.onFailure(err)));
    });
    stream.once("end", () => {
      resume(Effect.succeed(string));
    });
    stream.on("data", chunk => {
      string += chunk;
      bytes += Buffer.byteLength(chunk);
      if (maxBytesNumber && bytes > maxBytesNumber) {
        resume(Effect.fail(options.onFailure(new Error("maxBytes exceeded"))));
      }
    });
  }), stream => Effect.sync(() => {
    if ("closed" in stream && !stream.closed) {
      stream.destroy();
    }
  }));
};
/** @internal */
export const toUint8Array = (readable, options) => {
  const maxBytesNumber = options.maxBytes ? Number(options.maxBytes) : undefined;
  return Effect.acquireUseRelease(Effect.sync(readable), stream => Effect.async(resume => {
    let buffer = Buffer.alloc(0);
    let bytes = 0;
    stream.once("error", err => {
      resume(Effect.fail(options.onFailure(err)));
    });
    stream.once("end", () => {
      resume(Effect.succeed(buffer));
    });
    stream.on("data", chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      bytes += chunk.length;
      if (maxBytesNumber && bytes > maxBytesNumber) {
        resume(Effect.fail(options.onFailure(new Error("maxBytes exceeded"))));
      }
    });
  }), stream => Effect.sync(() => {
    if ("closed" in stream && !stream.closed) {
      stream.destroy();
    }
  }));
};
/** @internal */
export const fromDuplex = (evaluate, onError, options) => Channel.suspend(() => {
  const duplex = evaluate();
  if (!duplex.readable) {
    return Channel.void;
  }
  const exit = MutableRef.make(undefined);
  return Channel.embedInput(unsafeReadableRead(duplex, onError, exit, options), writeInput(duplex, cause => Effect.sync(() => MutableRef.set(exit, Exit.failCause(cause))), options));
});
/** @internal */
export const pipeThroughDuplex = /*#__PURE__*/dual(args => Stream.StreamTypeId in args[0], (self, duplex, onError, options) => Stream.pipeThroughChannelOrFail(self, fromDuplex(duplex, onError, options)));
/** @internal */
export const pipeThroughSimple = /*#__PURE__*/dual(2, (self, duplex) => Stream.pipeThroughChannelOrFail(self, fromDuplex(duplex, cause => new SystemError({
  module: "Stream",
  method: "pipeThroughSimple",
  reason: "Unknown",
  cause
}))));
/** @internal */
export const fromReadableChannel = (evaluate, onError, options) => Channel.suspend(() => unsafeReadableRead(evaluate(), onError, MutableRef.make(undefined), options));
/** @internal */
export const writeInput = (writable, onFailure, {
  encoding,
  endOnDone = true
} = {}, onDone = Effect.void) => {
  const write = writeEffect(writable, encoding);
  const close = endOnDone ? Effect.async(resume => {
    if ("closed" in writable && writable.closed) {
      resume(Effect.void);
    } else {
      writable.once("finish", () => resume(Effect.void));
      writable.end();
    }
  }) : Effect.void;
  return {
    awaitRead: () => Effect.void,
    emit: write,
    error: cause => Effect.zipRight(close, onFailure(cause)),
    done: _ => Effect.zipRight(close, onDone)
  };
};
/** @internal */
export const writeEffect = (writable, encoding) => chunk => chunk.length === 0 ? Effect.void : Effect.async(resume => {
  const iterator = chunk[Symbol.iterator]();
  let next = iterator.next();
  function loop() {
    const item = next;
    next = iterator.next();
    const success = writable.write(item.value, encoding);
    if (next.done) {
      resume(Effect.void);
    } else if (success) {
      loop();
    } else {
      writable.once("drain", loop);
    }
  }
  loop();
});
const unsafeReadableRead = (readable, onError, exit, options) => {
  if (!readable.readable) {
    return Channel.void;
  }
  const latch = Effect.unsafeMakeLatch(false);
  function onReadable() {
    latch.unsafeOpen();
  }
  function onErr(err) {
    exit.current = Exit.fail(onError(err));
    latch.unsafeOpen();
  }
  function onEnd() {
    exit.current = Exit.void;
    latch.unsafeOpen();
  }
  readable.on("readable", onReadable);
  readable.on("error", onErr);
  readable.on("end", onEnd);
  const chunkSize = options?.chunkSize ? Number(options.chunkSize) : undefined;
  const read = Channel.suspend(function loop() {
    let item = readable.read(chunkSize);
    if (item === null) {
      if (exit.current) {
        return Channel.fromEffect(exit.current);
      }
      latch.unsafeClose();
      return Channel.flatMap(latch.await, loop);
    }
    const arr = [item];
    while (true) {
      item = readable.read(chunkSize);
      if (item === null) {
        return Channel.flatMap(Channel.write(Chunk.unsafeFromArray(arr)), loop);
      }
      arr.push(item);
    }
  });
  return Channel.ensuring(read, Effect.sync(() => {
    readable.off("readable", onReadable);
    readable.off("error", onErr);
    readable.off("end", onEnd);
    if (options?.closeOnDone !== false && "closed" in readable && !readable.closed) {
      readable.destroy();
    }
  }));
};
class StreamAdapter extends Readable {
  readLatch;
  fiber = undefined;
  constructor(runtime, stream) {
    super({});
    this.readLatch = Effect.unsafeMakeLatch(false);
    this.fiber = Runtime.runFork(runtime)(this.readLatch.whenOpen(Stream.runForEachChunk(stream, chunk => this.readLatch.whenOpen(Effect.sync(() => {
      if (chunk.length === 0) return;
      this.readLatch.unsafeClose();
      for (const item of chunk) {
        if (typeof item === "string") {
          this.push(item, "utf8");
        } else {
          this.push(item);
        }
      }
    })))));
    this.fiber.addObserver(exit => {
      this.fiber = undefined;
      if (Exit.isSuccess(exit)) {
        this.push(null);
      } else {
        this.destroy(Cause.squash(exit.cause));
      }
    });
  }
  _read(_size) {
    this.readLatch.unsafeOpen();
  }
  _destroy(error, callback) {
    if (!this.fiber) {
      return callback(error);
    }
    Effect.runFork(Fiber.interrupt(this.fiber)).addObserver(exit => {
      callback(exit._tag === "Failure" ? Cause.squash(exit.cause) : error);
    });
  }
}
/** @internal */
export const toReadable = stream => Effect.map(Effect.runtime(), runtime => new StreamAdapter(runtime, stream));
/** @internal */
export const toReadableNever = stream => new StreamAdapter(Runtime.defaultRuntime, stream);
//# sourceMappingURL=stream.js.map