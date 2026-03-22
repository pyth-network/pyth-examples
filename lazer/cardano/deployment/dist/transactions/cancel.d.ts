import { type LucidEvolution, type SpendingValidator, type TxSignBuilder, type UTxO } from "@lucid-evolution/lucid";
import type { Config } from "../config.js";
export interface CancelParams {
    /** The parameterized spending validator */
    validator: SpendingValidator;
    /** The UTxO at the script address to spend (if known). If not provided, will be looked up. */
    scriptUtxo?: UTxO;
}
/**
 * Builds a transaction that cancels the payment agreement.
 * The sponsor reclaims all locked ADA. No Pyth oracle interaction needed.
 */
export declare function buildCancelTx(lucid: LucidEvolution, config: Config, params: CancelParams): Promise<TxSignBuilder>;
/**
 * Builds, signs, and submits a cancel transaction.
 * Returns the transaction hash.
 */
export declare function cancel(lucid: LucidEvolution, config: Config, params: CancelParams): Promise<string>;
