import {
  Constr,
  Data,
  type LucidEvolution,
  type SpendingValidator,
  type TxSignBuilder,
  type UTxO,
} from "@lucid-evolution/lucid";
import { getScriptAddress } from "../validator.js";
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
export async function buildCancelTx(
  lucid: LucidEvolution,
  config: Config,
  params: CancelParams,
): Promise<TxSignBuilder> {
  const scriptAddress = getScriptAddress(params.validator, config.network);

  // Find the script UTxO to spend
  let scriptUtxo = params.scriptUtxo;
  if (!scriptUtxo) {
    const utxos = await lucid.utxosAt(scriptAddress);
    if (utxos.length === 0) {
      throw new Error("No UTxOs found at script address");
    }
    scriptUtxo = utxos[0];
  }

  // Cancel redeemer = Constr(1, []) i.e. the second variant of Action
  const cancelRedeemer = Data.to(new Constr(1, []));

  const tx = await lucid
    .newTx()
    .collectFrom([scriptUtxo], cancelRedeemer)
    .attach.SpendingValidator(params.validator)
    .addSigner(await lucid.wallet().address())
    .complete();

  return tx;
}

/**
 * Builds, signs, and submits a cancel transaction.
 * Returns the transaction hash.
 */
export async function cancel(
  lucid: LucidEvolution,
  config: Config,
  params: CancelParams,
): Promise<string> {
  const tx = await buildCancelTx(lucid, config, params);
  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();
  return txHash;
}
