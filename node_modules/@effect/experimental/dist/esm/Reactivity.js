/**
 * @since 1.0.0
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberHandle from "effect/FiberHandle";
import { dual } from "effect/Function";
import * as Hash from "effect/Hash";
import * as Layer from "effect/Layer";
import * as Mailbox from "effect/Mailbox";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
/**
 * @since 1.0.0
 * @category tags
 */
export class Reactivity extends /*#__PURE__*/Context.Tag("@effect/experimental/Reactivity")() {}
/**
 * @since 1.0.0
 * @category constructors
 */
export const make = /*#__PURE__*/Effect.sync(() => {
  const handlers = new Map();
  const unsafeInvalidate = keys => {
    if (Array.isArray(keys)) {
      for (let i = 0; i < keys.length; i++) {
        const set = handlers.get(stringOrHash(keys[i]));
        if (set === undefined) continue;
        for (const run of set) run();
      }
    } else {
      const record = keys;
      for (const key in record) {
        const hashes = idHashes(key, record[key]);
        for (let i = 0; i < hashes.length; i++) {
          const set = handlers.get(hashes[i]);
          if (set === undefined) continue;
          for (const run of set) run();
        }
        const set = handlers.get(key);
        if (set !== undefined) {
          for (const run of set) run();
        }
      }
    }
  };
  const invalidate = keys => Effect.sync(() => unsafeInvalidate(keys));
  const mutation = (keys, effect) => Effect.zipLeft(effect, invalidate(keys));
  const unsafeRegister = (keys, handler) => {
    const resolvedKeys = Array.isArray(keys) ? keys.map(stringOrHash) : recordHashes(keys);
    for (let i = 0; i < resolvedKeys.length; i++) {
      let set = handlers.get(resolvedKeys[i]);
      if (set === undefined) {
        set = new Set();
        handlers.set(resolvedKeys[i], set);
      }
      set.add(handler);
    }
    return () => {
      for (let i = 0; i < resolvedKeys.length; i++) {
        const set = handlers.get(resolvedKeys[i]);
        set.delete(handler);
        if (set.size === 0) {
          handlers.delete(resolvedKeys[i]);
        }
      }
    };
  };
  const query = (keys, effect) => Effect.gen(function* () {
    const scope = yield* Effect.scope;
    const results = yield* Mailbox.make();
    const runFork = yield* FiberHandle.makeRuntime();
    let running = false;
    let pending = false;
    const handleExit = exit => {
      if (exit._tag === "Failure") {
        results.unsafeDone(Exit.failCause(exit.cause));
      } else {
        results.unsafeOffer(exit.value);
      }
      if (pending) {
        pending = false;
        runFork(effect).addObserver(handleExit);
      } else {
        running = false;
      }
    };
    function run() {
      if (running) {
        pending = true;
        return;
      }
      running = true;
      runFork(effect).addObserver(handleExit);
    }
    const cancel = unsafeRegister(keys, run);
    yield* Scope.addFinalizer(scope, Effect.sync(cancel));
    run();
    return results;
  });
  const stream = (tables, effect) => query(tables, effect).pipe(Effect.map(Mailbox.toStream), Stream.unwrapScoped);
  return Reactivity.of({
    mutation,
    query,
    stream,
    unsafeInvalidate,
    invalidate,
    unsafeRegister
  });
});
/**
 * @since 1.0.0
 * @category accessors
 */
export const mutation = /*#__PURE__*/dual(2, (effect, keys) => Effect.flatMap(Reactivity, r => r.mutation(keys, effect)));
/**
 * @since 1.0.0
 * @category accessors
 */
export const query = /*#__PURE__*/dual(2, (effect, keys) => Effect.flatMap(Reactivity, r => r.query(keys, effect)));
/**
 * @since 1.0.0
 * @category accessors
 */
export const stream = /*#__PURE__*/dual(2, (effect, keys) => Reactivity.pipe(Effect.flatMap(r => r.query(keys, effect)), Effect.map(Mailbox.toStream), Stream.unwrapScoped));
/**
 * @since 1.0.0
 * @category accessors
 */
export const invalidate = keys => Effect.flatMap(Reactivity, r => r.invalidate(keys));
/**
 * @since 1.0.0
 * @category layers
 */
export const layer = /*#__PURE__*/Layer.scoped(Reactivity, make);
function stringOrHash(u) {
  return typeof u === "string" ? u : Hash.hash(u);
}
const idHashes = (keyHash, ids) => {
  const hashes = new Array(ids.length);
  for (let i = 0; i < ids.length; i++) {
    hashes[i] = `${keyHash}:${stringOrHash(ids[i])}`;
  }
  return hashes;
};
const recordHashes = record => {
  const hashes = [];
  for (const key in record) {
    hashes.push(key);
    for (const idHash of idHashes(key, record[key])) {
      hashes.push(idHash);
    }
  }
  return hashes;
};
//# sourceMappingURL=Reactivity.js.map