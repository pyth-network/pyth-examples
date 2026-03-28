import * as Effect from "effect/Effect";
/** @internal */
export const effectify = (fn, onError, onSyncError) => (...args) => Effect.async(resume => {
  try {
    fn(...args, (err, result) => {
      if (err) {
        resume(Effect.fail(onError ? onError(err, args) : err));
      } else {
        resume(Effect.succeed(result));
      }
    });
  } catch (err) {
    resume(onSyncError ? Effect.fail(onSyncError(err, args)) : Effect.die(err));
  }
});
//# sourceMappingURL=effectify.js.map