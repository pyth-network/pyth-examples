import * as Effect from "effect/Effect";
/** @internal */
export const withRun = () => f => Effect.suspend(() => {
  const semaphore = Effect.unsafeMakeSemaphore(1);
  let buffer = [];
  let write = (...args) => Effect.contextWith(context => {
    buffer.push([args, context]);
  });
  return Effect.map(f((...args) => write(...args)), a => ({
    ...a,
    run(f) {
      return semaphore.withPermits(1)(Effect.gen(function* () {
        const prev = write;
        write = f;
        for (const [args, context] of buffer) {
          yield* Effect.provide(write(...args), context);
        }
        buffer = [];
        return yield* Effect.onExit(Effect.never, () => {
          write = prev;
          return Effect.void;
        });
      }));
    }
  }));
});
//# sourceMappingURL=utils.js.map