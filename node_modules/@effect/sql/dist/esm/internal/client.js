import * as Reactivity from "@effect/experimental/Reactivity";
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FiberRef from "effect/FiberRef";
import * as Mailbox from "effect/Mailbox";
import * as Option from "effect/Option";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as Tracer from "effect/Tracer";
import * as Statement from "../Statement.js";
/** @internal */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/sql/SqlClient");
/** @internal */
export const clientTag = /*#__PURE__*/Context.GenericTag("@effect/sql/SqlClient");
/** @internal */
export const TransactionConnection = /*#__PURE__*/Context.GenericTag("@effect/sql/SqlClient/TransactionConnection");
/** @internal */
export function make({
  acquirer,
  beginTransaction = "BEGIN",
  commit = "COMMIT",
  compiler,
  reactiveMailbox,
  rollback = "ROLLBACK",
  rollbackSavepoint = id => `ROLLBACK TO SAVEPOINT ${id}`,
  savepoint = id => `SAVEPOINT ${id}`,
  spanAttributes,
  transactionAcquirer,
  transformRows
}) {
  return Effect.gen(function* () {
    const getConnection = Effect.flatMap(Effect.serviceOption(TransactionConnection), Option.match({
      onNone: () => acquirer,
      onSome: ([conn]) => Effect.succeed(conn)
    }));
    transactionAcquirer = transactionAcquirer ?? acquirer;
    const withTransaction = makeWithTransaction({
      transactionTag: TransactionConnection,
      spanAttributes,
      acquireConnection: Effect.flatMap(Scope.make(), scope => Effect.map(Scope.extend(transactionAcquirer, scope), conn => [scope, conn])),
      begin: conn => conn.executeUnprepared(beginTransaction, [], undefined),
      savepoint: (conn, id) => conn.executeUnprepared(savepoint(`effect_sql_${id}`), [], undefined),
      commit: conn => conn.executeUnprepared(commit, [], undefined),
      rollback: conn => conn.executeUnprepared(rollback, [], undefined),
      rollbackSavepoint: (conn, id) => conn.executeUnprepared(rollbackSavepoint(`effect_sql_${id}`), [], undefined)
    });
    const reactivity = yield* Reactivity.Reactivity;
    const client = Object.assign(Statement.make(getConnection, compiler, spanAttributes, transformRows), {
      [TypeId]: TypeId,
      safe: undefined,
      withTransaction,
      reserve: transactionAcquirer,
      withoutTransforms() {
        if (transformRows === undefined) {
          return this;
        }
        const statement = Statement.make(getConnection, compiler.withoutTransform, spanAttributes, undefined);
        const client = Object.assign(statement, {
          ...this,
          ...statement
        });
        client.safe = client;
        client.withoutTransforms = () => client;
        return client;
      },
      reactive: reactiveMailbox ? (keys, effect) => reactiveMailbox(keys, effect).pipe(Effect.map(Mailbox.toStream), Stream.unwrapScoped) : reactivity.stream,
      reactiveMailbox: reactiveMailbox ?? reactivity.query
    });
    client.safe = client;
    return client;
  });
}
/** @internal */
export const makeWithTransaction = options => effect => Effect.uninterruptibleMask(restore => Effect.useSpan("sql.transaction", {
  kind: "client",
  captureStackTrace: false
}, span => Effect.withFiberRuntime(fiber => {
  for (const [key, value] of options.spanAttributes) {
    span.attribute(key, value);
  }
  const context = fiber.currentContext;
  const clock = Context.get(fiber.currentDefaultServices, Clock.Clock);
  const connOption = Context.getOption(context, options.transactionTag);
  const conn = connOption._tag === "Some" ? Effect.succeed([undefined, connOption.value[0]]) : options.acquireConnection;
  const id = connOption._tag === "Some" ? connOption.value[1] + 1 : 0;
  return Effect.flatMap(conn, ([scope, conn]) => (id === 0 ? options.begin(conn) : options.savepoint(conn, id)).pipe(Effect.zipRight(Effect.locally(restore(effect), FiberRef.currentContext, Context.add(context, options.transactionTag, [conn, id]).pipe(Context.add(Tracer.ParentSpan, span)))), Effect.exit, Effect.flatMap(exit => {
    let effect;
    if (Exit.isSuccess(exit)) {
      if (id === 0) {
        span.event("db.transaction.commit", clock.unsafeCurrentTimeNanos());
        effect = Effect.orDie(options.commit(conn));
      } else {
        span.event("db.transaction.savepoint", clock.unsafeCurrentTimeNanos());
        effect = Effect.void;
      }
    } else {
      span.event("db.transaction.rollback", clock.unsafeCurrentTimeNanos());
      effect = Effect.orDie(id > 0 ? options.rollbackSavepoint(conn, id) : options.rollback(conn));
    }
    const withScope = scope !== undefined ? Effect.ensuring(effect, Scope.close(scope, exit)) : effect;
    return Effect.zipRight(withScope, exit);
  })));
})));
//# sourceMappingURL=client.js.map