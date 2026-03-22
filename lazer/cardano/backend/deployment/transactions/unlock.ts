import {
  Constr,
  Data,
  type LucidEvolution,
  type SpendingValidator,
  type TxSignBuilder,
  type UTxO,
} from "@lucid-evolution/lucid";
import { getScriptAddress } from "../validator.js";
import {
  buildWithdrawRedeemer,
  fetchPriceUpdate,
  getPythContext,
} from "../pyth.js";
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
export async function buildUnlockTx(
  lucid: LucidEvolution,
  config: Config,
  params: UnlockParams,
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

  // Get Pyth on-chain state
  const pythCtx = await getPythContext(
    lucid,
    config.pythPolicyId,
    config.network,
  );

  // Fetch latest price update from Pyth Lazer
  const priceUpdateHex = await fetchPriceUpdate(config.pythLazerToken);
  const withdrawRedeemer = buildWithdrawRedeemer(priceUpdateHex);

  // Unlock redeemer = Constr(0, []) i.e. the first variant of Action
  const unlockRedeemer = Data.to(new Constr(0, []));

  // Build transaction with tight validity range (required by Pyth)
  const now = BigInt(Date.now());
  const tx = await lucid
    .newTx()
    .collectFrom([scriptUtxo], unlockRedeemer)
    .attach.SpendingValidator(params.validator)
    .readFrom([pythCtx.stateUtxo])
    .withdraw(pythCtx.rewardAddress, 0n, withdrawRedeemer)
    .validFrom(Number(now - 60_000n))
    .validTo(Number(now + 60_000n))
    .addSigner(await lucid.wallet().address())
    .complete();

  return tx;
}

/**
 * Builds, signs, and submits an unlock transaction.
 * Returns the transaction hash.
 */
export async function unlock(
  lucid: LucidEvolution,
  config: Config,
  params: UnlockParams,
): Promise<string> {
  const tx = await buildUnlockTx(lucid, config, params);
  const signed = await tx.sign.withWallet().complete();
  const txHash = await signed.submit();
  return txHash;
}
