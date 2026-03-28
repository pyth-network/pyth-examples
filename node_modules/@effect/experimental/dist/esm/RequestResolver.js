/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as Fiber from "effect/Fiber";
import { dual, pipe } from "effect/Function";
import * as Option from "effect/Option";
import * as Request from "effect/Request";
import * as RequestResolver from "effect/RequestResolver";
import * as Runtime from "effect/Runtime";
import * as Scope from "effect/Scope";
import * as Persistence from "./Persistence.js";
/**
 * @since 1.0.0
 * @category combinators
 */
export const dataLoader = /*#__PURE__*/dual(2, /*#__PURE__*/Effect.fnUntraced(function* (self, options) {
  const maxSize = options.maxBatchSize ?? Infinity;
  const scope = yield* Effect.scope;
  const runtime = yield* Effect.runtime().pipe(Effect.interruptible);
  const runFork = Runtime.runFork(runtime);
  let batch = new Set();
  const process = items => Effect.withRequestCaching(Effect.forEach(items, ({
    request,
    resume
  }) => Effect.request(request, self).pipe(Effect.exit, Effect.map(resume)), {
    batching: true,
    discard: true
  }), false);
  const delayedProcess = Effect.sleep(options.window).pipe(Effect.flatMap(() => {
    const currentBatch = batch;
    batch = new Set();
    fiber = undefined;
    return process(currentBatch);
  }));
  let fiber;
  yield* Scope.addFinalizer(scope, Effect.suspend(() => fiber ? Fiber.interrupt(fiber) : Effect.void));
  return RequestResolver.fromEffect(request => Effect.async(resume => {
    const item = {
      request,
      resume
    };
    batch.add(item);
    if (batch.size >= maxSize) {
      const currentBatch = batch;
      batch = new Set();
      if (fiber) {
        const parent = Option.getOrThrow(Fiber.getCurrentFiber());
        fiber.unsafeInterruptAsFork(parent.id());
        fiber = undefined;
      }
      runFork(process(currentBatch));
    } else if (!fiber) {
      fiber = runFork(delayedProcess);
    }
    return Effect.sync(() => {
      batch.delete(item);
    });
  }));
}));
/**
 * @since 1.0.0
 * @category combinators
 */
export const persisted = /*#__PURE__*/dual(2, (self, options) => Effect.gen(function* () {
  const storage = yield* (yield* Persistence.ResultPersistence).make({
    storeId: options.storeId,
    timeToLive: options.timeToLive
  });
  const partition = requests => storage.getMany(requests).pipe(Effect.map(Arr.partitionMap((_, i) => Option.match(_, {
    onNone: () => Either.left(requests[i]),
    onSome: _ => Either.right([requests[i], _])
  }))), Effect.orElseSucceed(() => [requests, []]));
  const set = (request, result) => Effect.ignoreLogged(storage.set(request, result));
  return RequestResolver.makeBatched(requests => Effect.flatMap(partition(requests), ([remaining, results]) => {
    const completeCached = Effect.forEach(results, ([request, result]) => Request.complete(request, result), {
      discard: true
    });
    const completeUncached = pipe(Effect.forEach(remaining, request => Effect.exit(Effect.request(request, self)), {
      batching: true
    }), Effect.flatMap(results => Effect.forEach(results, (result, i) => {
      const request = remaining[i];
      return Effect.zipRight(set(request, result), Request.complete(request, result));
    }, {
      discard: true
    })), Effect.withRequestCaching(false));
    return Effect.zipRight(completeCached, completeUncached);
  }));
}));
//# sourceMappingURL=RequestResolver.js.map