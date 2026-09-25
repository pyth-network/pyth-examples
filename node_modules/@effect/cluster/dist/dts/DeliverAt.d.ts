/**
 * @since 1.0.0
 */
import type { DateTime } from "effect/DateTime";
/**
 * @since 1.0.0
 * @category symbols
 */
export declare const symbol: unique symbol;
/**
 * @since 1.0.0
 * @category models
 */
export interface DeliverAt {
    [symbol](): DateTime;
}
/**
 * @since 1.0.0
 * @category guards
 */
export declare const isDeliverAt: (self: unknown) => self is DeliverAt;
/**
 * @since 1.0.0
 * @category accessors
 */
export declare const toMillis: (self: unknown) => number | null;
//# sourceMappingURL=DeliverAt.d.ts.map