import * as KeyValueStore from "@effect/platform/KeyValueStore";
import * as Chunk from "effect/Chunk";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FiberMap from "effect/FiberMap";
import * as FiberRef from "effect/FiberRef";
import { identity } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { pipeArguments } from "effect/Pipeable";
import * as Predicate from "effect/Predicate";
import * as Queue from "effect/Queue";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { Entry, EventJournal, makeEntryId } from "./EventJournal.js";
import * as Reactivity from "./Reactivity.js";
/**
 * @since 1.0.0
 * @category schema
 */
export const SchemaTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/EventLog/EventLogSchema");
/**
 * @since 1.0.0
 * @category schema
 */
export const isEventLogSchema = u => Predicate.hasProperty(u, SchemaTypeId);
/**
 * @since 1.0.0
 * @category schema
 */
export const schema = (...groups) => {
  function EventLog() {}
  EventLog[SchemaTypeId] = SchemaTypeId;
  EventLog.groups = groups;
  return EventLog;
};
/**
 * @since 1.0.0
 * @category handlers
 */
export const HandlersTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/EventLog/Handlers");
const handlersProto = {
  [HandlersTypeId]: {
    _Endpoints: identity
  },
  handle(tag, handler) {
    return makeHandlers({
      group: this.group,
      context: this.context,
      handlers: {
        ...this.handlers,
        [tag]: {
          event: this.group.events[tag],
          context: this.context,
          handler
        }
      }
    });
  },
  pipe() {
    return pipeArguments(this, arguments);
  }
};
const makeHandlers = options => Object.assign(Object.create(handlersProto), options);
/**
 * @since 1.0.0
 * @category handlers
 */
export const group = (group, f) => Effect.gen(function* () {
  const context = yield* Effect.context();
  const result = f(makeHandlers({
    group: group,
    handlers: {},
    context
  }));
  const handlers = Effect.isEffect(result) ? yield* result : result;
  const registry = yield* Registry;
  yield* registry.add(handlers);
}).pipe(Layer.scopedDiscard, Layer.provide(Registry.layer));
/**
 * @since 1.0.0
 * @category compaction
 */
export const groupCompaction = (group, effect) => Effect.gen(function* () {
  const log = yield* EventLog;
  const context = yield* Effect.context();
  yield* log.registerCompaction({
    events: Object.keys(group.events),
    effect: Effect.fnUntraced(function* ({
      entries,
      write
    }) {
      const writePayload = (timestamp, tag, payload) => Effect.gen(function* () {
        const event = group.events[tag];
        const entry = new Entry({
          id: makeEntryId({
            msecs: timestamp
          }),
          event: tag,
          payload: yield* Schema.encode(event.payloadMsgPack)(payload).pipe(Effect.locally(FiberRef.currentContext, context), Effect.orDie),
          primaryKey: event.primaryKey(payload)
        }, {
          disableValidation: true
        });
        yield* write(entry);
      });
      const byPrimaryKey = new Map();
      for (const entry of entries) {
        const payload = yield* Schema.decodeUnknown(group.events[entry.event].payloadMsgPack)(entry.payload).pipe(Effect.locally(FiberRef.currentContext, context));
        if (byPrimaryKey.has(entry.primaryKey)) {
          const record = byPrimaryKey.get(entry.primaryKey);
          record.entries.push(entry);
          record.taggedPayloads.push({
            _tag: entry.event,
            payload
          });
        } else {
          byPrimaryKey.set(entry.primaryKey, {
            entries: [entry],
            taggedPayloads: [{
              _tag: entry.event,
              payload
            }]
          });
        }
      }
      for (const [primaryKey, {
        entries,
        taggedPayloads
      }] of byPrimaryKey) {
        yield* effect({
          primaryKey,
          entries,
          events: taggedPayloads,
          write(tag, payload) {
            return writePayload(entries[0].createdAtMillis, tag, payload);
          }
        }).pipe(Effect.locally(FiberRef.currentContext, context));
      }
    })
  });
}).pipe(Layer.scopedDiscard, Layer.provide(layerEventLog));
/**
 * @since 1.0.0
 * @category reactivity
 */
export const groupReactivity = (group, keys) => Effect.gen(function* () {
  const log = yield* EventLog;
  if (!Array.isArray(keys)) {
    yield* log.registerReactivity(keys);
    return;
  }
  const obj = {};
  for (const tag in group.events) {
    obj[tag] = keys;
  }
  yield* log.registerReactivity(obj);
}).pipe(Layer.scopedDiscard, Layer.provide(layerEventLog));
/**
 * @since 1.0.0
 * @category layers
 */
