"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeRemoteId = exports.makeMemory = exports.makeIndexedDb = exports.makeEntryId = exports.layerMemory = exports.layerIndexedDb = exports.entryIdMillis = exports.RemoteIdTypeId = exports.RemoteId = exports.RemoteEntry = exports.EventJournalError = exports.EventJournal = exports.ErrorTypeId = exports.EntryIdTypeId = exports.EntryId = exports.Entry = void 0;
var MsgPack = _interopRequireWildcard(require("@effect/platform/MsgPack"));
var Context = _interopRequireWildcard(require("effect/Context"));
var DateTime = _interopRequireWildcard(require("effect/DateTime"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var PubSub = _interopRequireWildcard(require("effect/PubSub"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Uuid = _interopRequireWildcard(require("uuid"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category tags
 */
class EventJournal extends /*#__PURE__*/Context.Tag("@effect/experimental/EventJournal")() {}
/**
 * @since 1.0.0
 * @category errors
 */
exports.EventJournal = EventJournal;
const ErrorTypeId = exports.ErrorTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/EventJournal/ErrorId");
/**
 * @since 1.0.0
 * @category errors
 */
class EventJournalError extends /*#__PURE__*/Schema.TaggedClass("@effect/experimental/EventJournal/Error")("EventJournalError", {
  method: Schema.String,
  cause: Schema.Defect
}) {
  /**
   * @since 1.0.0
   */
  [ErrorTypeId] = ErrorTypeId;
}
/**
 * @since 1.0.0
 * @category remote
 */
exports.EventJournalError = EventJournalError;
const RemoteIdTypeId = exports.RemoteIdTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/EventJournal/RemoteId");
/**
 * @since 1.0.0
 * @category remote
 */
const RemoteId = exports.RemoteId = /*#__PURE__*/Schema.Uint8ArrayFromSelf.pipe(/*#__PURE__*/Schema.brand(RemoteIdTypeId));
/**
 * @since 1.0.0
 * @category remote
 */
const makeRemoteId = () => Uuid.v4({}, new Uint8Array(16));
/**
 * @since 1.0.0
 * @category entry
 */
exports.makeRemoteId = makeRemoteId;
const EntryIdTypeId = exports.EntryIdTypeId = /*#__PURE__*/Symbol.for("@effect/experimental/EventJournal/EntryId");
/**
 * @since 1.0.0
 * @category entry
 */
const EntryId = exports.EntryId = /*#__PURE__*/Schema.Uint8ArrayFromSelf.pipe(/*#__PURE__*/Schema.brand(EntryIdTypeId));
/**
 * @since 1.0.0
 * @category entry
 */
const makeEntryId = (options = {}) => {
  return Uuid.v7(options, new Uint8Array(16));
};
/**
 * @since 1.0.0
 * @category entry
 */
exports.makeEntryId = makeEntryId;
const entryIdMillis = entryId => {
  const bytes = new Uint8Array(8);
  bytes.set(entryId.subarray(0, 6), 2);
  return Number(new DataView(bytes.buffer).getBigUint64(0));
};
/**
 * @since 1.0.0
 * @category entry
 */
exports.entryIdMillis = entryIdMillis;
class Entry extends /*#__PURE__*/Schema.Class("@effect/experimental/EventJournal/Entry")({
  id: EntryId,
  event: Schema.String,
  primaryKey: Schema.String,
  payload: Schema.Uint8ArrayFromSelf
}) {
  /**
   * @since 1.0.0
   */
  static arrayMsgPack = /*#__PURE__*/Schema.Array(/*#__PURE__*/MsgPack.schema(Entry));
  /**
   * @since 1.0.0
   */
  static encodeArray = /*#__PURE__*/Schema.encode(Entry.arrayMsgPack);
  /**
   * @since 1.0.0
   */
  static decodeArray = /*#__PURE__*/Schema.decode(Entry.arrayMsgPack);
  /**
   * @since 1.0.0
   */
  get idString() {
    return Uuid.stringify(this.id);
  }
  /**
   * @since 1.0.0
   */
  get createdAtMillis() {
    return entryIdMillis(this.id);
  }
  /**
   * @since 1.0.0
   */
  get createdAt() {
    return DateTime.unsafeMake(this.createdAtMillis);
  }
}
/**
 * @since 1.0.0
 * @category entry
 */
exports.Entry = Entry;
class RemoteEntry extends /*#__PURE__*/Schema.Class("@effect/experimental/EventJournal/RemoteEntry")({
  remoteSequence: Schema.Number,
  entry: Entry
}) {}
/**
 * @since 1.0.0
 * @category memory
 */
exports.RemoteEntry = RemoteEntry;
const makeMemory = exports.makeMemory = /*#__PURE__*/Effect.gen(function* () {
  const journal = [];
  const byId = new Map();
  const remotes = new Map();
  const pubsub = yield* PubSub.unbounded();
  const ensureRemote = remoteId => {
    const remoteIdString = Uuid.stringify(remoteId);
    let remote = remotes.get(remoteIdString);
    if (remote) return remote;
    remote = {
      sequence: 0,
      missing: journal.slice()
    };
    remotes.set(remoteIdString, remote);
    return remote;
  };
  return EventJournal.of({
    entries: Effect.sync(() => journal.slice()),
    write({
      effect,
      event,
      payload,
      primaryKey
    }) {
      return Effect.acquireUseRelease(Effect.sync(() => new Entry({
        id: makeEntryId(),
        event,
        primaryKey,
        payload
      }, {
        disableValidation: true
      })), effect, (entry, exit) => Effect.suspend(() => {
        if (exit._tag === "Failure" || byId.has(entry.idString)) return Effect.void;
        journal.push(entry);
        byId.set(entry.idString, entry);
        remotes.forEach(remote => {
          remote.missing.push(entry);
        });
        return pubsub.publish(entry);
      }));
    },
    writeFromRemote: options => Effect.gen(function* () {
      const remote = ensureRemote(options.remoteId);
      const uncommittedRemotes = [];
      const uncommitted = [];
      for (const remoteEntry of options.entries) {
        if (byId.has(remoteEntry.entry.idString)) {
          if (remoteEntry.remoteSequence > remote.sequence) {
            remote.sequence = remoteEntry.remoteSequence;
          }
          continue;
        }
        uncommittedRemotes.push(remoteEntry);
        uncommitted.push(remoteEntry.entry);
      }
      const brackets = options.compact ? yield* options.compact(uncommittedRemotes) : [[uncommitted, uncommittedRemotes]];
      for (const [compacted, remoteEntries] of brackets) {
        for (const originEntry of compacted) {
          const entryMillis = entryIdMillis(originEntry.id);
          const conflicts = [];
          for (let i = journal.length - 1; i >= -1; i--) {
            const entry = journal[i];
            if (entry !== undefined && entry.createdAtMillis > entryMillis) {
              continue;
            }
            for (let j = i + 2; j < journal.length; j++) {
              const entry = journal[j];
              if (entry.event === originEntry.event && entry.primaryKey === originEntry.primaryKey) {
                conflicts.push(entry);
              }
            }
            yield* options.effect({
              entry: originEntry,
              conflicts
            });
            break;
          }
        }
        for (let j = 0; j < remoteEntries.length; j++) {
          const remoteEntry = remoteEntries[j];
          journal.push(remoteEntry.entry);
          if (remoteEntry.remoteSequence > remote.sequence) {
            remote.sequence = remoteEntry.remoteSequence;
          }
        }
        journal.sort((a, b) => a.createdAtMillis - b.createdAtMillis);
      }
    }),
    withRemoteUncommited: (remoteId, f) => Effect.acquireUseRelease(Effect.sync(() => ensureRemote(remoteId).missing.slice()), f, (entries, exit) => Effect.sync(() => {
      if (exit._tag === "Failure") return;
      const last = entries[entries.length - 1];
      if (!last) return;
      const remote = ensureRemote(remoteId);
      for (let i = remote.missing.length - 1; i >= 0; i--) {
        if (remote.missing[i].id === last.id) {
          remote.missing = remote.missing.slice(i + 1);
          break;
        }
      }
    })),
    nextRemoteSequence: remoteId => Effect.sync(() => ensureRemote(remoteId).sequence),
    changes: PubSub.subscribe(pubsub),
    destroy: Effect.sync(() => {
      journal.length = 0;
      byId.clear();
      remotes.clear();
    })
  });
});
/**
 * @since 1.0.0
 * @category memory
 */
const layerMemory = exports.layerMemory = /*#__PURE__*/Layer.effect(EventJournal, makeMemory);
/**
 * @since 1.0.0
 * @category indexed db
 */
const makeIndexedDb = options => Effect.gen(function* () {
  const database = options?.database ?? "effect_event_journal";
  const openRequest = indexedDB.open(database, 1);
  openRequest.onupgradeneeded = () => {
    const db = openRequest.result;
    const entries = db.createObjectStore("entries", {
      keyPath: "id"
    });
    entries.createIndex("id", "id", {
      unique: true
    });
    entries.createIndex("event", "event");
    const remotes = db.createObjectStore("remotes", {
      keyPath: ["remoteId", "entryId"]
    });
    remotes.createIndex("id", ["remoteId", "entryId"], {
      unique: true
    });
    remotes.createIndex("sequence", ["remoteId", "sequence"], {
      unique: true
    });
    const remoteEntryId = db.createObjectStore("remoteEntryId", {
      keyPath: ["remoteId"]
    });
    remoteEntryId.createIndex("id", "remoteId", {
      unique: true
    });
  };
  const db = yield* Effect.acquireRelease(idbReq("open", () => openRequest), db => Effect.sync(() => db.close()));
  const pubsub = yield* PubSub.unbounded();
  return EventJournal.of({
    entries: idbReq("entries", () => db.transaction("entries", "readonly").objectStore("entries").index("id").getAll()).pipe(Effect.flatMap(_ => decodeEntryIdbArray(_).pipe(Effect.mapError(cause => new EventJournalError({
      method: "entries",
      cause
    }))))),
    write: ({
      effect,
      event,
      payload,
      primaryKey
    }) => Effect.uninterruptibleMask(restore => {
      const entry = new Entry({
        id: makeEntryId(),
        event,
        primaryKey,
        payload
      }, {
        disableValidation: true
      });
      return restore(effect(entry)).pipe(Effect.zipLeft(idbReq("write", () => db.transaction("entries", "readwrite").objectStore("entries").put(encodeEntryIdb(entry)))), Effect.zipLeft(pubsub.publish(entry)));
    }),
    writeFromRemote: options => Effect.gen(function* () {
      const uncommitted = [];
      const uncommittedRemotes = [];
      yield* Effect.async(resume => {
        const tx = db.transaction(["entries", "remotes"], "readwrite");
        const entries = tx.objectStore("entries");
        const remotes = tx.objectStore("remotes");
        const iterator = options.entries[Symbol.iterator]();
        const handleNext = state => {
          if (state.done) return;
          const remoteEntry = state.value;
          const entry = remoteEntry.entry;
          entries.get(entry.id).onsuccess = event => {
            if (event.target.result) {
              remotes.put({
                remoteId: options.remoteId,
                entryId: remoteEntry.entry.id,
                sequence: remoteEntry.remoteSequence
              });
              handleNext(iterator.next());
              return;
            }
            uncommitted.push(entry);
            uncommittedRemotes.push(remoteEntry);
            handleNext(iterator.next());
          };
        };
        handleNext(iterator.next());
        tx.oncomplete = () => resume(Effect.void);
        tx.onerror = () => resume(Effect.fail(new EventJournalError({
          method: "writeFromRemote",
          cause: tx.error
        })));
        return Effect.sync(() => tx.abort());
      });
      const brackets = options.compact ? yield* options.compact(uncommittedRemotes) : [[uncommitted, uncommittedRemotes]];
      for (const [compacted, remoteEntries] of brackets) {
        for (const originEntry of compacted) {
          const conflicts = [];
          yield* Effect.async(resume => {
            const tx = db.transaction("entries", "readonly");
            const entries = tx.objectStore("entries");
            const cursorRequest = entries.index("id").openCursor(IDBKeyRange.lowerBound(originEntry.id, true), "next");
            cursorRequest.onsuccess = () => {
              const cursor = cursorRequest.result;
              if (!cursor) return;
              const decodedEntry = decodeEntryIdb(cursor.value);
              if (decodedEntry.event === originEntry.event && decodedEntry.primaryKey === originEntry.primaryKey) {
                conflicts.push(decodedEntry);
              }
              cursor.continue();
            };
            tx.oncomplete = () => resume(Effect.void);
            tx.onerror = () => resume(Effect.fail(new EventJournalError({
              method: "writeFromRemote",
              cause: tx.error
            })));
            return Effect.sync(() => tx.abort());
          });
          yield* options.effect({
            entry: originEntry,
            conflicts
          });
        }
        yield* Effect.async(resume => {
          const tx = db.transaction(["entries", "remotes"], "readwrite");
          const entries = tx.objectStore("entries");
          const remotes = tx.objectStore("remotes");
          for (const remoteEntry of remoteEntries) {
            entries.add(encodeEntryIdb(remoteEntry.entry));
            remotes.put({
              remoteId: options.remoteId,
              entryId: remoteEntry.entry.id,
              sequence: remoteEntry.remoteSequence
            });
          }
          tx.oncomplete = () => resume(Effect.void);
          tx.onerror = () => resume(Effect.fail(new EventJournalError({
            method: "writeFromRemote",
            cause: tx.error
          })));
          return Effect.sync(() => tx.abort());
        });
      }
    }),
    withRemoteUncommited: (remoteId, f) => Effect.async(resume => {
      const entries = [];
      const tx = db.transaction(["entries", "remotes", "remoteEntryId"], "readwrite");
      const entriesStore = tx.objectStore("entries");
      const remotesStore = tx.objectStore("remotes");
      const remoteEntryIdStore = tx.objectStore("remoteEntryId");
      remoteEntryIdStore.get(remoteId).onsuccess = event => {
        const startEntryId = event.target.result?.entryId;
        const entryCursor = entriesStore.index("id").openCursor(startEntryId ? IDBKeyRange.lowerBound(startEntryId, true) : null, "next");
        entryCursor.onsuccess = () => {
          const cursor = entryCursor.result;
          if (!cursor) return;
          const entry = decodeEntryIdb(cursor.value);
          remotesStore.get([remoteId, entry.id]).onsuccess = event => {
            if (!event.target.result) entries.push(entry);
            cursor.continue();
          };
        };
      };
      tx.oncomplete = () => resume(Effect.succeed(entries));
      tx.onerror = () => resume(Effect.fail(new EventJournalError({
        method: "withRemoteUncommited",
        cause: tx.error
      })));
      return Effect.sync(() => tx.abort());
    }).pipe(Effect.flatMap(entries => {
      if (entries.length === 0) return f(entries);
      const entryId = entries[entries.length - 1].id;
      return Effect.uninterruptibleMask(restore => restore(f(entries)).pipe(Effect.zipLeft(idbReq("withRemoteUncommited", () => db.transaction("remoteEntryId", "readwrite").objectStore("remoteEntryId").put({
        remoteId,
        entryId
      })))));
    })),
    nextRemoteSequence: remoteId => Effect.async(resume => {
      const tx = db.transaction("remotes", "readonly");
      let sequence = 0;
      const cursorRequest = tx.objectStore("remotes").index("sequence").openCursor(IDBKeyRange.bound([remoteId, 0], [remoteId, Infinity]), "prev");
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        sequence = cursor.value.sequence + 1;
      };
      tx.oncomplete = () => resume(Effect.succeed(sequence));
      tx.onerror = () => resume(Effect.fail(new EventJournalError({
        method: "nextRemoteSequence",
        cause: tx.error
      })));
      return Effect.sync(() => tx.abort());
    }),
    changes: PubSub.subscribe(pubsub),
    destroy: Effect.sync(() => {
      indexedDB.deleteDatabase(database);
    })
  });
});
exports.makeIndexedDb = makeIndexedDb;
const decodeEntryIdb = /*#__PURE__*/Schema.decodeSync(Entry);
const encodeEntryIdb = /*#__PURE__*/Schema.encodeSync(Entry);
const EntryIdbArray = /*#__PURE__*/Schema.Array(Entry);
const decodeEntryIdbArray = /*#__PURE__*/Schema.decodeUnknown(EntryIdbArray);
/**
 * @since 1.0.0
 * @category indexed db
 */
const layerIndexedDb = options => Layer.scoped(EventJournal, makeIndexedDb(options));
exports.layerIndexedDb = layerIndexedDb;
const idbReq = (method, evaluate) => Effect.async(resume => {
  const request = evaluate();
  if (request.readyState === "done") {
    resume(Effect.succeed(request.result));
    return;
  }
  request.onsuccess = () => resume(Effect.succeed(request.result));
  request.onerror = () => resume(Effect.fail(new EventJournalError({
    method,
    cause: request.error
  })));
});
//# sourceMappingURL=EventJournal.js.map