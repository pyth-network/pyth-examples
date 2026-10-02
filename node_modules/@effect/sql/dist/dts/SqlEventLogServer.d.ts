import { EventLogEncryption } from "@effect/experimental/EventLogEncryption";
import * as EventLogServer from "@effect/experimental/EventLogServer";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { Scope } from "effect/Scope";
import * as SqlClient from "./SqlClient.js";
import type { SqlError } from "./SqlError.js";
/**
 * @since 1.0.0
 * @category constructors
 */
export declare const makeStorage: (options?: {
    readonly entryTablePrefix?: string;
    readonly remoteIdTable?: string;
    readonly insertBatchSize?: number;
}) => Effect.Effect<typeof EventLogServer.Storage.Service, SqlError, SqlClient.SqlClient | EventLogEncryption | Scope>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerStorage: (options?: {
    readonly entryTablePrefix?: string;
    readonly remoteIdTable?: string;
    readonly insertBatchSize?: number;
}) => Layer.Layer<EventLogServer.Storage, SqlError, SqlClient.SqlClient | EventLogEncryption>;
/**
 * @since 1.0.0
 * @category layers
 */
export declare const layerStorageSubtle: (options?: {
    readonly entryTablePrefix?: string;
    readonly remoteIdTable?: string;
    readonly insertBatchSize?: number;
}) => Layer.Layer<EventLogServer.Storage, SqlError, SqlClient.SqlClient>;
//# sourceMappingURL=SqlEventLogServer.d.ts.map