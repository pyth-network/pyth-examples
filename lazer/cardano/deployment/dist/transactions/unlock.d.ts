import { type LucidEvolution, type SpendingValidator, type TxSignBuilder, type UTxO } from "@lucid-evolution/lucid";
import type { Config } from "../config.js";
export interface UnlockParams {
    /** The parameterized spending validator */
    validator: SpendingValidator;
    /** The UTxO at the script address to spend (if known). If not provided, will be looked up. */
    scriptUtxo?: UTxO;
}
/**
 * Builds a transaction that unlocks funds from the script using Pyth oracle price.
 * The Pyth oracle verifies the ADA/USD price, and the validator ensures the correct
 * amount of ADA goes to the user.
 *
 * The transaction includes:
 * - Spending the script UTxO with the Unlock redeemer
 * - A reference input for the Pyth State UTxO
 * - A zero-withdrawal from the Pyth withdraw script (for price verification)
 * - A validity range (required by Pyth for trusted signer checks)
 */
export declare function buildUnlockTx(lucid: LucidEvolution, config: Config, params: UnlockParams): Promise<TxSignBuilder>;
/**
 * Builds, signs, and submits an unlock transaction.
 * Returns the transaction hash.
 */
export declare function unlock(lucid: LucidEvolution, config: Config, params: UnlockParams): Promise<string>;
