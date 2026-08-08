import {
  Data,
  type LucidEvolution,
  type SpendingValidator,
  type TxSignBuilder,
} from "@lucid-evolution/lucid";
import { getScriptAddress } from "../validator.js";
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
export async function buildLockTx(
  lucid: LucidEvolution,
  config: Config,
  params: LockParams,
): Promise<TxSignBuilder> {
  const scriptAddress = getScriptAddress(params.validator, config.network);

  const tx = await lucid
    .newTx()
    .pay.ToContract(
      scriptAddress,
      { kind: "inline", value: Data.void() },
      { lovelace: params.lovelaceAmount },
    )
    .complete();

  return tx;
}

/**
 * Builds, signs, and submits a lock transaction.
 * Returns the transaction hash.
 */
export async function lock(
  lucid: LucidEvolution,
  config: Config,
  params: LockParams,
): Promise<string> {
  const tx = await buildLockTx(lucid, config, params);
  const signed = await tx.sign.withWallet().complete();
  try {
    const txHash = await signed.submit();
    return txHash;
  } catch (submitError) {
    const message = submitError instanceof Error ? submitError.message : String(submitError);
    // Some providers return submit validation errors even when the exact same tx
    // was already accepted (e.g. "All inputs are spent...already been included").
    if (
      message.includes("All inputs are spent") &&
      message.includes("already been included")
    ) {
      return signed.toHash();
    }
    throw submitError;
  }
}