export class Registry extends /*#__PURE__*/Context.Tag("@effect/experimental/EventLog/Registry")() {
  /**
   * @since 1.0.0
   */
  static layer = /*#__PURE__*/Layer.sync(Registry, () => {
    const items = {};
    return {
      add: handlers => Effect.sync(() => {
        for (const tag in handlers.handlers) {
          items[tag] = handlers.handlers[tag];
        }
      }),
      handlers: Effect.sync(() => items)
    };
  });
}
/**
 * @since 1.0.0
 * @category tags
 */
export class Identity extends /*#__PURE__*/Context.Tag("@effect/experimental/EventLog/Identity")() {
  /**
   * @since 1.0.0
   */
  static makeRandom() {
    return Identity.of({
      publicKey: crypto.randomUUID(),
      privateKey: Redacted.make(crypto.getRandomValues(new Uint8Array(32)))
    });
  }
  /**
   * @since 1.0.0
   */
  static Schema = /*#__PURE__*/Schema.Struct({
    publicKey: Schema.String,
    privateKey: /*#__PURE__*/Schema.Redacted(Schema.Uint8ArrayFromBase64)
  });
  /**
   * @since 1.0.0
   */
  static SchemaFromString = /*#__PURE__*/Schema.StringFromBase64Url.pipe(/*#__PURE__*/Schema.compose(/*#__PURE__*/Schema.parseJson(this.Schema)));
  /**
   * @since 1.0.0
   */
  static decodeString = s => Schema.decodeSync(Identity.SchemaFromString)(s);
  /**
   * @since 1.0.0
   */
  static encodeString = identity => Schema.encodeSync(Identity.SchemaFromString)(identity);
}
/**
 * Generates a random `Identity` and stores it in a `KeyValueStore`.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerIdentityKvs = options => Layer.effect(Identity, Effect.gen(function* () {
  const store = (yield* KeyValueStore.KeyValueStore).forSchema(Identity.Schema);
  const current = yield* store.get(options.key);
  if (Option.isSome(current)) {
    return current.value;
  }
  const identity = Identity.makeRandom();
  yield* store.set(options.key, identity);
  return identity;
}));
/**
 * @since 1.0.0
 * @category tags
 */
