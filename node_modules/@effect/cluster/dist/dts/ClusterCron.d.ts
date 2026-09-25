import * as Cron from "effect/Cron";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { Scope } from "effect/Scope";
import type { Sharding } from "./Sharding.js";
/**
 * @since 1.0.0
 * @category Constructors
 */
export declare const make: <E, R>(options: {
    readonly name: string;
    readonly cron: Cron.Cron;
    readonly execute: Effect.Effect<void, E, R>;
    /**
     * Choose a shard group to run this cron job on.
     */
    readonly shardGroup?: string | undefined;
    /**
     * Whether to run the next cron job based from the time of the previous run.
     *
     * Defaults to `false`, meaning the next run will be calculated from the
     * current time.
     */
    readonly calculateNextRunFromPrevious?: boolean | undefined;
    /**
     * If set, the cron job will skip execution if the scheduled time is older
     * than this duration.
     *
     * This is useful to prevent running jobs that were scheduled too far in the
     * past.
     *
     * Defaults to "1 day".
     */
    readonly skipIfOlderThan?: Duration.DurationInput | undefined;
}) => Layer.Layer<never, never, Sharding | Exclude<R, Scope>>;
//# sourceMappingURL=ClusterCron.d.ts.map