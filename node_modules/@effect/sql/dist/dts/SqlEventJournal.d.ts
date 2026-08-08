/**
 * @since 1.0.0
 */
import * as EventJournal from "@effect/experimental/EventJournal";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "./SqlClient.js";
import type { SqlError } from "./SqlError.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const make: (options?: {
    readonly entryTable?: string;
    readonly remotesTable?: string;
}) => Effect.Effect<typeof EventJournal.EventJournal.Service, SqlError, SqlClient.SqlClient>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layer: (options?: {
    readonly eventLogTable?: string;
    readonly remotesTable?: string;
}) => Layer.Layer<EventJournal.EventJournal, SqlError, SqlClient.SqlClient>;
//# sourceMappingURL=SqlEventJournal.d.ts.map