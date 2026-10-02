import * as Effect from "effect/Effect";
import * as Client from "./SqlClient.js";
import type { SqlError } from "./SqlError.js";
/**
 * @category model
 * @since 1.0.0
 */
export interface MigratorOptions<R = never> {
    readonly loader: Loader<R>;
    readonly schemaDirectory?: string;
    readonly table?: string;
}
/**
 * @category model
 * @since 1.0.0
 */
export type Loader<R = never> = Effect.Effect<ReadonlyArray<ResolvedMigration>, MigrationError, R>;
/**
 * @category model
 * @since 1.0.0
 */
export type ResolvedMigration = readonly [
    id: number,
    name: string,
    load: Effect.Effect<any, any, Client.SqlClient>
];
/**
 * @category model
 * @since 1.0.0
 */
export interface Migration {
    readonly id: number;
    readonly name: string;
    readonly createdAt: Date;
}
declare const MigrationError_base: new <A extends Record<string, any> = {}>(args: import("effect/Types").Equals<A, {}> extends true ? void : { readonly [P in keyof A as P extends "_tag" ? never : P]: A[P]; }) => import("effect/Cause").YieldableError & {
    readonly _tag: "MigrationError";
} & Readonly<A>;
/**
 * @category errors
 * @since 1.0.0
 */
export declare class MigrationError extends MigrationError_base<{
    readonly _tag: "MigrationError";
    readonly cause?: unknown;
    readonly reason: "bad-state" | "import-error" | "failed" | "duplicates" | "locked";
    readonly message: string;
}> {
}
/**
 * @category constructor
 * @since 1.0.0
 */
export declare const make: <RD = never>({ dumpSchema }: {
    dumpSchema?: (path: string, migrationsTable: string) => Effect.Effect<void, MigrationError, RD>;
}) => <R2 = never>({ loader, schemaDirectory, table }: MigratorOptions<R2>) => Effect.Effect<ReadonlyArray<readonly [id: number, name: string]>, MigrationError | SqlError, Client.SqlClient | RD | R2>;
/**
 * @since 1.0.0
 * @category loaders
 */
export declare const fromGlob: (migrations: Record<string, () => Promise<any>>) => Loader;
/**
 * @since 1.0.0
 * @category loaders
 */
export declare const fromBabelGlob: (migrations: Record<string, any>) => Loader;
/**
 * @since 1.0.0
 * @category loaders
 */
export declare const fromRecord: (migrations: Record<string, Effect.Effect<void, unknown, Client.SqlClient>>) => Loader;
export {};
//# sourceMappingURL=Migrator.d.ts.map