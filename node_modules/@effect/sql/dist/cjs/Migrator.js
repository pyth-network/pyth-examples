"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.make = exports.fromRecord = exports.fromGlob = exports.fromBabelGlob = exports.MigrationError = void 0;
var Arr = _interopRequireWildcard(require("effect/Array"));
var Data = _interopRequireWildcard(require("effect/Data"));
var Effect = _interopRequireWildcard(require("effect/Effect"));
var _Function = require("effect/Function");
var Option = _interopRequireWildcard(require("effect/Option"));
var Order = _interopRequireWildcard(require("effect/Order"));
var Client = _interopRequireWildcard(require("./SqlClient.js"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * @since 1.0.0
 */

/**
 * @category errors
 * @since 1.0.0
 */
class MigrationError extends /*#__PURE__*/Data.TaggedError("MigrationError") {}
/**
 * @category constructor
 * @since 1.0.0
 */
exports.MigrationError = MigrationError;
const make = ({
  dumpSchema = () => Effect.void
}) => ({
  loader,
  schemaDirectory,
  table = "effect_sql_migrations"
}) => Effect.gen(function* () {
  const sql = yield* Client.SqlClient;
  const ensureMigrationsTable = sql.onDialectOrElse({
    mssql: () => sql`IF OBJECT_ID(N'${sql.literal(table)}', N'U') IS NULL
  CREATE TABLE ${sql(table)} (
    migration_id INT NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
  )`,
    mysql: () => sql`CREATE TABLE IF NOT EXISTS ${sql(table)} (
  migration_id INTEGER UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(255) NOT NULL,
  PRIMARY KEY (migration_id)
)`,
    pg: () => Effect.catchAll(sql`select ${table}::regclass`, () => sql`CREATE TABLE ${sql(table)} (
  migration_id integer primary key,
  created_at timestamp with time zone not null default now(),
  name text not null
)`),
    orElse: () => sql`CREATE TABLE IF NOT EXISTS ${sql(table)} (
  migration_id integer PRIMARY KEY NOT NULL,
  created_at datetime NOT NULL DEFAULT current_timestamp,
  name VARCHAR(255) NOT NULL
)`
  });
  const insertMigrations = rows => sql`INSERT INTO ${sql(table)} ${sql.insert(rows.map(([migration_id, name]) => ({
    migration_id,
    name
  })))}`.withoutTransform;
  const latestMigration = Effect.map(sql`SELECT migration_id, name, created_at FROM ${sql(table)} ORDER BY migration_id DESC`.withoutTransform, _ => Option.map(Option.fromNullable(_[0]), ({
    created_at,
    migration_id,
    name
  }) => ({
    id: migration_id,
    name,
    createdAt: created_at
  })));
  const loadMigration = ([id, name, load]) => Effect.catchAllDefect(load, _ => Effect.fail(new MigrationError({
    reason: "import-error",
    message: `Could not import migration "${id}_${name}"\n\n${_}`
  }))).pipe(Effect.flatMap(_ => Effect.isEffect(_) ? Effect.succeed(_) : _.default ? Effect.succeed(_.default?.default ?? _.default) : Effect.fail(new MigrationError({
    reason: "import-error",
    message: `Default export not found for migration "${id}_${name}"`
  }))), Effect.filterOrFail(_ => Effect.isEffect(_), () => new MigrationError({
    reason: "import-error",
    message: `Default export was not an Effect for migration "${id}_${name}"`
  })));
  const runMigration = (id, name, effect) => Effect.orDieWith(effect, error => new MigrationError({
    cause: error,
    reason: "failed",
    message: `Migration "${id}_${name}" failed`
  }));
  // === run
  const run = Effect.gen(function* () {
    yield* sql.onDialectOrElse({
      pg: () => sql`LOCK TABLE ${sql(table)} IN ACCESS EXCLUSIVE MODE`,
      orElse: () => Effect.void
    });
    const [latestMigrationId, current] = yield* Effect.all([Effect.map(latestMigration, Option.match({
      onNone: () => 0,
      onSome: _ => _.id
    })), loader]);
    if (new Set(current.map(([id]) => id)).size !== current.length) {
      return yield* new MigrationError({
        reason: "duplicates",
        message: "Found duplicate migration id's"
      });
    }
    const required = [];
    for (const resolved of current) {
      const [currentId, currentName] = resolved;
      if (currentId <= latestMigrationId) {
        continue;
      }
      required.push([currentId, currentName, yield* loadMigration(resolved)]);
    }
    if (required.length > 0) {
      yield* (0, _Function.pipe)(insertMigrations(required.map(([id, name]) => [id, name])), Effect.mapError(_ => new MigrationError({
        reason: "locked",
        message: "Migrations already running"
      })));
    }
    yield* Effect.forEach(required, ([id, name, effect]) => Effect.logDebug(`Running migration`).pipe(Effect.zipRight(runMigration(id, name, effect)), Effect.annotateLogs("migration_id", String(id)), Effect.annotateLogs("migration_name", name)), {
      discard: true
    });
    yield* (0, _Function.pipe)(latestMigration, Effect.flatMap(Option.match({
      onNone: () => Effect.logDebug(`Migrations complete`),
      onSome: _ => Effect.logDebug(`Migrations complete`).pipe(Effect.annotateLogs("latest_migration_id", _.id.toString()), Effect.annotateLogs("latest_migration_name", _.name))
    })));
    return required.map(([id, name]) => [id, name]);
  });
  yield* ensureMigrationsTable;
  const completed = yield* (0, _Function.pipe)(sql.withTransaction(run), Effect.catchTag("MigrationError", _ => _.reason === "locked" ? Effect.as(Effect.logDebug(_.message), []) : Effect.fail(_)));
  if (schemaDirectory && completed.length > 0) {
    yield* (0, _Function.pipe)(dumpSchema(`${schemaDirectory}/_schema.sql`, table), Effect.catchAllCause(cause => Effect.logInfo("Could not dump schema", cause)));
  }
  return completed;
});
exports.make = make;
const migrationOrder = /*#__PURE__*/Order.make(([a], [b]) => Order.number(a, b));
/**
 * @since 1.0.0
 * @category loaders
 */
const fromGlob = migrations => (0, _Function.pipe)(Object.keys(migrations), Arr.filterMap(_ => Option.fromNullable(_.match(/^(?:.*\/)?(\d+)_([^.]+)\.(js|ts)$/))), Arr.map(([key, id, name]) => [Number(id), name, Effect.promise(() => migrations[key]())]), Arr.sort(migrationOrder), Effect.succeed);
/**
 * @since 1.0.0
 * @category loaders
 */
exports.fromGlob = fromGlob;
const fromBabelGlob = migrations => (0, _Function.pipe)(Object.keys(migrations), Arr.filterMap(_ => Option.fromNullable(_.match(/^_(\d+)_([^.]+?)(Js|Ts)?$/))), Arr.map(([key, id, name]) => [Number(id), name, Effect.succeed(migrations[key])]), Arr.sort(migrationOrder), Effect.succeed);
/**
 * @since 1.0.0
 * @category loaders
 */
exports.fromBabelGlob = fromBabelGlob;
const fromRecord = migrations => (0, _Function.pipe)(Object.keys(migrations), Arr.filterMap(_ => Option.fromNullable(_.match(/^(\d+)_(.+)$/))), Arr.map(([key, id, name]) => [Number(id), name, Effect.succeed(migrations[key])]), Arr.sort(migrationOrder), Effect.succeed);
exports.fromRecord = fromRecord;
//# sourceMappingURL=Migrator.js.map