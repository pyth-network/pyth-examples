import { type LucidEvolution, type SpendingValidator, type TxSignBuilder } from "@lucid-evolution/lucid";
import type { Config } from "../config.js";
export interface LockParams {
    /** The parameterized spending validator */
    validator: SpendingValidator;
    /** Amount of lovelace to lock (should be ~2x the USD value in ADA) */
    lovelaceAmount: bigint;
}
/**
 * Builds a transaction that locks ADA at the script address.
 * The sponsor sends lovelace to the parameterized script address with a Void datum.
 */
export declare function buildLockTx(lucid: LucidEvolution, config: Config, params: LockParams): Promise<TxSignBuilder>;
/**
 * Builds, signs, and submits a lock transaction.
 * Returns the transaction hash.
 */
export declare function lock(lucid: LucidEvolution, config: Config, params: LockParams): Promise<string>;
