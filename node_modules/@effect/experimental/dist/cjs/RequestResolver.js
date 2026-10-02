"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.persisted = exports.dataLoader = void 0;
var Arr = _interopRequireWildcard(require("effect/Array"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Either = _interopRequireWildcard(require("effect/Either"));
var Fiber = _interopRequireWildcard(require("effect/Fiber"));
var _Function = require("effect/Function");
var Option = _interopRequireWildcard(require("effect/Option"));
var Request = _interopRequireWildcard(require("effect/Request"));
var RequestResolver = _interopRequireWildcard(require("effect/RequestResolver"));
var Runtime = _interopRequireWildcard(require("effect/Runtime"));
var Scope = _interopRequireWildcard(require("effect/Scope"));
var Persistence = _interopRequireWildcard(require("./Persistence.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category combinators
 */
const dataLoader = exports.dataLoader = /*#__PURE__*/(0, _Function.dual)(2, /*#__PURE__*/Effect.fnUntraced(function* (self, options) {
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
const persisted = exports.persisted = /*#__PURE__*/(0, _Function.dual)(2, (self, options) => Effect.gen(function* () {
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
    const completeUncached = (0, _Function.pipe)(Effect.forEach(remaining, request => Effect.exit(Effect.request(request, self)), {
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