export class EventLog extends /*#__PURE__*/Context.Tag("@effect/experimental/EventLog/EventLog")() {}
const make = /*#__PURE__*/Effect.gen(function* () {
  const identity = yield* Identity;
  const registry = yield* Registry;
  const journal = yield* EventJournal;
  const handlers = yield* registry.handlers;
  const remotes = yield* FiberMap.make();
  const compactors = new Map();
  const journalSemaphore = yield* Effect.makeSemaphore(1);
  const reactivity = yield* Reactivity.Reactivity;
  const reactivityKeys = {};
  const runRemote = Effect.fnUntraced(function* (remote) {
    const startSequence = yield* journal.nextRemoteSequence(remote.id);
    const changes = yield* remote.changes(identity, startSequence);
    yield* changes.takeAll.pipe(Effect.flatMap(([entries]) => journal.writeFromRemote({
      remoteId: remote.id,
      entries: Chunk.toReadonlyArray(entries),
      compact: compactors.size > 0 ? Effect.fnUntraced(function* (remoteEntries) {
        let unprocessed = remoteEntries;
        const brackets = [];
        let uncompacted = [];
        let uncompactedRemote = [];
        while (true) {
          let i = 0;
          for (; i < unprocessed.length; i++) {
            const remoteEntry = unprocessed[i];
            if (!compactors.has(remoteEntry.entry.event)) {
              uncompacted.push(remoteEntry.entry);
              uncompactedRemote.push(remoteEntry);
              continue;
            }
            if (uncompacted.length > 0) {
              brackets.push([uncompacted, uncompactedRemote]);
              uncompacted = [];
              uncompactedRemote = [];
            }
            const compactor = compactors.get(remoteEntry.entry.event);
            const entry = remoteEntry.entry;
            const entries = [entry];
            const remoteEntries = [remoteEntry];
            const compacted = [];
            const currentEntries = unprocessed;
            unprocessed = [];
            for (let j = i + 1; j < currentEntries.length; j++) {
              const nextRemoteEntry = currentEntries[j];
              if (!compactor.events.has(nextRemoteEntry.entry.event)) {
                unprocessed.push(nextRemoteEntry);
                continue;
              }
              entries.push(nextRemoteEntry.entry);
              remoteEntries.push(nextRemoteEntry);
            }
            yield* compactor.effect({
              entries,
              write(entry) {
                return Effect.sync(() => {
                  compacted.push(entry);
                });
              }
            });
            brackets.push([compacted, remoteEntries]);
            break;
          }
          if (i === unprocessed.length) {
            brackets.push([unprocessed.map(_ => _.entry), unprocessed]);
            break;
          }
        }
        return brackets;
      }) : undefined,
      effect: Effect.fnUntraced(function* ({
        conflicts,
        entry
      }) {
        const handler = handlers[entry.event];
        if (!handler) {
          return yield* Effect.logDebug(`Event handler not found for: "${entry.event}"`);
        }
        const decodePayload = Schema.decode(handlers[entry.event].event.payloadMsgPack);
        const decodedConflicts = new Array(conflicts.length);
        for (let i = 0; i < conflicts.length; i++) {
          decodedConflicts[i] = {
            entry: conflicts[i],
            payload: yield* decodePayload(conflicts[i].payload)
          };
        }
        yield* handler.handler({
          payload: yield* decodePayload(entry.payload),
          entry,
          conflicts: decodedConflicts
        });
        if (reactivityKeys[entry.event]) {
          for (const key of reactivityKeys[entry.event]) {
            reactivity.unsafeInvalidate({
              [key]: [entry.primaryKey]
            });
          }
        }
      }, Effect.catchAllCause(Effect.log), (effect, {
        entry
      }) => Effect.annotateLogs(effect, {
        service: "EventLog",
        effect: "writeFromRemote",
        entryId: entry.idString
      }))
    }).pipe(journalSemaphore.withPermits(1))), Effect.catchAllCause(Effect.log), Effect.forever, Effect.annotateLogs({
      service: "EventLog",
      effect: "runRemote consume"
    }), Effect.fork);
    const write = journal.withRemoteUncommited(remote.id, entries => remote.write(identity, entries));
    yield* Effect.addFinalizer(() => Effect.ignore(write));
    yield* write;
    return yield* Queue.takeBetween(yield* journal.changes, 1, Number.MAX_SAFE_INTEGER).pipe(Effect.zipRight(Effect.sleep(500)), Effect.zipRight(write), Effect.catchAllCause(Effect.log), Effect.forever);
  }, Effect.scoped, Effect.provideService(Identity, identity), Effect.interruptible);
  const writeHandler = Effect.fnUntraced(function* (handler, options) {
    const payload = yield* Effect.orDie(Schema.encode(handlers[options.event].event.payloadMsgPack)(options.payload));
    return yield* journalSemaphore.withPermits(1)(journal.write({
      event: options.event,
      primaryKey: handler.event.primaryKey(options.payload),
      payload,
      effect: entry => Effect.tap(handler.handler({
        payload: options.payload,
        entry,
        conflicts: []
      }), () => {
        if (reactivityKeys[entry.event]) {
          for (const key of reactivityKeys[entry.event]) {
            reactivity.unsafeInvalidate({
              [key]: [entry.primaryKey]
            });
          }
        }
      })
    }));
  }, (effect, handler) => Effect.mapInputContext(effect, context => Context.merge(handler.context, context)));
  return EventLog.of({
    write: options => {
      const handler = handlers[options.event];
      if (handler === undefined) {
        return Effect.die(`Event handler not found for: "${options.event}"`);
      }
      return writeHandler(handler, options);
    },
    entries: journal.entries,
    registerRemote: remote => Effect.acquireRelease(FiberMap.run(remotes, remote.id, runRemote(remote)), () => FiberMap.remove(remotes, remote.id)),
    registerCompaction: options => Effect.acquireRelease(Effect.sync(() => {
      const events = new Set(options.events);
      const compactor = {
        events,
        effect: options.effect
      };
      for (const event of options.events) {
        compactors.set(event, compactor);
      }
    }), () => Effect.sync(() => {
      for (const event of options.events) {
        compactors.delete(event);
      }
    })),
    registerReactivity: keys => Effect.sync(() => {
      Object.assign(reactivityKeys, keys);
    }),
    destroy: journal.destroy
  });
});
/**
 * @since 1.0.0
 * @category layers
 */
export const layerEventLog = /*#__PURE__*/Layer.scoped(EventLog, make).pipe(/*#__PURE__*/Layer.provide([Registry.layer, Reactivity.layer]));
/**
 * @since 1.0.0
 * @category layers
 */
export const layer = _schema => layerEventLog;
/**
 * @since 1.0.0
 * @category client
 */
export const makeClient = schema => Effect.gen(function* () {
  const log = yield* EventLog;
  return (event, payload) => log.write({
    schema,
    event,
    payload
  });
});
//# sourceMappingURL=EventLog.js.map