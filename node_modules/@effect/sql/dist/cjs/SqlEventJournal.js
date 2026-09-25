"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.layer = void 0;
var EventJournal = _interopRequireWildcard(require("@effect/experimental/EventJournal"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var Layer = _interopRequireWildcard(require("effect/Layer"));
var PubSub = _interopRequireWildcard(require("effect/PubSub"));
var Schema = _interopRequireWildcard(require("effect/Schema"));
var Uuid = _interopRequireWildcard(require("uuid"));
var SqlClient = _interopRequireWildcard(require("./SqlClient.js"));
var SqlSchema = _interopRequireWildcard(require("./SqlSchema.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category constructors
 */
const make = options => Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const entryTable = options?.entryTable ?? "effect_event_journal";
  const remotesTable = options?.remotesTable ?? "effect_event_remotes";
  yield* sql.onDialectOrElse({
    pg: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(entryTable)} (
            id UUID PRIMARY KEY,
            event TEXT NOT NULL,
            primary_key TEXT NOT NULL,
            payload BYTEA NOT NULL,
            timestamp BIGINT NOT NULL
          )`.withoutTransform,
    mysql: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(entryTable)} (
            id BINARY(16) PRIMARY KEY,
            event TEXT NOT NULL,
            primary_key TEXT NOT NULL,
            payload BLOB NOT NULL,
            timestamp BIGINT NOT NULL
          )`.withoutTransform,
    mssql: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(entryTable)} (
            id UNIQUEIDENTIFIER PRIMARY KEY,
            event NVARCHAR(MAX) NOT NULL,
            primary_key NVARCHAR(MAX) NOT NULL,
            payload VARBINARY(MAX) NOT NULL,
            timestamp BIGINT NOT NULL
          )`.withoutTransform,
    orElse: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(entryTable)} (
            id BLOB PRIMARY KEY,
            event TEXT NOT NULL,
            primary_key TEXT NOT NULL,
            payload BLOB NOT NULL,
            timestamp BIGINT NOT NULL
          )`.withoutTransform
  });
  yield* sql.onDialectOrElse({
    pg: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(remotesTable)} (
            remote_id UUID NOT NULL,
            entry_id UUID NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`.withoutTransform,
    mysql: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(remotesTable)} (
            remote_id BINARY(16) NOT NULL,
            entry_id BINARY(16) NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`.withoutTransform,
    mssql: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(remotesTable)} (
            remote_id UNIQUEIDENTIFIER NOT NULL,
            entry_id UNIQUEIDENTIFIER NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`.withoutTransform,
    orElse: () => sql`
          CREATE TABLE IF NOT EXISTS ${sql(remotesTable)} (
            remote_id BLOB NOT NULL,
            entry_id BLOB NOT NULL,
            sequence INT NOT NULL,
            PRIMARY KEY (remote_id, entry_id)
          )`.withoutTransform
  });
  const EntrySqlEncoded = sql.onDialectOrElse({
    pg: () => EntrySqlPg,
    mysql: () => EntrySqlPg,
    mssql: () => EntrySqlPg,
    orElse: () => EntrySqlSqlite
  });
  const EntrySql = Schema.transform(EntrySqlEncoded, EventJournal.Entry, {
    decode(fromA) {
      return {
        id: fromA.id,
        event: fromA.event,
        primaryKey: fromA.primary_key,
        payload: fromA.payload
      };
    },
    encode(toI) {
      return {
        id: toI.id,
        event: toI.event,
        primary_key: toI.primaryKey,
        payload: toI.payload,
        timestamp: new Date(EventJournal.entryIdMillis(toI.id))
      };
    }
  });
  const EntrySqlArray = Schema.Array(EntrySql);
  const decodeEntrySqlArray = Schema.decodeUnknown(EntrySqlArray);
  const insertEntry = SqlSchema.void({
    Request: EntrySql,
    execute: entry => sql`INSERT INTO ${sql(entryTable)} ${sql.insert(entry)} ON CONFLICT DO NOTHING`.withoutTransform
  });
  const insertEntries = SqlSchema.void({
    Request: Schema.Array(EntrySql),
    execute: entry => sql`INSERT INTO ${sql(entryTable)} ${sql.insert(entry)} ON CONFLICT DO NOTHING`.withoutTransform
  });
  const insertRemotes = SqlSchema.void({
    Request: Schema.Array(RemoteSql),
    execute: entry => sql`INSERT INTO ${sql(remotesTable)} ${sql.insert(entry)} ON CONFLICT DO NOTHING`.withoutTransform
  });
  const pubsub = yield* PubSub.unbounded();
  return EventJournal.EventJournal.of({
    entries: sql`SELECT * FROM ${sql(entryTable)} ORDER BY timestamp ASC`.withoutTransform.pipe(Effect.flatMap(decodeEntrySqlArray), Effect.mapError(cause => new EventJournal.EventJournalError({
      cause,
      method: "entries"
    }))),
    write({
      effect,
      event,
      payload,
      primaryKey
    }) {
      return Effect.gen(function* () {
        const entry = new EventJournal.Entry({
          id: EventJournal.makeEntryId(),
          event,
          primaryKey,
          payload
        }, {
          disableValidation: true
        });
        yield* insertEntry(entry);
        const value = yield* effect(entry);
        yield* pubsub.publish(entry);
        return value;
      }).pipe(sql.withTransaction, Effect.mapError(cause => new EventJournal.EventJournalError({
        cause,
        method: "write"
      })));
    },
    writeFromRemote: options => Effect.gen(function* () {
      const entries = [];
      const remotes = [];
      for (const remoteEntry of options.entries) {
        entries.push(remoteEntry.entry);
        remotes.push({
          remote_id: options.remoteId,
          entry_id: remoteEntry.entry.id,
          sequence: remoteEntry.remoteSequence
        });
      }
      const existingIds = new Set();
      yield* sql`SELECT id FROM ${sql(entryTable)} WHERE ${sql.in("id", entries.map(e => e.id))}`.pipe(Effect.tap(rows => {
        for (const row of rows) {
          existingIds.add(Uuid.stringify(row.id));
        }
      }));
      yield* insertEntries(entries);
      yield* insertRemotes(remotes);
      const uncommited = options.entries.filter(e => !existingIds.has(e.entry.idString));
      const brackets = options.compact ? yield* options.compact(uncommited) : [[uncommited.map(_ => _.entry), uncommited]];
      for (const [compacted] of brackets) {
        for (let i = 0; i < compacted.length; i++) {
          const entry = compacted[i];
          const conflicts = yield* sql`
                SELECT *
                FROM ${sql(entryTable)}
                WHERE event = ${entry.event} AND
                      primary_key = ${entry.primaryKey} AND
                      timestamp >= ${entry.createdAtMillis}
                ORDER BY timestamp ASC
              `.pipe(Effect.flatMap(decodeEntrySqlArray));
          yield* options.effect({
            entry,
            conflicts
          });
        }
      }
    }).pipe(sql.withTransaction, Effect.mapError(cause => new EventJournal.EventJournalError({
      cause,
      method: "write"
    }))),
    withRemoteUncommited: (remoteId, f) => Effect.gen(function* () {
      const entries = yield* sql`
            SELECT *
            FROM ${sql(entryTable)}
            WHERE id NOT IN (SELECT entry_id FROM ${sql(remotesTable)} WHERE remote_id = ${remoteId})
            ORDER BY timestamp ASC
          `.pipe(Effect.flatMap(decodeEntrySqlArray));
      return yield* f(entries);
    }).pipe(sql.withTransaction, Effect.mapError(cause => new EventJournal.EventJournalError({
      cause,
      method: "withRemoteUncommited"
    }))),
    nextRemoteSequence: remoteId => sql`SELECT MAX(sequence) AS max FROM ${sql(remotesTable)} WHERE remote_id = ${remoteId}`.pipe(Effect.map(rows => Number(rows[0].max) + 1), Effect.mapError(cause => new EventJournal.EventJournalError({
      cause,
      method: "nextRemoteSequence"
    }))),
    changes: PubSub.subscribe(pubsub),
    destroy: Effect.gen(function* () {
      yield* sql`DROP TABLE ${sql(entryTable)}`.withoutTransform;
      yield* sql`DROP TABLE ${sql(remotesTable)}`.withoutTransform;
    }).pipe(Effect.mapError(cause => new EventJournal.EventJournalError({
      cause,
      method: "destory"
    })))
  });
});
/**
 * @since 1.0.0
 * @category layers
 */
exports.make = make;
const layer = options => Layer.effect(EventJournal.EventJournal, make(options));
exports.layer = layer;
const EntrySqlPg = /*#__PURE__*/Schema.Struct({
  id: Schema.Uint8ArrayFromSelf,
  event: Schema.String,
  primary_key: Schema.String,
  payload: Schema.Uint8ArrayFromSelf,
  timestamp: Schema.DateFromSelf
});
const EntrySqlSqlite = /*#__PURE__*/Schema.Struct({
  id: Schema.Uint8ArrayFromSelf,
  event: Schema.String,
  primary_key: Schema.String,
  payload: Schema.Uint8ArrayFromSelf,
  timestamp: Schema.DateFromNumber
});
const RemoteSql = /*#__PURE__*/Schema.Struct({
  remote_id: EventJournal.RemoteId,
  entry_id: EventJournal.EntryId,
  sequence: Schema.Number
});
//# sourceMappingURL=SqlEventJournal.js.map