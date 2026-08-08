"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeStorage = exports.layerStorageSubtle = exports.layerStorage = void 0;
var _EventJournal = require("@effect/experimental/EventJournal");
var _EventLogEncryption = require("@effect/experimental/EventLogEncryption");
var EventLogServer = _interopRequireWildcard(require("@effect/experimental/EventLogServer"));
var Chunk = _interopRequireWildcard(require("effect/Chunk"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Layer = _interopRequireWildcard(require("effect/Layer"));
var Mailbox = _interopRequireWildcard(require("effect/Mailbox"));
var PubSub = _interopRequireWildcard(require("effect/PubSub"));
var RcMap = _interopRequireWildcard(require("effect/RcMap"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var SqlClient = _interopRequireWildcard(require("./SqlClient.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 * @category constructors
 */
const makeStorage = options => Effect.gen(function* () {
  const encryptions = yield* _EventLogEncryption.EventLogEncryption;
  const sql = yield* SqlClient.SqlClient;
  const tablePrefix = options?.entryTablePrefix ?? "effect_events";
  const remoteIdTable = options?.remoteIdTable ?? "effect_remote_id";
  const insertBatchSize = options?.insertBatchSize ?? 200;
  yield* sql.onDialectOrElse({
    pg: () => sql`CREATE TABLE IF NOT EXISTS ${sql(remoteIdTable)} (
            remote_id BYTEA PRIMARY KEY
          )`.withoutTransform,
    mysql: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(remoteIdTable)} (
            remote_id BINARY(16) PRIMARY KEY
          )`.withoutTransform,
    mssql: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(remoteIdTable)} (
            remote_id VARBINARY(16) PRIMARY KEY
          )`.withoutTransform,
    orElse: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(remoteIdTable)} (
            remote_id BLOB PRIMARY KEY
          )`.withoutTransform
  });
  const remoteId = yield* sql`SELECT remote_id FROM ${sql(remoteIdTable)}`.pipe(Effect.flatMap(results => {
    if (results.length > 0) {
      return Effect.succeed(_EventJournal.RemoteId.make(results[0].remote_id));
    }
    const newRemoteId = (0, _EventJournal.makeRemoteId)();
    return Effect.as(sql`INSERT INTO ${sql(remoteIdTable)} (remote_id) VALUES (${newRemoteId})`, _EventJournal.RemoteId.make(newRemoteId));
  }));
  const resources = yield* RcMap.make({
    lookup: publicKey => Effect.gen(function* () {
      const publicKeyHash = (yield* encryptions.sha256String(new TextEncoder().encode(publicKey))).slice(0, 16);
      const table = `${tablePrefix}_${publicKeyHash}`;
      yield* sql.onDialectOrElse({
        pg: () => sql`
                CREATE TABLE IF NOT EXISTS ${sql(table)} (
                  sequence SERIAL PRIMARY KEY,
                  iv BYTEA NOT NULL,
                  entry_id BYTEA UNIQUE NOT NULL,
                  encrypted_entry BYTEA NOT NULL
                )`.withoutTransform,
        mysql: () => sql`
                CREATE TABLE IF NOT EXISTS ${sql(table)} (
                  sequence INT AUTO_INCREMENT PRIMARY KEY,
                  iv BINARY(12) NOT NULL,
                  entry_id BINARY(16) UNIQUE NOT NULL,
                  encrypted_entry BLOB NOT NULL
                )`.withoutTransform,
        mssql: () => sql`
                CREATE TABLE IF NOT EXISTS ${sql(table)} (
                  sequence INT IDENTITY(1,1) PRIMARY KEY,
                  iv VARBINARY(12) NOT NULL,
                  entry_id VARBINARY(16) UNIQUE NOT NULL,
                  encrypted_entry VARBINARY(MAX) NOT NULL
                )`.withoutTransform,
        orElse: () => sql`
                CREATE TABLE IF NOT EXISTS ${sql(table)} (
                  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                  iv BLOB NOT NULL,
                  entry_id BLOB UNIQUE NOT NULL,
                  encrypted_entry BLOB NOT NULL
                )`.withoutTransform
      });
      const pubsub = yield* Effect.acquireRelease(PubSub.unbounded(), PubSub.shutdown);
      return {
        pubsub,
        table
      };
    }),
    idleTimeToLive: "5 minutes"
  });
  return EventLogServer.Storage.of({
    getId: Effect.succeed(remoteId),
    write: (publicKey, entries) => Effect.gen(function* () {
      if (entries.length === 0) return [];
      const {
        pubsub,
        table
      } = yield* RcMap.get(resources, publicKey);
      const forInsert = [{
        ids: [],
        entries: []
      }];
      let currentBatch = forInsert[0];
      for (const entry of entries) {
        currentBatch.ids.push(entry.entryId);
        currentBatch.entries.push({
          iv: entry.iv,
          entry_id: entry.entryId,
          encrypted_entry: entry.encryptedEntry
        });
        if (currentBatch.entries.length === insertBatchSize) {
          currentBatch = {
            ids: [],
            entries: []
          };
          forInsert.push(currentBatch);
        }
      }
      const allEntries = [];
      for (const batch of forInsert) {
        const encryptedEntries = yield* (0, _Function.pipe)(sql`INSERT INTO ${sql(table)} ${sql.insert(batch.entries)} ON CONFLICT DO NOTHING`.withoutTransform, Effect.zipRight(sql`SELECT * FROM ${sql(table)} WHERE ${sql.in("entry_id", batch.ids)} ORDER BY sequence ASC`), Effect.flatMap(decodeEntries));
        yield* pubsub.offerAll(encryptedEntries);
        // eslint-disable-next-line no-restricted-syntax
        allEntries.push(...encryptedEntries);
      }
      return allEntries;
    }).pipe(Effect.orDie, Effect.scoped),
    entries: (publicKey, startSequence) => Effect.gen(function* () {
      const {
        table
      } = yield* RcMap.get(resources, publicKey);
      return yield* sql`SELECT * FROM ${sql(table)} WHERE sequence >= ${startSequence} ORDER BY sequence ASC`.pipe(Effect.flatMap(decodeEntries));
    }).pipe(Effect.orDie, Effect.scoped),
    changes: (publicKey, startSequence) => Effect.gen(function* () {
      const {
        pubsub,
        table
      } = yield* RcMap.get(resources, publicKey);
      const mailbox = yield* Mailbox.make();
      const queue = yield* pubsub.subscribe;
      const initial = yield* sql`SELECT * FROM ${sql(table)} WHERE sequence >= ${startSequence} ORDER BY sequence ASC`.pipe(Effect.flatMap(decodeEntries));
      yield* mailbox.offerAll(initial);
      yield* queue.takeBetween(1, Number.MAX_SAFE_INTEGER).pipe(Effect.tap(chunk => mailbox.offerAll(Chunk.filter(chunk, _ => _.sequence >= startSequence))), Effect.forever, Effect.forkScoped, Effect.interruptible);
      return mailbox;
    }).pipe(Effect.orDie)
  });
});
exports.makeStorage = makeStorage;
const EncryptedRemoteEntrySql = /*#__PURE__*/Schema.Struct({
  sequence: Schema.Number,
  iv: Schema.Uint8ArrayFromSelf,
  entry_id: Schema.Uint8ArrayFromSelf,
  encrypted_entry: Schema.Uint8ArrayFromSelf
});
const EncryptedRemoteEntryFromSql = /*#__PURE__*/Schema.transform(EncryptedRemoteEntrySql, _EventLogEncryption.EncryptedRemoteEntry, {
  decode(fromA) {
    return {
      sequence: fromA.sequence,
      iv: fromA.iv,
      entryId: fromA.entry_id,
      encryptedEntry: fromA.encrypted_entry
    };
  },
  encode(toI) {
    return {
      sequence: toI.sequence,
      iv: toI.iv,
      entry_id: toI.entryId,
      encrypted_entry: toI.encryptedEntry
    };
  }
});
const decodeEntries = /*#__PURE__*/Schema.decodeUnknown(/*#__PURE__*/Schema.Array(EncryptedRemoteEntryFromSql));
/**
 * @since 1.0.0
 * @category layers
 */
const layerStorage = options => Layer.scoped(EventLogServer.Storage, makeStorage(options));
/**
 * @since 1.0.0
 * @category layers
 */
exports.layerStorage = layerStorage;
const layerStorageSubtle = options => layerStorage(options).pipe(Layer.provide(_EventLogEncryption.layerSubtle));
exports.layerStorageSubtle = layerStorageSubtle;
//# sourceMappingURL=SqlEventLogServer.js.map